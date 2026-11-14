"""Generate placeholder demo frames so `--source demo` works with no camera.

Replace these with real photos of your workbench for a convincing Gemini test.
Run: python scripts/make_demo_images.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent / "demo_images"
OUT.mkdir(exist_ok=True)

SCENES = [
    ("01_clear.jpg", (26, 40, 24), "CLEAR WORKBENCH", "tidy bench, walkway open"),
    ("02_no_glasses.jpg", (60, 48, 16), "NO SAFETY GLASSES", "person working, bare eyes"),
    ("03_blocked_exit.jpg", (70, 24, 18), "BLOCKED FIRE EXIT", "boxes stacked across the exit"),
    ("04_spill.jpg", (20, 36, 52), "FLOOR SPILL", "puddle near the bench"),
]

for name, bg, title, sub in SCENES:
    img = Image.new("RGB", (1024, 768), bg)
    d = ImageDraw.Draw(img)
    for x in range(0, 1024, 64):
        d.line([(x, 0), (x, 768)], fill=(255, 255, 255, 20), width=1)
    d.rectangle([40, 40, 984, 728], outline=(230, 235, 225), width=3)
    d.text((70, 330), title, fill=(240, 244, 236))
    d.text((70, 380), sub, fill=(170, 180, 165))
    img.save(OUT / name, quality=85)
    print("wrote", OUT / name)
