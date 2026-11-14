"""Sense: grab a JPEG frame from whatever camera is available.

Backends (all return JPEG bytes so the rest of the system is camera-agnostic):
  - picamera : Raspberry Pi Camera Module (picamera2)
  - webcam   : any USB webcam (OpenCV)
  - image    : one fixed image file, re-read each cycle (demo / a mocked "feed")
  - demo     : cycles through bundled demo images, so the pipeline runs with nothing

Heavy imports (cv2, picamera2) are lazy, so `demo`/`image` work on a bare laptop.
"""

from __future__ import annotations

import io
from pathlib import Path

DEMO_DIR = Path(__file__).resolve().parent.parent.parent / "scripts" / "demo_images"


class Camera:
    def read_jpeg(self) -> bytes:
        raise NotImplementedError

    def close(self) -> None:
        pass


class ImageCamera(Camera):
    """Always returns the same image file. Good for wiring up Gemini before hardware."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        if not self.path.exists():
            raise FileNotFoundError(f"Image not found: {self.path}")

    def read_jpeg(self) -> bytes:
        return self.path.read_bytes()


class DemoCamera(Camera):
    """Cycles through demo_images/. Lets the whole loop run with no camera at all."""

    def __init__(self, folder: str | Path = DEMO_DIR):
        self.files = sorted(
            p for p in Path(folder).glob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png")
        )
        if not self.files:
            raise FileNotFoundError(f"No demo images in {folder}")
        self.i = 0

    def read_jpeg(self) -> bytes:
        data = self.files[self.i % len(self.files)].read_bytes()
        self.i += 1
        return data


class WebcamCamera(Camera):
    """Any USB webcam, via OpenCV. Works on a laptop or a Pi."""

    def __init__(self, index: int = 0, width: int = 1024, height: int = 768, rotate: int = 0):
        import cv2  # lazy

        self._cv2 = cv2
        self.cap = cv2.VideoCapture(index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.rotate = rotate
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open webcam {index}")

    def read_jpeg(self) -> bytes:
        ok, frame = self.cap.read()
        if not ok:
            raise RuntimeError("Webcam read failed")
        rot = {90: self._cv2.ROTATE_90_CLOCKWISE, 180: self._cv2.ROTATE_180, 270: self._cv2.ROTATE_90_COUNTERCLOCKWISE}
        if self.rotate in rot:
            frame = self._cv2.rotate(frame, rot[self.rotate])
        ok, buf = self._cv2.imencode(".jpg", frame, [self._cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            raise RuntimeError("JPEG encode failed")
        return buf.tobytes()

    def close(self) -> None:
        self.cap.release()


class PiCamera(Camera):
    """Raspberry Pi Camera Module via picamera2."""

    def __init__(self, width: int = 1024, height: int = 768, rotate: int = 0):
        from picamera2 import Picamera2  # lazy, Pi only

        self.cam = Picamera2()
        self.cam.configure(self.cam.create_still_configuration(main={"size": (width, height)}))
        self.cam.start()
        self.rotate = rotate

    def read_jpeg(self) -> bytes:
        from PIL import Image  # picamera2 pulls in PIL on the Pi

        arr = self.cam.capture_array()
        img = Image.fromarray(arr)
        if self.rotate:
            img = img.rotate(-self.rotate, expand=True)
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    def close(self) -> None:
        self.cam.stop()


def make_camera(cfg) -> Camera:
    src = cfg.source
    if src == "image":
        return ImageCamera(cfg.image_path)
    if src == "demo":
        return DemoCamera()
    if src == "picamera":
        return PiCamera(cfg.width, cfg.height, cfg.rotate)
    if src == "webcam":
        return WebcamCamera(cfg.index, cfg.width, cfg.height, cfg.rotate)
    raise ValueError(f"Unknown camera source: {src}")
