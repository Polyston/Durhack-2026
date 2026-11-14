"""Act: drive the hardware from the system state.

  OK    -> green LED
  WARN  -> amber LED, short beeps
  ALARM -> red LED, steady buzzer, optional servo sweep (e.g. drop a barrier)

GPIO (gpiozero) imports are lazy, so MockActuator runs anywhere and prints what
the hardware WOULD do. gpiozero also has a MockFactory, but a console actuator is
clearer in a demo and needs nothing installed.
"""

from __future__ import annotations

from .types import Severity


class Actuator:
    def apply(self, state: Severity) -> None:
        raise NotImplementedError

    def close(self) -> None:
        pass


class MockActuator(Actuator):
    """Prints state changes. The default, so everything runs on a laptop."""

    def __init__(self) -> None:
        self._last: Severity | None = None

    def apply(self, state: Severity) -> None:
        if state != self._last:
            icon = {Severity.OK: "🟢", Severity.WARN: "🟡", Severity.ALARM: "🔴"}[state]
            beep = {Severity.OK: "buzzer off", Severity.WARN: "beep-beep", Severity.ALARM: "BUZZER ON"}[state]
            print(f"   [hardware] {icon} {state.label:5} | {beep}")
            self._last = state

    @property
    def last(self) -> Severity | None:
        return self._last


class GpioActuator(Actuator):
    """Real LEDs + buzzer (+ optional servo) on a Raspberry Pi via gpiozero."""

    def __init__(self, cfg) -> None:
        from gpiozero import LED, Buzzer  # lazy, Pi only

        self.ok = LED(cfg.led_ok)
        self.warn = LED(cfg.led_warn)
        self.alarm = LED(cfg.led_alarm)
        self.buzzer = Buzzer(cfg.buzzer)
        self.servo = None
        if cfg.servo >= 0:
            from gpiozero import Servo

            self.servo = Servo(cfg.servo)
        self._last: Severity | None = None

    def apply(self, state: Severity) -> None:
        if state == self._last:
            return
        self.ok.value = state == Severity.OK
        self.warn.value = state == Severity.WARN
        self.alarm.value = state == Severity.ALARM
        if state == Severity.ALARM:
            self.buzzer.on()
            if self.servo is not None:
                self.servo.min()  # swing the barrier closed
        elif state == Severity.WARN:
            self.buzzer.beep(on_time=0.1, off_time=0.4, background=True)
        else:
            self.buzzer.off()
            if self.servo is not None:
                self.servo.max()  # barrier open
        self._last = state

    def close(self) -> None:
        for d in (self.ok, self.warn, self.alarm, self.buzzer, self.servo):
            if d is not None:
                d.close()


def make_actuator(cfg) -> Actuator:
    if cfg.kind == "mock":
        return MockActuator()
    if cfg.kind == "gpio":
        return GpioActuator(cfg)
    raise ValueError(f"Unknown actuator kind: {cfg.kind}")
