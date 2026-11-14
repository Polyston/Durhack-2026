"""Shared data types. Pure stdlib, no heavy imports, so every layer can use them."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional


class Severity(IntEnum):
    """How bad a rule is when it triggers. Also the three system states."""

    OK = 0
    WARN = 1
    ALARM = 2

    @property
    def label(self) -> str:
        return {0: "OK", 1: "WARN", 2: "ALARM"}[int(self)]

    @property
    def color(self) -> str:
        return {0: "#1e9e5a", 1: "#d98a00", 2: "#d83a2b"}[int(self)]

    @classmethod
    def parse(cls, text: str) -> "Severity":
        key = str(text).strip().upper()
        if key in ("ALARM", "CRITICAL", "DANGER", "STOP"):
            return cls.ALARM
        if key in ("WARN", "WARNING", "CAUTION"):
            return cls.WARN
        return cls.OK


@dataclass(frozen=True)
class Rule:
    """A thing to watch for, written in plain English."""

    id: str
    description: str
    severity: Severity = Severity.WARN

    def __post_init__(self) -> None:
        if not self.id or not self.description:
            raise ValueError("A rule needs an id and a description")


@dataclass
class RuleVerdict:
    """What the vision model said about one rule for one frame."""

    rule_id: str
    triggered: bool
    confidence: float = 0.0
    reason: str = ""


@dataclass
class FrameVerdict:
    """The vision model's answer for a whole frame."""

    verdicts: list[RuleVerdict] = field(default_factory=list)
    scene: str = ""  # one-line description of what the camera sees
    error: Optional[str] = None  # set if the vision call failed

    def by_rule(self, rule_id: str) -> Optional[RuleVerdict]:
        for v in self.verdicts:
            if v.rule_id == rule_id:
                return v
        return None


@dataclass
class ActiveAlert:
    """A rule that is currently firing, after debouncing."""

    rule: Rule
    reason: str
    since: float  # unix seconds


@dataclass
class Decision:
    """The decision layer's output for one cycle."""

    state: Severity
    active: list[ActiveAlert] = field(default_factory=list)
    changed: bool = False  # did the overall state change this cycle?
    scene: str = ""
