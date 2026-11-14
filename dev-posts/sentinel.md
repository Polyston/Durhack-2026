---
title: "Sentinel: a safety camera you program in plain English"
published: false
description: "A Raspberry Pi camera that watches a workspace, checks rules you write in plain English with Gemini Vision, and drives real hardware. Reprogram it by editing a sentence."
tags: ai, raspberrypi, python, gemini
cover_image:
canonical_url:
---

> Built at DurHack 2026 for the RS "sense, analyse, decide, act" challenge. The whole system is reprogrammed by editing text.

## The idea in one line

Point a camera at a workbench. Write a rule like *"alert if the fire exit is blocked."* The camera watches each frame, decides whether the rule is broken, and turns on a red light and a buzzer if it is. To change what it watches, you change the sentence. No training, no dataset, no code.

That last part is the whole point, and it's only possible because the "analyse" step is a language model.

## Why not a normal vision model

Classic computer vision for this means training a detector per hazard: a hard-hat model, a spill model, a blocked-exit model. Each needs labelled data and retraining, and it can only ever detect the things you built it for. If you think of a new rule this morning, you're stuck until you collect data.

An LLM with vision flips that. The rules are plain English, passed in with each frame. Want a new rule? Type it. We reprogrammed the live device on stage by adding *"alert if someone raises both hands"*, restarting, and demonstrating it — no retraining, seconds later.

## Sense → Analyse → Decide → Act

The pipeline is four swappable stages, each behind an interface with a mock, so the whole thing runs on a bare laptop with no camera, no API key and no Raspberry Pi.

- **Sense** — grab a JPEG frame (Pi Camera, any USB webcam, or bundled demo images).
- **Analyse** — send the frame plus the rule list to **Gemini Vision**, and ask for strict JSON: for each rule, `triggered`, a confidence, and a short reason for what it saw.
- **Decide** — turn that into one stable state: OK, WARN or ALARM.
- **Act** — green / amber / red LEDs, a buzzer, and an optional servo that swings a barrier closed on alarm (gpiozero on the Pi).

A tiny web dashboard (Python's standard-library HTTP server, no framework) shows the live frame, a big colour banner, which rules are firing and why, and an event log — the thing judges watch while you hold a hazard up to the lens.

## The stage that makes it trustworthy

A vision model flickers. One blurry frame says "no safety glasses" and you don't want the alarm to chatter. So the decision layer is deliberately boring and fully unit-tested:

- **Confidence floor** — ignore weak guesses.
- **Trigger streak** — a rule must fire on two frames in a row before it counts.
- **Clear cooldown** — a rule stays active until it's been quiet for a few seconds, so the alarm doesn't stutter.
- **Severity wins** — the system state is the worst active rule.
- **Fail safe** — if the Gemini call errors (network, quota), the system *holds its last state* rather than dropping a live alarm, and logs the error.

That last rule matters: an outage should never look like "all clear."

## What surprised me

How much of the quality lived in the prompt and the rule wording, not the code. "A person at the workbench is NOT wearing safety glasses" behaves very differently from "no glasses." Treating the rules as a product surface — something you tune and version — was the real work, and it's exactly the part a non-programmer could own.

## The honest part

This is an assistant that flags and logs, not a certified safety system. The model can be wrong; debounce and confidence thresholds reduce false alarms but don't remove them. On Gemini's free tier it processes roughly one frame every couple of seconds, so it catches *states*, not split-second events. Only single frames leave the device — there's no stream or recording sent off-box.

## Stack

Python 3, Gemini Vision (`gemini-2.0-flash`), gpiozero for hardware, OpenCV or picamera2 for the camera, and a standard-library dashboard. 13 tests, no network or hardware needed to run them. Everything has a mock, so you can try the whole pipeline in one command.

```bash
python scripts/make_demo_images.py
PYTHONPATH=src python -m sentinel.app --source demo --vision mock --actuator mock --web
```

*Repo in the comments. Built with AI assistance, which is also how it reads the world.*
