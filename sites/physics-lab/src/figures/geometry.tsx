import * as k from "./kit/iso-kit";
import type { ReactNode } from "react";
export const P = k.fitProjection(
  k.boxCorners({ x: -150, y: -65, w: 310, d: 130, r: 8 }, -18, 110),
  640,
  360,
  { pad: 30, azimuth: 38, elevation: 30 },
);
export function Solid({
  paths,
  lit = false,
}: {
  paths: k.SolidPaths;
  lit?: boolean;
}) {
  return (
    <g className="iso-solid" data-lit={lit ? "" : undefined}>
      <path className="iso-fill" d={paths.fill} />
      {paths.shades.map((d, i) =>
        d ? <path key={i} className="iso-shade" data-shade={i} d={d} /> : null,
      )}
      <path className="iso-top" d={paths.top} />
      <path className="iso-line" data-tone="lo" d={paths.crease} />
      <path className="iso-line" data-tone="mid" d={paths.bevel} />
      <path className="iso-line" data-tone="hi" d={paths.outline} />
    </g>
  );
}
function block(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  lit = false,
) {
  return (
    <Solid
      paths={k.slabOf(
        { x, y, w, d, r: Math.min(1.5, w / 4, d / 4) },
        z,
        h,
        P,
        4,
        0.5,
      )}
      lit={lit}
    />
  );
}
function screw(x: number, y: number, z: number) {
  const p = k.iso([x, y, z], P);
  return (
    <g>
      <circle
        cx={p[0]}
        cy={p[1]}
        r="1.5"
        fill="var(--anatomy-paper)"
        stroke="var(--anatomy-mid)"
        strokeWidth=".5"
      />
      <circle cx={p[0]} cy={p[1]} r=".5" fill="currentColor" />
    </g>
  );
}
function group(items: ReactNode[]) {
  return (
    <>
      {items.map((part, i) => (
        <g key={i}>{part}</g>
      ))}
    </>
  );
}
export const baseArt = (() => {
  const parts: ReactNode[] = [];
  const feet = [
    [-130, -45],
    [130, -45],
    [-130, 45],
    [130, 45],
  ].sort(
    (a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P),
  );
  for (const [x, y] of feet) {
    parts.push(
      block(x - 8, y - 8, -18, 16, 16, 3),
      block(x - 5, y - 5, -15, 10, 10, 6),
    );
  }
  parts.push(block(-150, -65, -9, 310, 130, 9));
  parts.push(
    block(-143, -58, 0, 296, 1, 1),
    block(-143, -57, 0, 1, 114, 1),
    block(-143, 57, 0, 296, 1, 1),
    block(152, -57, 0, 1, 114, 1),
  );
  for (const x of [-136, 146])
    for (const y of [-51, 51]) parts.push(screw(x, y, 0));
  parts.push(block(-125, 37, 0, 64, 14, 1));
  for (const x of [-121, -65]) parts.push(screw(x, 44, 1));
  parts.push(
    <path
      className="iso-line"
      data-tone="lo"
      data-free=""
      d={[0, 1, 2]
        .map((i) =>
          k.lineOnTop([-114, 41 + i * 3], [-80 + i * 6, 41 + i * 3], 1, P),
        )
        .join("")}
    />,
  );
  return group(parts);
})();
export const springArt = (() => {
  const parts: ReactNode[] = [];
  for (const y of [-27, 22]) {
    if (y === 22) {
      parts.push(
        block(-113, -17, 0, 15, 34, 25),
        block(-111, -15, 25, 11, 30, 3),
      );
      for (const sy of [-11, 11]) parts.push(screw(-105, sy, 28));
    }
    for (const x of [-124, 132]) parts.push(block(x, y - 3, 0, 12, 11, 5));
    parts.push(block(-112, y, 5, 244, 5, 5));
    for (const x of [-120, 140]) parts.push(screw(x, y + 2, 5));
    for (const x of [-125, 137]) parts.push(block(x, y - 3, 5, 5, 14, 9));
  }
  parts.push(block(-114, 30, 0, 244, 5, 1));
  const ticks = k.topTicks(-110, 126, 4, 5, 30, 1, [2, 4], P);
  parts.push(
    <path className="iso-line" data-tone="mid" d={ticks.minor + ticks.major} />,
  );
  for (const x of [-110, -50, 10, 70, 126]) parts.push(screw(x, 33, 1));
  return group(parts);
})();
export const carriageArt = group([
  block(-34, -27, 10, 24, 6, 5),
  block(-34, 21, 10, 24, 6, 5),
  block(-38, -29, 15, 32, 58, 6),
  block(-38, -10, 21, 6, 20, 7),
  block(-32, -16, 21, 20, 32, 6),
  ...[-32, -12].flatMap((x) => [-22, 22].map((y) => screw(x, y, 21))),
  block(-27, -9, 27, 10, 18, 5, true),
]);
export const leverArt = (() => {
  const parts: ReactNode[] = [
    block(-19, -22, 0, 38, 44, 6),
    block(-12, -15, 6, 24, 30, 38),
    block(-6, -20, 44, 12, 40, 7),
  ];
  for (const x of [-14, 14])
    for (const y of [-17, 17]) parts.push(screw(x, y, 6));
  parts.push(block(-74, -14, 25, 27, 28, 4));
  for (let i = 0; i < 4; i++)
    parts.push(block(-71, -12, 29 + i * 4, 21, 24, 4));
  parts.push(block(-62, 12, 29, 3, 3, 19), block(-62, 6, 48, 3, 9, 3));
  return group(parts);
})();
export const loadArt = group([
  block(83, -14, 25, 27, 28, 4),
  ...[0, 1, 2, 3].map((i) => block(86, -12, 29 + i * 4, 21, 24, 4)),
  block(95, 12, 29, 3, 3, 19),
  block(95, 6, 48, 3, 9, 3),
  screw(96.5, 12, 51),
]);
export const leverBeamArt = (() => {
  const parts: ReactNode[] = [block(-128, -9, 51, 270, 18, 7, true)];
  for (const x of [-118, -78, -38, 2, 42, 82, 122]) {
    parts.push(block(x, -8, 58, 6, 16, 1), screw(x + 3, 0, 59));
  }
  parts.push(block(-126, 7, 58, 266, 1, 1));
  const t = k.topTicks(-120, 136, 4, 5, 8, 59, [2, 5], P);
  parts.push(
    <path className="iso-line" data-tone="mid" d={t.minor + t.major} />,
  );
  return group(parts);
})();
