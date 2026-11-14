"""The loop: Sense -> Analyse -> Decide -> Act. Plus a CLI."""

from __future__ import annotations

import argparse
import threading
import time
from pathlib import Path

from .actuator import make_actuator
from .camera import make_camera
from .config import AppConfig, api_key, load_config, load_dotenv
from .decide import Decider
from .eventlog import EventLog
from .types import Decision, Severity
from .vision import make_vision


class Runner:
    """Holds the live pipeline and a thread-safe snapshot for the dashboard."""

    def __init__(self, cfg: AppConfig):
        self.cfg = cfg
        self.camera = make_camera(cfg.camera)
        self.vision = make_vision(cfg.vision, cfg.rules, api_key(cfg.vision))
        self.decider = Decider(cfg.rules, cfg.decide)
        self.actuator = make_actuator(cfg.actuator)
        self.log = EventLog(cfg.log_path)
        self._lock = threading.Lock()
        self._jpeg: bytes = b""
        self._decision = Decision(state=Severity.OK)
        self._cycles = 0
        self.running = False

    def tick(self) -> Decision:
        now = time.time()
        try:
            jpeg = self.camera.read_jpeg()
        except Exception as e:  # camera hiccup: hold state, don't crash
            print(f"   [camera] {e}")
            with self._lock:
                return self._decision
        frame = self.vision.analyse(jpeg, self.cfg.rules)
        decision = self.decider.update(frame, now)
        self.actuator.apply(decision.state)
        if frame.error:
            print(f"   [vision] {frame.error}")
        if decision.changed:
            self.log.record_transition(decision)
        with self._lock:
            self._jpeg = jpeg
            self._decision = decision
            self._cycles += 1
        return decision

    def snapshot(self) -> tuple[bytes, Decision, int]:
        with self._lock:
            return self._jpeg, self._decision, self._cycles

    def run(self) -> None:
        self.running = True
        banner(self.cfg)
        try:
            while self.running:
                start = time.time()
                d = self.tick()
                line = f"{time.strftime('%H:%M:%S')}  {d.state.label:5}"
                if d.scene:
                    line += f"  | {d.scene}"
                if d.active:
                    line += "  | " + "; ".join(f"{a.rule.id}: {a.reason or a.rule.description}" for a in d.active)
                print(line)
                time.sleep(max(0, self.cfg.interval - (time.time() - start)))
        except KeyboardInterrupt:
            print("\nStopping.")
        finally:
            self.close()

    def close(self) -> None:
        self.running = False
        self.camera.close()
        self.actuator.apply(Severity.OK)
        self.actuator.close()


def banner(cfg: AppConfig) -> None:
    print(f"\n{cfg.name}  ·  sense → analyse → decide → act")
    print(f"camera={cfg.camera.source}  vision={cfg.vision.backend}  actuator={cfg.actuator.kind}  every {cfg.interval}s")
    print("watching:")
    for r in cfg.rules:
        print(f"  [{r.severity.label:5}] {r.description}")
    print("-" * 60)


DEFAULT_CONFIG = Path(__file__).resolve().parent.parent.parent / "config.yaml"


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Sentinel: a plain-English safety camera.")
    p.add_argument("--config", default=str(DEFAULT_CONFIG))
    p.add_argument("--source", choices=["webcam", "picamera", "image", "demo"], help="override camera source")
    p.add_argument("--image", help="image path (with --source image)")
    p.add_argument("--vision", choices=["gemini", "mock"], help="override vision backend")
    p.add_argument("--actuator", choices=["serial", "gpio", "mock"], help="override actuator")
    p.add_argument("--interval", type=float, help="seconds between frames")
    p.add_argument("--web", action="store_true", help="also serve the dashboard")
    p.add_argument("--port", type=int, help="dashboard port")
    p.add_argument("--once", action="store_true", help="run a single cycle and exit")
    args = p.parse_args(argv)

    load_dotenv()
    cfg = load_config(args.config)
    if args.source:
        cfg.camera.source = args.source
    if args.image:
        cfg.camera.source, cfg.camera.image_path = "image", args.image
    if args.vision:
        cfg.vision.backend = args.vision
    if args.actuator:
        cfg.actuator.kind = args.actuator
    if args.interval:
        cfg.interval = args.interval
    if args.port:
        cfg.web_port = args.port

    runner = Runner(cfg)
    if args.once:
        banner(cfg)
        d = runner.tick()
        print(f"result: {d.state.label}" + (f" — {d.scene}" if d.scene else ""))
        for a in d.active:
            print(f"  {a.rule.id} [{a.rule.severity.label}]: {a.reason}")
        runner.close()
        return

    if args.web:
        from .web import start_web

        start_web(runner, cfg.web_port)
    runner.run()


if __name__ == "__main__":
    main()
