# Sentinel — project brief

> **Status:** built and tested; needs a Gemini API key + hardware to run live &nbsp;·&nbsp; **Code:** [`sentinel/`](sentinel/) &nbsp;·&nbsp; **Prizes:** RS, MLH Best Use of Gemini
>
> The project is already built — this is the spec to understand, demo and extend it. Sections 1–4 are the overview; 5 onward is the build detail. Roles are in section 9.

---

## 1. One sentence

**A safety camera you program in plain English: point a Raspberry Pi camera at a workspace, write rules like "alert if the fire exit is blocked", and it watches each frame with Gemini Vision, decides if a rule is broken, and drives real hardware — LEDs, a buzzer, a barrier servo.**

Sense → Analyse → Decide → Act.

## 2. Target prizes

| Prize | Why it fits |
|---|---|
| **RS: "Build an intelligent system that can sense, analyse and respond to the real world"** | This is literally capture → analyse → decide → trigger an action. Their listed examples are "smart safety monitoring" and "accessibility" — exactly this. |
| **RS Group: "connect things that usually aren't"** (Raspberry Pi) | We connect a camera, an LLM in the cloud, and workshop hardware that normally has nothing to do with each other. |
| **MLH: Best Use of Gemini** | Gemini Vision is the brain. Without it the plain-English rules are impossible. |

> Note on hardware: the RS/Arduino "sense-analyse-decide" challenge names the **Arduino UNO Q** (which has a **Linux CPU + an MCU on one board**) plus a camera and USB hub. Sentinel's brains are plain Python, so they run on the UNO Q's Linux side too, with the camera over USB — that satisfies that challenge's mandatory hardware. The default target is a Raspberry Pi; the code is hardware-abstracted either way. **Confirm at the RS stand which board they want.**

## 3. The idea that makes judges remember it

Every other AI-vision project trains a model, or wires up a fixed detector ("hard hat: yes/no").
Ours takes **rules written in English** and checks them with an LLM. So:

- You **reprogram the entire device by editing text.** Add "alert if someone is on their phone near
  the lathe" and it just works, with no new data and no retraining.
- One box does safety monitoring, accessibility alerts, or process checks — whatever you type.

That flexibility is the pitch. It's only possible because the "analyse" step is an LLM.

## 4. What the demo looks like

A laptop (or a screen on the Pi) shows the **dashboard**: the live camera frame, a big
green/amber/red banner, the list of rules (the broken ones light up with the reason the model gave),
and a running event log. Next to it, the **hardware**: three LEDs and a buzzer on a breadboard.

**90-second live demo:**
1. Camera on a tidy bench. Dashboard is **green**, green LED on. "It's watching four rules I wrote in plain English."
2. Take your safety glasses off and sit at the bench. Within two frames the dashboard goes **amber**, amber LED on, short beeps. Point at the reason text: *"person at the bench with no eye protection."*
3. Put a box in front of the "fire exit". Dashboard goes **red**, red LED, steady buzzer. "That rule is marked critical."
4. The winning line: open `config.yaml`, **type a brand-new rule live** — "alert if someone raises both hands" — restart, and demonstrate it. "No retraining. I just told it what to watch."
5. Clear the hazards; it returns to green after the cooldown. Show the event log with timestamps.

---

## 5. Tech stack

- **Python 3.10+**. Core has one dependency (PyYAML); everything heavy is optional and lazy-imported.
- **Gemini Vision** (`google-generativeai`, model `gemini-2.0-flash`) — fast and free-tier friendly.
- **Camera:** `picamera2` (Pi Camera) or `opencv-python` (any USB webcam). A `demo`/`image` source needs neither.
- **Hardware:** `gpiozero` + `rpi-lgpio` on the Pi for LEDs, buzzer, servo.
- **Dashboard:** Python's built-in `http.server` — no Flask, no build step, nothing to install.
- **Tested:** `pytest` (13 tests, no network/hardware).

Everything is behind an interface with a **mock**, so the whole pipeline runs on a bare laptop with
no camera, no API key and no Pi. That's how it was built and tested.

## 6. Folder structure

```
sentinel/
  config.yaml            the rules + hardware pins (this IS the program)
  .env.example           GEMINI_API_KEY
  src/sentinel/
    types.py             Rule, Severity (OK/WARN/ALARM), verdicts, Decision
    config.py            load config.yaml + .env
    camera.py   SENSE    PiCamera / webcam / demo-image -> JPEG bytes
    vision.py   ANALYSE  JPEG + English rules -> Gemini -> per-rule JSON verdict (+ MockVision)
    decide.py   DECIDE   debounced policy -> one stable state (pure, unit-tested)
    actuator.py ACT      GPIO LEDs/buzzer/servo (+ MockActuator that prints)
    eventlog.py          JSONL log + in-memory ring for the dashboard
    app.py               the loop + CLI
    web.py               live dashboard (stdlib http.server)
  scripts/
    make_demo_images.py  placeholder frames so `--source demo` works
    check_gemini.py      smoke-test Gemini on one image
  tests/                 test_decide.py, test_vision_parse.py
```

