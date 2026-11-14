"""Smoke-test the Gemini Vision path on ONE image. Run before trusting the live loop.

  python scripts/check_gemini.py scripts/demo_images/03_blocked_exit.jpg

Needs GEMINI_API_KEY (in .env or the environment).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from sentinel.config import api_key, load_config, load_dotenv  # noqa: E402
from sentinel.vision import GeminiVision  # noqa: E402


def main() -> None:
    load_dotenv()
    cfg = load_config(Path(__file__).resolve().parent.parent / "config.yaml")
    img = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("scripts/demo_images/03_blocked_exit.jpg")
    key = api_key(cfg.vision)
    if not key:
        print("No GEMINI_API_KEY. Put it in .env (see .env.example).")
        sys.exit(1)

    vision = GeminiVision(key, cfg.vision.model)
    fv = vision.analyse(img.read_bytes(), cfg.rules)
    if fv.error:
        print("ERROR:", fv.error)
        sys.exit(1)
    print("scene:", fv.scene)
    for r in cfg.rules:
        v = fv.by_rule(r.id)
        mark = "⚠ TRIGGERED" if v and v.triggered else "ok"
        print(f"  [{r.severity.label:5}] {r.id:8} {mark:12} conf={v.confidence if v else 0:.2f}  {v.reason if v else ''}")


if __name__ == "__main__":
    main()
