"""A durable event log (JSON Lines) plus an in-memory ring for the dashboard."""

from __future__ import annotations

import json
import time
from collections import deque
from pathlib import Path

from .types import Decision


class EventLog:
    def __init__(self, path: str | Path, keep: int = 200):
        self.path = Path(path)
        self.recent: deque[dict] = deque(maxlen=keep)

    def record_transition(self, decision: Decision) -> dict:
        entry = {
            "ts": time.time(),
            "time": time.strftime("%H:%M:%S"),
            "state": decision.state.label,
            "scene": decision.scene,
            "alerts": [
                {"id": a.rule.id, "severity": a.rule.severity.label, "watch": a.rule.description, "reason": a.reason}
                for a in decision.active
            ],
        }
        self.recent.appendleft(entry)
        try:
            with self.path.open("a") as f:
                f.write(json.dumps(entry) + "\n")
        except OSError:
            pass  # logging must never crash the safety loop
        return entry
