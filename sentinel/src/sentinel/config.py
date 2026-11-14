"""Load config.yaml (rules, camera, actuator, timing) into typed objects."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from .decide import DecideConfig
from .types import Rule, Severity


@dataclass
class CameraConfig:
    source: str = "webcam"  # webcam | picamera | image | demo
    index: int = 0  # webcam index
    image_path: str = ""  # for source=image
    width: int = 1024
    height: int = 768
    rotate: int = 0  # 0/90/180/270


@dataclass
class ActuatorConfig:
    kind: str = "mock"  # mock | serial (Arduino UNO Q / any Arduino) | gpio (Raspberry Pi)
    # serial backend (Arduino UNO Q and USB Arduinos):
    serial_port: str = "/dev/ttyACM0"  # UNO Q MCU bridge, or the Arduino's USB port
    serial_baud: int = 115200
    # gpio backend (Raspberry Pi, BCM pins):
    led_ok: int = 17
    led_warn: int = 27
    led_alarm: int = 22
    buzzer: int = 23
    servo: int = -1  # -1 = none; sweeps on alarm (e.g. a barrier arm)


@dataclass
class VisionConfig:
    backend: str = "gemini"  # gemini | mock
    model: str = "gemini-2.0-flash"
    api_key_env: str = "GEMINI_API_KEY"


@dataclass
class AppConfig:
    name: str = "Sentinel"
    interval: float = 2.0  # seconds between frames
    rules: list[Rule] = field(default_factory=list)
    camera: CameraConfig = field(default_factory=CameraConfig)
    actuator: ActuatorConfig = field(default_factory=ActuatorConfig)
    vision: VisionConfig = field(default_factory=VisionConfig)
    decide: DecideConfig = field(default_factory=DecideConfig)
    web_port: int = 8000
    log_path: str = "events.jsonl"


def _rules_from(raw: list) -> list[Rule]:
    rules: list[Rule] = []
    for i, item in enumerate(raw or []):
        if isinstance(item, str):
            rules.append(Rule(id=f"r{i+1}", description=item, severity=Severity.WARN))
        else:
            rules.append(
                Rule(
                    id=str(item.get("id", f"r{i+1}")),
                    description=str(item["watch"] if "watch" in item else item["description"]),
                    severity=Severity.parse(item.get("severity", "warn")),
                )
            )
    return rules


def load_config(path: str | Path) -> AppConfig:
    import yaml  # required to run the app; tests don't need it

    data = yaml.safe_load(Path(path).read_text()) or {}
    cam = data.get("camera", {}) or {}
    act = data.get("actuator", {}) or {}
    vis = data.get("vision", {}) or {}
    dec = data.get("decide", {}) or {}

    return AppConfig(
        name=data.get("name", "Sentinel"),
        interval=float(data.get("interval", 2.0)),
        rules=_rules_from(data.get("rules", [])),
        camera=CameraConfig(**{k: cam[k] for k in cam if k in CameraConfig.__annotations__}),
        actuator=ActuatorConfig(**{k: act[k] for k in act if k in ActuatorConfig.__annotations__}),
        vision=VisionConfig(**{k: vis[k] for k in vis if k in VisionConfig.__annotations__}),
        decide=DecideConfig(**{k: dec[k] for k in dec if k in DecideConfig.__annotations__}),
        web_port=int(data.get("web_port", 8000)),
        log_path=data.get("log_path", "events.jsonl"),
    )


def load_dotenv(path: str | Path = ".env") -> None:
    """Minimal .env loader (no dependency). Does not overwrite real env vars."""
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def api_key(cfg: VisionConfig) -> str:
    return os.environ.get(cfg.api_key_env, "")
