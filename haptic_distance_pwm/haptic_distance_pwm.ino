// HC-SR04 distance -> motor vibration intensity (Arduino UNO Q)
// 255 cm from a surface = PWM 1, 3 cm from a surface = PWM 255,
// and every distance in between scales smoothly (linear).

const int TRIG  = 2;
const int ECHO  = 3;
const int MOTOR = 5;          // PWM pin -> 220 Ω -> TIP31C base

// --- Range ---
const float NEAR_CM = 3.0;    // at or closer than this = PWM 255
const float FAR_CM  = 250.0;  // at this distance = PWM 1; beyond it = motor off
const int   MIN_PWM = 1;      // absolute minimum while something is in range
const int   MAX_PWM = 255;    // absolute maximum

// How quickly the reading follows your hand: 1.0 = instant (jittery),
// lower = smoother but laggier. 0.5 feels responsive without much jitter.
const float RESPONSE = 1;

float smoothed = -1;          // averaged distance, removes jitter

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(MOTOR, OUTPUT);
  analogWrite(MOTOR, 0);
}

float readCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 30000);   // 30 ms timeout (~5 m)
  if (us == 0) return -1;                           // nothing detected
  return us * 0.0343 / 2.0;
}

int distanceToPwm(float cm) {
  if (cm < 0 || cm > FAR_CM) return 0;              // nothing in range -> off
  float d = constrain(cm, NEAR_CM, FAR_CM);
  float closeness = (FAR_CM - d) / (FAR_CM - NEAR_CM);   // 0.0 at 255 cm, 1.0 at 3 cm
  int pwm = MIN_PWM + (int)round(closeness * (MAX_PWM - MIN_PWM));
  return constrain(pwm, MIN_PWM, MAX_PWM);
}

void loop() {
  float cm = readCm();

  if (cm > 0) {
    smoothed = (smoothed < 0) ? cm : smoothed * (1.0 - RESPONSE) + cm * RESPONSE;
  } else {
    smoothed = -1;
  }

  int pwm = distanceToPwm(smoothed);
  analogWrite(MOTOR, pwm);

  Serial.print("Distance: ");
  Serial.print(smoothed);
  Serial.print(" cm  ->  PWM: ");
  Serial.println(pwm);

  delay(60);   // HC-SR04 needs ~60 ms between pings
}
