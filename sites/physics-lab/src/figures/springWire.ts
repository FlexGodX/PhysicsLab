import {
  depthOf,
  iso,
  pathOf,
  type Point3,
  type Flat,
  type Projection,
} from "./kit/iso-kit";

export function springWire(extension: number, projection: Projection) {
  if (!Number.isFinite(extension) || extension < 0 || extension > 100)
    throw new Error("Удлинение должно быть от 0 до 100 мм.");
  const from = -98,
    to = -38 + extension,
    z = 24;
  const points: Point3[] = [[from, -7, z]];
  const normals: Point3[] = [[0, -1, 0]];
  // Ease the pitch only at the ends, retaining an even coil in the middle.
  const ramp = 0.0125;
  const lead = (s: number) =>
    (s - (ramp / Math.PI) * Math.sin((Math.PI * s) / ramp)) / 2;
  for (let i = 0; i <= 320; i++) {
    const s = i / 320;
    const phase =
      s < ramp ? lead(s) : s > 1 - ramp ? 1 - ramp - lead(1 - s) : s - ramp / 2;
    const angle = Math.PI + (20 * Math.PI * phase) / (1 - ramp);
    const cosine = Math.cos(angle),
      sine = Math.sin(angle);
    points.push([from + 4 + (to - from - 8) * s, 7 * cosine, z + 7 * sine]);
    normals.push([0, cosine, sine]);
  }
  points.push([to, -7, z]);
  normals.push([0, -1, 0]);
  const back: string[] = [],
    front: string[] = [];
  let run: Flat[] = [],
    near = depthOf(normals[0], projection) > 0;
  for (let i = 0; i < points.length; i++) {
    const flat = iso(points[i], projection),
      facing = depthOf(normals[i], projection) > 0;
    run.push(flat);
    if (facing !== near) {
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
    }
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { points, back: back.join(""), front: front.join("") };
}