## 7. How each stage works

### Sense (`camera.py`)
Returns JPEG bytes whatever the source, so nothing downstream cares which camera you have. On a
laptop: `webcam`. On the Pi: `picamera`. With neither: `demo` cycles bundled images.

### Analyse (`vision.py`)
Builds one prompt listing every rule by id, sends it with the frame, and asks for strict JSON:
```json
{"scene":"...", "results":[{"id":"exit","triggered":true,"confidence":0.8,"reason":"boxes across the doorway"}]}
```
The parser is tolerant (strips code fences, fills in any rule the model forgot, clamps confidence).
A failed call returns an **error** verdict instead of throwing.

### Decide (`decide.py`) — the part that makes it reliable
- **Confidence floor:** ignore guesses below `min_confidence` (0.55).
- **Trigger streak:** a rule must fire on `trigger_streak` frames in a row (2) before it counts — kills flicker.
- **Cooldown:** a rule stays active until it's been quiet for `clear_after` seconds (3) — stops the alarm chattering.
- **Severity wins:** the system state is the worst active rule (ALARM > WARN > OK).
- **Fail safe:** on a vision error, **hold the last state** — a network blip must not silence a real alarm.

### Act (`actuator.py`)
Maps state → outputs: OK = green LED; WARN = amber + short beeps; ALARM = red + steady buzzer + optional
servo swinging a barrier closed. `MockActuator` prints the same transitions so you can demo with no wiring.

## 8. Hardware wiring (Raspberry Pi)

| Part | Pin (BCM) | Notes |
|---|---|---|
| Green LED | 17 | through a 220–330 Ω resistor to GND |
| Amber LED | 27 | same |
| Red LED | 22 | same |
| Buzzer | 23 | active buzzer to GND |
| Servo (optional) | set `servo:` in config | a barrier arm; swings closed on ALARM |
| Camera | CSI ribbon or USB | `source: picamera` or `webcam` |

Change any pin in `config.yaml`. Nothing in code is hard-wired.

## 9. Roles (2–3 people; this is a one-day build)

1. **Vision + rules:** get `check_gemini.py` returning good verdicts on real photos of your bench. Tune the rule wording and `min_confidence`. Own the prompt.
2. **Hardware:** breadboard the LEDs + buzzer, get `--actuator gpio` lighting them from the mock loop first, then the live loop. Optional servo barrier.
3. **Demo + dashboard + pitch:** camera framing, the dashboard on a screen, the 90-second script, the backup video, the Devpost page. (If only 2 people, split this across both.)

## 10. Timeline (one day)

| By | Done |
|---|---|
| +1 h | Mock pipeline runs (`--source demo --vision mock`), tests pass (already true) |
| +3 h | Gemini verdicts good on real bench photos; LEDs light from the loop |
| +5 h | Live webcam → Gemini → LEDs end to end; dashboard up |
| +7 h | On the Pi with the real camera; tune debounce so it's steady, not jumpy |
| last 2 h | Rehearse the 90-second demo, record the backup video, write Devpost. **Freeze.** |

**Cut order if behind:** servo → Pi camera (use a USB webcam) → Pi itself (demo on the laptop; the LEDs are the only thing that needs the Pi, and a USB-GPIO board or even the mock works for a pinch).

## 11. Pitch (90 seconds)
1. **Problem:** "Safety and compliance monitoring usually means an expensive fixed camera system, or a person watching. Both are rigid."
2. **What it is:** "Sentinel watches a space and enforces rules you write in plain English. It runs on a Raspberry Pi."
3. **Live demo** (section 4).
4. **The twist:** type a new rule live, no retraining.
5. **Where it goes:** multiple cameras, logging trends, SMS/Slack alerts, offline on-device models.

## 12. Submission checklist
- [ ] Devpost: tracks **RS** and **MLH Best Use of Gemini**; all teammates added
- [ ] Demo video (record the 90-second flow; the live hardware can fail)
- [ ] Public repo with `sentinel/` + README (setup, how it works, limitations — already written)
- [ ] A photo of the breadboard + a dashboard screenshot
- [ ] Say plainly: Gemini is the vision brain; rules are plain English; it's an assistant, not a certified safety device

## 13. Questions judges will ask
| Question | Answer |
|---|---|
| "Why an LLM, not a trained detector?" | You reprogram it by typing a sentence. No dataset, no retraining. A fixed detector can't do a rule you thought of this morning. |
| "What about false alarms?" | Confidence floor + a 2-frame trigger streak + a clear-cooldown. It needs a steady reading, like a sensor. |
| "What if the internet drops?" | It holds the last state rather than dropping an alarm, and logs the error. Next step is an on-device model for offline use. |
| "Is this really safe to rely on?" | It's an assistant that flags and logs, not a certified system. That's stated up front. |
| "What's the latency?" | ~2 s per frame on the free tier; it catches states, not split-second events. |
| "Does the video leave the device?" | Only single JPEG frames go to the API; there's no stream or recording off-box. |
