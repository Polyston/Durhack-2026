/*
 * Sentinel actuator — Arduino sketch
 * =================================================================
 * Sentinel's Python brain decides OK / WARN / ALARM and sends one line
 * over serial. This sketch reads that line and drives the lights + buzzer.
 *
 *   OK    -> green LED
 *   WARN  -> amber LED + short beeps
 *   ALARM -> red LED  + steady buzzer
 *
 * Protocol (one line per change, newline-terminated):
 *   STATE OK
 *   STATE WARN
 *   STATE ALARM
 *
 * -----------------------------------------------------------------
 * ARDUINO UNO Q
 *   Sentinel runs on the UNO Q's Linux side. Load this sketch onto the
 *   UNO Q's MCU with Arduino App Lab. The Linux side reaches the MCU as a
 *   serial port (commonly /dev/ttyACM0) — set that as `serial_port` in
 *   config.yaml. Then run Sentinel with `--actuator serial`.
 *
 * ANY USB ARDUINO (Uno / Nano / etc.) on a laptop or Raspberry Pi
 *   Upload this sketch, plug in over USB, set `serial_port` to the port
 *   the IDE shows (e.g. /dev/ttyACM0, /dev/ttyUSB0, or COM3 on Windows).
 *
 * WIRING (change pins below if yours differ)
 *   Green LED  : pin 2  --[220-330 ohm]--> LED --> GND
 *   Amber LED  : pin 3  --[220-330 ohm]--> LED --> GND
 *   Red LED    : pin 4  --[220-330 ohm]--> LED --> GND
 *   Buzzer     : pin 5  --> active buzzer (+)  ;  buzzer (-) --> GND
 *   (On the UNO Q, use the digital pins broken out on the board.)
 * =================================================================
 */

const int PIN_OK    = 2;
const int PIN_WARN  = 3;
const int PIN_ALARM = 4;
const int PIN_BUZZ  = 5;

enum State { OK, WARN, ALARM };
State state = OK;

unsigned long lastBeep = 0;
bool beepOn = false;

void setPins(bool ok, bool warn, bool alarm) {
  digitalWrite(PIN_OK, ok ? HIGH : LOW);
  digitalWrite(PIN_WARN, warn ? HIGH : LOW);
  digitalWrite(PIN_ALARM, alarm ? HIGH : LOW);
}

void setup() {
  pinMode(PIN_OK, OUTPUT);
  pinMode(PIN_WARN, OUTPUT);
  pinMode(PIN_ALARM, OUTPUT);
  pinMode(PIN_BUZZ, OUTPUT);
  Serial.begin(115200);
  setPins(true, false, false);          // start in OK
}

void applyState() {
  switch (state) {
    case OK:    setPins(true, false, false); digitalWrite(PIN_BUZZ, LOW); break;
    case WARN:  setPins(false, true, false); break;   // buzzer handled as beeps in loop()
    case ALARM: setPins(false, false, true); digitalWrite(PIN_BUZZ, HIGH); break;
  }
}

void loop() {
  // read a full line like "STATE ALARM"
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line == "STATE OK")    { state = OK;    applyState(); }
    else if (line == "STATE WARN")  { state = WARN;  applyState(); }
    else if (line == "STATE ALARM") { state = ALARM; applyState(); }
  }

  // WARN = short beeps without blocking
  if (state == WARN) {
    unsigned long now = millis();
    if (now - lastBeep > (beepOn ? 120 : 600)) {
      beepOn = !beepOn;
      digitalWrite(PIN_BUZZ, beepOn ? HIGH : LOW);
      lastBeep = now;
    }
  }
}
