# Sensory Echolocator

Through ultrasonic distance measuring, our project aims to give people without sight a way of
perceiving their surroundings through haptic feedback.

Built at DurHack 2026.

## Inspiration

We were exploring the theme of composition, and how music and sound can improve people's daily
lives beyond changing their mood. We narrowed it down to helping people with sensory deprivation,
specifically loss of sight, and looked at how sound can help someone sense the space around them.

## What it does

The device uses an ultrasonic distance sensor to detect nearby objects and measure how close they
are, and relays this to the wearer through haptic feedback: the closer the object, the stronger
the vibration.

| Distance to object | Motor output |
|---|---|
| 3 cm or closer | PWM 255 (strongest) |
| 3 cm to 250 cm | scales linearly between 255 and 1 |
| beyond 250 cm, or nothing detected | off |

## How we built it

We connected an ultrasonic distance sensor to an Arduino UNO Q and to a DC motor, using a
breadboard. An off-centre weight on the motor shaft turns its rotation into vibration. We then
programmed the Arduino to read the ultrasonic sensor, calculate the distance to the object, and
drive the motor so it responds accordingly.

### Parts

- Arduino UNO Q
- HC-SR04 ultrasonic distance sensor
- 3 V DC motor with an off-centre weight
- TIP31C transistor and a 220 Ω resistor
- Breadboard and jumper wires
- 3D-printed housing

### Wiring

| Arduino pin | Connects to |
|---|---|
| D2 | HC-SR04 `TRIG` |
| D3 | HC-SR04 `ECHO` |
| D5 (PWM) | 220 Ω resistor, then TIP31C base (the transistor switches the motor) |
| 5V / GND | HC-SR04 `VCC` / `GND` |

### Run it

1. Open [`haptic_distance_pwm/haptic_distance_pwm.ino`](haptic_distance_pwm/haptic_distance_pwm.ino) in the Arduino IDE.
2. Select the Arduino UNO Q and its port, then upload.
3. Optional: open the Serial Monitor at 115200 baud to watch the distance and PWM values.

The range and responsiveness are set by the constants at the top of the sketch (`NEAR_CM`,
`FAR_CM`, `MIN_PWM`, `MAX_PWM`, `RESPONSE`).

## Challenges we ran into

- Errors in the Arduino code
- Arduino code not in sync with the motor or the distance sensor
- The distance sensor not working
- Not enough Arduinos to build a full network of devices
- No proper vibration motor element
- A 3D-printed part taking more than 2 hours to print

## Accomplishments that we're proud of

Getting the distance sensor to actually work and proving the project is feasible. We almost
switched to an Oculus-based approach.

## What we learned

A lot: how to design and build a circuit around an Arduino microcontroller, and how to program it
to receive input, process it and relay it to another component. We also learnt how to use MCP with
the Claude API for rapid 3D prototyping.

## What's next for our sensory locator

- Use APIs and speakers to give the user more intelligent feedback
- Build a network of devices that gives full-body coverage, with each node independent so the
  others keep working if one fails
- Miniaturise the device

## Challenge materials

- [Neptune North challenge](Neptune%20North%20challenge%202.pdf)
- [Opening ceremony deck](Opening%20Ceremony.pdf)
