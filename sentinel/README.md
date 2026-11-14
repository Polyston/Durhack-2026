# Sentinel

**A safety camera you program in plain English.** Point it at a workbench, write rules like
*"alert if the fire exit is blocked"*, and it watches each frame with Gemini Vision, decides if a
rule is broken, and drives real hardware: green / amber / red LEDs, a buzzer, an optional barrier servo.

Sense → Analyse → Decide → Act. Built for the **RS "sense, analyse, decide, act"** challenge and
**MLH Best Use of Gemini**. Full brief: `../SENTINEL_BRIEF.md`.

The point: **you reprogram the whole system by editing text.** No model training, no labelled data.
That is the thing plain computer vision can't do, and the reason an LLM belongs on the edge here.

---

## Run it in 30 seconds (no camera, no API key, no Raspberry Pi)

```bash
cd sentinel
python scripts/make_demo_images.py          # one-time: placeholder frames
PYTHONPATH=src python -m sentinel.app --source demo --vision mock --actuator mock
```

You'll see the state move OK → WARN → ALARM as the mock vision scripts a hazard, the "hardware"
line show the LEDs/buzzer, and `events.jsonl` fill up. Add `--web` and open
<http://localhost:8000> for the dashboard.

```bash
PYTHONPATH=src python -m pytest        # 13 tests, no network
```

---

## Run it for real

### 1. Vision (Gemini)
```bash
pip install google-generativeai pyyaml
cp .env.example .env        # paste a free key from https://aistudio.google.com/apikey
python scripts/check_gemini.py scripts/demo_images/03_blocked_exit.jpg   # smoke test one image
```

### 2. Camera (laptop webcam)
```bash
pip install opencv-python
PYTHONPATH=src python -m sentinel.app --source webcam --vision gemini --actuator mock --web
```
Hold a hazard up to the webcam (take your glasses off; put a box "in the exit") and watch the
dashboard flip to ALARM.

### 3. Hardware — Arduino UNO Q (our target board)

The UNO Q runs Linux on one chip and has an MCU for the pins on the same board. So Sentinel's
Python brain runs on its Linux side with a USB webcam, and a tiny Arduino sketch on the MCU drives
the lights and buzzer. They talk over serial.

**Parts you need**

| Part | Notes |
|---|---|
| Arduino **UNO Q** | the board (Linux CPU + MCU) |
| USB **webcam** | any UVC webcam; plug into the UNO Q's USB (a USB hub helps if you also want a keyboard) |
| 3 **LEDs** — green, amber, red | the OK / WARN / ALARM lights |
| 3 **resistors**, 220–330 Ω | one in series with each LED |
| 1 **active buzzer** | the alarm sound |
| **breadboard** + jumper wires | to wire it up |
| USB-C power for the UNO Q | its normal supply |

**Wiring** (digital pins; change them at the top of the sketch if needed)

| Signal | UNO Q pin | To |
|---|---|---|
| Green LED | D2 | →[220–330 Ω]→ LED → GND |
| Amber LED | D3 | →[220–330 Ω]→ LED → GND |
| Red LED | D4 | →[220–330 Ω]→ LED → GND |
| Buzzer | D5 | → buzzer(+); buzzer(−) → GND |

**Steps**

1. **Flash the MCU.** Open [`arduino/sentinel_actuator.ino`](arduino/sentinel_actuator.ino) in **Arduino App Lab** and upload it to the UNO Q's MCU.
2. **On the UNO Q's Linux side**, get the code and install deps:
   ```bash
   cd sentinel
   pip install pyyaml google-generativeai opencv-python pyserial
   cp .env.example .env        # paste your Gemini key
   ```
3. **Find the serial port** to the MCU (usually `/dev/ttyACM0`): `ls /dev/ttyACM*`. Put it in `config.yaml` under `actuator.serial_port`.
4. **Run it:**
   ```bash
   PYTHONPATH=src python -m sentinel.app --source webcam --vision gemini --actuator serial --web
   ```
5. Hold a hazard up to the webcam. The dashboard and the LEDs change together.

> The same `--actuator serial` path works with **any USB Arduino** on a laptop: upload the sketch, set `serial_port` to the port the IDE shows (`/dev/ttyUSB0`, `COM3`, …).

### 3b. Hardware — Raspberry Pi (alternative)
```bash
pip install gpiozero rpi-lgpio                 # + picamera2 if using the Pi Camera
PYTHONPATH=src python -m sentinel.app --source picamera --vision gemini --actuator gpio --web
```
Wiring (BCM pins, change in `config.yaml`): green LED 17, amber 27, red 22, buzzer 23, optional
servo on any PWM pin. Each LED through a 220–330 Ω resistor to GND.

Install as a command instead of `PYTHONPATH`: `pip install -e .` then just `sentinel --web`.

---

## Change what it watches

Edit `config.yaml` — this is the whole "programming":

```yaml
rules:
  - id: helmet
    watch: Someone on site is not wearing a hard hat.
    severity: alarm
  - id: phone
    watch: A worker is looking at their phone near moving machinery.
    severity: warn
```

Reorder, rewrite, add, delete. No code changes, no retraining.

---

## How it fits together

```
camera.py   Sense    PiCamera / webcam / demo image  -> JPEG bytes
vision.py   Analyse  JPEG + English rules -> Gemini -> per-rule verdict (JSON)
decide.py   Decide   debounced policy -> one stable state (OK/WARN/ALARM)
actuator.py Act      GPIO LEDs + buzzer + servo  (or console mock)
app.py      the loop + CLI        web.py   live dashboard (stdlib, no Flask)
```

Every stage is an interface with a mock, so the pipeline runs anywhere. Two design choices worth
knowing for the demo:

- **Debounce** (`decide.py`): a rule must trigger on 2 frames in a row before it fires, and stay
  quiet for 3 s before it clears. One blurry frame won't set off the alarm — like a sensor needing
  a steady reading.
- **Fail safe**: if the Gemini call errors (network, quota), the system *holds its last state*
  instead of dropping a live alarm.

| Command flag | Options |
|---|---|
| `--source` | `webcam` · `picamera` · `image` · `demo` |
| `--vision` | `gemini` · `mock` |
| `--actuator` | `gpio` · `mock` |
| `--web` | also serve the dashboard |
| `--once` | one cycle and exit (great for testing) |

---

## Honest limitations

- A vision LLM can be wrong; this is an **assistant**, not a certified safety system. Debounce and
  confidence thresholds reduce false alarms but don't remove them.
- ~2 s per frame on Gemini's free tier, so it catches states, not split-second events.
- Keep the stream on-device; only single frames go to the API.
