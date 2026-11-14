"""The decision layer. Pure Python, no I/O, fully unit-tested.

Turns a stream of per-frame vision verdicts into a stable system state.

Why debounce: a vision model flickers (one blurry frame says "no hard hat").
Acting on every frame would make the alarm chatter. So a rule must trigger on
several frames before it escalates, and must stay quiet for a cooldown before it
clears. This is the same idea as a sensor needing a steady reading.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .types import ActiveAlert, Decision, FrameVerdict, Rule, Severity


@dataclass
class DecideConfig:
    min_confidence: float = 0.55  # ignore weak guesses
    trigger_streak: int = 2  # consecutive triggering frames before a rule fires
    clear_after: float = 3.0  # seconds a rule must stay quiet before it clears


@dataclass
class _RuleState:
    streak: int = 0  # consecutive frames triggered right now
    active: bool = False
    reason: str = ""
    since: float = 0.0
    last_triggered_at: float = 0.0


class Decider:
    """Feed it frame verdicts; it tells you the current state and what's active."""

    def __init__(self, rules: list[Rule], config: DecideConfig | None = None):
        self.rules = {r.id: r for r in rules}
        self.cfg = config or DecideConfig()
        self._state: dict[str, _RuleState] = {r.id: _RuleState() for r in rules}
        self._system = Severity.OK

    def update(self, frame: FrameVerdict, now: float) -> Decision:
        # A failed vision call must not clear a real alarm: hold the last state.
        if frame.error is not None:
            return Decision(state=self._system, active=self._active_alerts(), changed=False, scene=frame.scene)

        for rule_id, rule in self.rules.items():
            st = self._state[rule_id]
            v = frame.by_rule(rule_id)
            hit = bool(v and v.triggered and v.confidence >= self.cfg.min_confidence)

            if hit:
                st.streak += 1
                st.last_triggered_at = now
                if st.streak >= self.cfg.trigger_streak and not st.active:
                    st.active = True
                    st.since = now
                if st.active:
                    st.reason = (v.reason if v else "") or rule.description
            else:
                st.streak = 0
                if st.active and (now - st.last_triggered_at) >= self.cfg.clear_after:
                    st.active = False
                    st.reason = ""

        active = self._active_alerts()
        new_system = max((a.rule.severity for a in active), default=Severity.OK)
        changed = new_system != self._system
        self._system = new_system
        return Decision(state=new_system, active=active, changed=changed, scene=frame.scene)

    def _active_alerts(self) -> list[ActiveAlert]:
        out: list[ActiveAlert] = []
        for rule_id, st in self._state.items():
            if st.active:
                out.append(ActiveAlert(rule=self.rules[rule_id], reason=st.reason, since=st.since))
        out.sort(key=lambda a: (-int(a.rule.severity), a.since))
        return out

    @property
    def state(self) -> Severity:
        return self._system
