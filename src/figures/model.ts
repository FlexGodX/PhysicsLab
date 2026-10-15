export function springState(stiffness: number, extension: number) {
  if (
    !Number.isFinite(stiffness) ||
    !Number.isFinite(extension) ||
    stiffness < 20 ||
    stiffness > 200 ||
    extension < 0 ||
    extension > 0.1
  )
    throw new Error("Параметры пружины вне диапазона");
  return {
    force: stiffness * extension,
    energy: (stiffness * extension ** 2) / 2,
    extension,
  };
}
export function leverState(load: number, left: number, right: number) {
  if (
    ![load, left, right].every(Number.isFinite) ||
    load <= 0 ||
    left <= 0 ||
    right <= 0
  )
    throw new Error("Силы и плечи должны быть положительными");
  return {
    load,
    effort: (load * left) / right,
    torque: load * left,
    left,
    right,
  };
}
