import { inRange } from "./ranges";
export interface CircuitParams {
  voltage: number;
  resistance: number;
  closed: boolean;
  duration: number;
}
export function circuitState(p: CircuitParams, t: number) {
  inRange(p.voltage, 0, 12, "Напряжение");
  inRange(p.resistance, 10, 1000, "Сопротивление");
  inRange(p.duration, 0, 60, "Длительность");
  inRange(t, 0, p.duration, "Время");
  if (typeof p.closed !== "boolean")
    throw new Error("Недопустимое состояние выключателя");
  const current = p.closed ? p.voltage / p.resistance : 0,
    power = p.voltage * current;
  return {
    t,
    current,
    power,
    charge: current * t,
    energy: power * t,
    resistorVoltage: p.closed ? p.voltage : 0,
  };
}
