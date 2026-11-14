"""Analyse: ask Gemini Vision whether each rule is broken in this frame.

The rules are plain English, so the whole system is reprogrammed by editing text
in config.yaml. No model training, no labelled data. That is the thing classic
computer vision cannot do, and the reason an LLM belongs here.
"""

from __future__ import annotations

import json
import re

from .types import FrameVerdict, Rule, RuleVerdict

PROMPT = """You are a workplace-safety camera. You are given ONE photo and a list of rules.
For EACH rule, decide if the photo shows that rule being broken RIGHT NOW.
Only report a rule as triggered if you can actually see the evidence. If unsure, set a low confidence.

Rules:
{rules}

Reply with ONLY a JSON object, no prose, in exactly this shape:
{{
  "scene": "<one short sentence describing the photo>",
  "results": [
    {{"id": "<rule id>", "triggered": true/false, "confidence": 0.0-1.0, "reason": "<short, what you saw>"}}
  ]
}}
Include every rule id exactly once."""


def build_prompt(rules: list[Rule]) -> str:
    listed = "\n".join(f'- id "{r.id}" [{r.severity.label}]: {r.description}' for r in rules)
    return PROMPT.format(rules=listed)


def parse_response(text: str, rules: list[Rule]) -> FrameVerdict:
    """Tolerant JSON parse: models sometimes wrap JSON in prose or code fences."""
    raw = text.strip()
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return FrameVerdict(error=f"No JSON in model reply: {raw[:120]}")
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        return FrameVerdict(error=f"Bad JSON from model: {e}")

    index = {r.id: r for r in rules}
    verdicts: list[RuleVerdict] = []
    for item in data.get("results", []):
        rid = str(item.get("id", ""))
        if rid not in index:
            continue
        verdicts.append(
            RuleVerdict(
                rule_id=rid,
                triggered=bool(item.get("triggered", False)),
                confidence=_clamp(item.get("confidence", 0.0)),
                reason=str(item.get("reason", "")).strip(),
            )
        )
    # any rule the model forgot = not triggered
    seen = {v.rule_id for v in verdicts}
    for r in rules:
        if r.id not in seen:
            verdicts.append(RuleVerdict(rule_id=r.id, triggered=False))
    return FrameVerdict(verdicts=verdicts, scene=str(data.get("scene", "")).strip())


def _clamp(x) -> float:
    try:
        return max(0.0, min(1.0, float(x)))
    except (TypeError, ValueError):
        return 0.0


class VisionBackend:
    def analyse(self, jpeg: bytes, rules: list[Rule]) -> FrameVerdict:
        raise NotImplementedError


class GeminiVision(VisionBackend):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        if not api_key:
            raise ValueError("No Gemini API key. Set GEMINI_API_KEY or use --vision mock.")
        import google.generativeai as genai  # lazy

        genai.configure(api_key=api_key)
        self._genai = genai
        self.model = genai.GenerativeModel(model)

    def analyse(self, jpeg: bytes, rules: list[Rule]) -> FrameVerdict:
        try:
            resp = self.model.generate_content(
                [build_prompt(rules), {"mime_type": "image/jpeg", "data": jpeg}],
                generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
            )
            return parse_response(resp.text, rules)
        except Exception as e:  # network, quota, safety block, etc.
            return FrameVerdict(error=f"Gemini call failed: {e}")


class MockVision(VisionBackend):
    """Deterministic fake, so the pipeline runs with no API key.

    Cycles a scripted pattern: all-clear, then one WARN, then an ALARM, then clear.
    Lets you see the LEDs/log change without hardware or a key.
    """

    def __init__(self, rules: list[Rule], script: list[set[str]] | None = None):
        self.rules = rules
        warn = next((r.id for r in rules if r.severity.label == "WARN"), rules[0].id if rules else "")
        alarm = next((r.id for r in rules if r.severity.label == "ALARM"), warn)
        self.script = script or [set(), set(), {warn}, {warn}, {alarm}, {alarm}, {alarm}, set()]
        self.i = 0

    def analyse(self, jpeg: bytes, rules: list[Rule]) -> FrameVerdict:
        firing = self.script[self.i % len(self.script)]
        self.i += 1
        verdicts = [
            RuleVerdict(
                rule_id=r.id,
                triggered=r.id in firing,
                confidence=0.9 if r.id in firing else 0.02,
                reason="mock: rule shown as broken" if r.id in firing else "",
            )
            for r in rules
        ]
        scene = "mock frame: hazard present" if firing else "mock frame: area looks clear"
        return FrameVerdict(verdicts=verdicts, scene=scene)


def make_vision(cfg, rules: list[Rule], api_key: str) -> VisionBackend:
    if cfg.backend == "mock":
        return MockVision(rules)
    if cfg.backend == "gemini":
        return GeminiVision(api_key, cfg.model)
    raise ValueError(f"Unknown vision backend: {cfg.backend}")
