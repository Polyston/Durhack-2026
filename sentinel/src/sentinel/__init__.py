"""Sentinel: a plain-English-programmable safety camera.

Sense (camera) -> Analyse (Gemini Vision) -> Decide (debounced policy) -> Act (GPIO).

Every stage is behind an interface with a mock, so the whole pipeline runs on a
laptop with no camera, no API key and no Raspberry Pi.
"""

__version__ = "0.1.0"
