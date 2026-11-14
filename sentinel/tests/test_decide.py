"""Decision-layer tests. No camera, no network, no hardware."""

from sentinel.decide import DecideConfig, Decider
from sentinel.types import FrameVerdict, Rule, RuleVerdict, Severity


def rules():
    return [
        Rule("glasses", "no safety glasses", Severity.WARN),
        Rule("exit", "blocked fire exit", Severity.ALARM),
    ]


def frame(fire: dict[str, float]):
    """fire maps rule_id -> confidence (present = triggered)."""
    return FrameVerdict(verdicts=[RuleVerdict(rid, rid in fire, fire.get(rid, 0.0), "") for rid in ("glasses", "exit")])


def test_needs_a_streak_before_firing():
    d = Decider(rules(), DecideConfig(trigger_streak=2, min_confidence=0.5))
    assert d.update(frame({"glasses": 0.9}), now=0).state == Severity.OK  # 1 frame: not yet
    assert d.update(frame({"glasses": 0.9}), now=1).state == Severity.WARN  # 2 frames: fires


def test_low_confidence_ignored():
    d = Decider(rules(), DecideConfig(trigger_streak=1, min_confidence=0.6))
    assert d.update(frame({"glasses": 0.3}), now=0).state == Severity.OK


def test_alarm_outranks_warn():
    d = Decider(rules(), DecideConfig(trigger_streak=1))
    dec = d.update(frame({"glasses": 0.9, "exit": 0.9}), now=0)
    assert dec.state == Severity.ALARM
    assert [a.rule.id for a in dec.active][0] == "exit"  # highest severity first


def test_clears_only_after_cooldown():
    d = Decider(rules(), DecideConfig(trigger_streak=1, clear_after=3.0))
    assert d.update(frame({"glasses": 0.9}), now=0).state == Severity.WARN
    assert d.update(frame({}), now=1).state == Severity.WARN  # 1s quiet: still held
    assert d.update(frame({}), now=5).state == Severity.OK  # 5s quiet: cleared


def test_vision_error_holds_last_state():
    d = Decider(rules(), DecideConfig(trigger_streak=1))
    d.update(frame({"exit": 0.9}), now=0)
    dec = d.update(FrameVerdict(error="network down"), now=1)
    assert dec.state == Severity.ALARM  # an outage must not drop a live alarm
    assert dec.changed is False


def test_changed_flag_only_on_transition():
    d = Decider(rules(), DecideConfig(trigger_streak=1))
    assert d.update(frame({"glasses": 0.9}), now=0).changed is True
    assert d.update(frame({"glasses": 0.9}), now=1).changed is False
