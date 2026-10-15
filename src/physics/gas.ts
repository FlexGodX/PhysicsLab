import { inRange } from "./ranges";
export const GAS_R = 8.31446261815324;
export interface GasParams {
  moles: number;
  T0: number;
  V0: number;
  T1: number;
  ratio: number;
  process: "isochoric" | "isobaric" | "isothermal";
}
export function gasState(p: GasParams, phase: number) {
  inRange(p.moles, 0.05, 0.2, "Количество вещества");
  inRange(p.T0, 250, 400, "Начальная температура");
  inRange(p.V0, 0.005, 0.01, "Начальный объём");
  inRange(p.T1, 250, 500, "Конечная температура");
  inRange(p.ratio, 0.5, 2, "Отношение объёмов");
  inRange(phase, 0, 1, "Ход процесса");
  if (!["isochoric", "isobaric", "isothermal"].includes(p.process))
    throw new Error("Неизвестный процесс");
  const pressure0 = (p.moles * GAS_R * p.T0) / p.V0;
  const temperature =
    p.process === "isothermal" ? p.T0 : p.T0 + (p.T1 - p.T0) * phase;
  const volume =
    p.process === "isochoric"
      ? p.V0
      : p.process === "isobaric"
        ? (p.moles * GAS_R * temperature) / pressure0
        : p.V0 * (1 + (p.ratio - 1) * phase);
  const pressure = (p.moles * GAS_R * temperature) / volume;
  const deltaU = 1.5 * p.moles * GAS_R * (temperature - p.T0);
  const work =
    p.process === "isochoric"
      ? 0
      : p.process === "isobaric"
        ? pressure0 * (volume - p.V0)
        : p.moles * GAS_R * p.T0 * Math.log(volume / p.V0);
  return {
    phase,
    temperature,
    volume,
    pressure,
    deltaU,
    work,
    heat: deltaU + work,
    internalEnergy: 1.5 * p.moles * GAS_R * temperature,
  };
}
