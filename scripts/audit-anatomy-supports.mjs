import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

// Record the actual production solids and use their production polygon rings.
// Surface inset strokes and screw glyphs do not change the solid volume.
const skill =
  process.env.ANATOMY_SKILL_DIR || join(homedir(), ".codex/skills/anatomy");
const A = await import(pathToFileURL(join(skill, "kit/audit.mjs")).href);
const geometryPath = resolve("src/figures/geometry.tsx");
const checkWire = process.argv.includes("--wire");
const full = process.argv.includes("--full");
if (full && !checkWire) throw new Error("The full audit requires --wire.");
const sweep = process.argv.includes("--sweep");
const source = await readFile(geometryPath, "utf8");
const anchor = "  return (\n    <Solid";
if (source.split(anchor).length !== 2)
  throw new Error("Geometry block builder changed; update the audit adapter.");
const groups = [
  "baseArt",
  "springArt",
  "carriageArt",
  "leverArt",
  "loadArt",
  "leverBeamArt",
];
globalThis.__anatomyAuditParts = [];
let instrumented = source.replace(
  anchor,
  "  globalThis.__anatomyAuditParts.push({ group: globalThis.__anatomyAuditGroup, x, y, z, w, d, h });\n" +
    anchor,
);
for (const group of groups) {
  const start = `export const ${group} =`;
  if (!instrumented.includes(start))
    throw new Error(`Missing assembly: ${group}`);
  instrumented = instrumented.replace(
    start,
    `globalThis.__anatomyAuditGroup = '${group}';\n${start}`,
  );
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  logLevel: "error",
  plugins: [
    {
      name: "audit-actual-anatomy-slabs",
      enforce: "pre",
      transform(code, id) {
        return id === geometryPath ? instrumented : null;
      },
    },
  ],
});
try {
  const { P } = await server.ssrLoadModule("/src/figures/geometry.tsx");
  const { ringOf, slabOf } = await server.ssrLoadModule(
    "/src/figures/kit/iso-kit.ts",
  );
  const currentWire = checkWire
    ? (await server.ssrLoadModule("/src/figures/springWire.ts")).springWire
    : null;
  const checkDepth = process.argv.includes("--depth");
  const parts = globalThis.__anatomyAuditParts;
  for (const group of groups) {
    if (!parts.some((part) => part.group === group))
      throw new Error(`No recorded slabs for ${group}; audit cannot pass.`);
  }
  const evidence = {
    date: new Date().toISOString(),
    sourceHashes: Object.fromEntries(
      await Promise.all(
        [
          "src/figures/geometry.tsx",
          "src/figures/springWire.ts",
          "src/figures/kit/iso-kit.ts",
          "src/ui/AnatomyFigure.tsx",
        ].map(async (path) => [
          path,
          createHash("sha256")
            .update(await readFile(path))
            .digest("hex"),
        ]),
      ),
    ),
    fullChecks: full,
    sampling: sweep
      ? "Every integer slider value; not a proof over continuous time"
      : "Nine selected poses",
    scope: checkWire
      ? `Production polygon support, penetration, spring terminals and clearance${checkDepth ? ", and painter order including the wire" : ""}; 2D inset strokes and screw glyphs are checked visually and by the separate line check`
      : checkDepth
        ? "Rounded slab support, penetration and actual slab painter order at sampled poses; bevel faces, screws and spring wire are excluded"
        : "Rounded slab support and penetration only; bevel faces, screws, spring wire and painter order are not certified",
    states: [],
  };
  for (const mechanism of ["spring", "lever"]) {
    const included =
      mechanism === "spring"
        ? ["baseArt", "springArt", "carriageArt"]
        : ["baseArt", "leverArt", "loadArt", "leverBeamArt"];
    const moving = mechanism === "spring" ? "carriageArt" : "loadArt";
    const poses =
      mechanism === "spring"
        ? sweep
          ? Array.from({ length: 101 }, (_, i) => i)
          : [0, 25, 50, 75, 100]
        : sweep
          ? Array.from({ length: 31 }, (_, i) => i + 10)
          : [10, 20, 30, 40];
    for (const pose of poses) {
      const offset =
        mechanism === "spring" ? pose : -6 + (pose / 100 - 0.3) * 300;
      const selected = parts.filter((p) => included.includes(p.group));
      const solids = selected.map((p, index) =>
        A.extruded(
          ringOf(
            {
              x: p.x + (p.group === moving ? offset : 0),
              y: p.y,
              w: p.w,
              d: p.d,
              r: Math.min(1.5, p.w / 4, p.d / 4),
            },
            4,
          ),
          p.z,
          p.h,
          { name: `${p.group}:${index}` },
        ),
      );
      const result = A.supports(solids, [], {
        ground: (shape) => A.boundsOf(shape).min[2] <= -18 + 1e-6,
      });
      let wire, tube;
      if (checkWire && mechanism === "spring") {
        const points = currentWire(pose, P).points;
        if (points.length < 2)
          throw new Error("No spring centreline recorded.");
        const css = await readFile("src/figures/kit/iso.css", "utf8");
        const width = Number(css.match(/--anatomy-weight:([\d.]+)px/)?.[1]);
        if (!(width > 0))
          throw new Error("Cannot determine rendered wire width.");
        const axis = (a, b) => {
          const v = a.map((x, i) => b[i] - x);
          const n = Math.hypot(...v);
          return v.map((x) => x / n);
        };
        tube = A.tube(points, width / (2 * A.cameraBasis(P).k), {
          name: "spring-wire",
          owner: "spring-wire",
          tips: [points[0], points.at(-1)],
          tipAxes: [
            axis(points[0], points[1]),
            axis(points.at(-2), points.at(-1)),
          ],
        });
        wire = {
          terminals: A.terminals([tube], solids),
          clearances: A.clearances([tube], solids),
        };
        if (
          !sweep ||
          pose % 25 === 0 ||
          wire.terminals.length ||
          wire.clearances.length
        )
          console.log(
            JSON.stringify({
              mechanism,
              pose,
              wireTerminals: wire.terminals.length,
              wireClearances: wire.clearances.length,
            }),
          );
      }
      const items = solids.map((shape, key) => ({
        name: shape.name,
        key,
        shapes: [shape],
        ...(full
          ? {
              svg: `<path d="${
                slabOf(
                  {
                    x:
                      selected[key].x +
                      (selected[key].group === moving ? offset : 0),
                    y: selected[key].y,
                    w: selected[key].w,
                    d: selected[key].d,
                    r: Math.min(1.5, selected[key].w / 4, selected[key].d / 4),
                  },
                  selected[key].z,
                  selected[key].h,
                  P,
                  4,
                  0.5,
                ).fill
              }"/>`,
            }
          : {}),
      }));
      if (tube)
        items.push({
          name: tube.name,
          key: selected.findIndex((p) => p.group === "carriageArt") - 0.5,
          shapes: [tube],
          route: tube.name,
          ...(full
            ? {
                svg: `<path d="${currentWire(pose, P).back}${currentWire(pose, P).front}"/>`,
              }
            : {}),
        });
      const depth = checkDepth ? A.depthOrder(items, P) : null;
      let complete;
      if (full) {
        const recorded = A.recorder(P, {
          ground: (shape) => A.boundsOf(shape).min[2] <= -18 + 1e-6,
        });
        recorded.solids = solids;
        recorded.items = items;
        recorded.tubes = tube ? [tube] : [];
        recorded.routes = tube
          ? [{ name: tube.name, points: tube.points, r: tube.radii[0] }]
          : [];
        complete = A.auditOrExit(recorded, P, { flag: "--full" });
      }
      if (depth && (!sweep || pose % 25 === 0 || depth.problems.length))
        console.log(
          JSON.stringify({
            mechanism,
            pose,
            depthProblems: depth.problems.length,
          }),
        );
      evidence.states.push({
        mechanism,
        pose,
        solids: solids.length,
        ...result,
        ...(depth ? { depth } : {}),
        ...(wire ? { wire } : {}),
        ...(complete ? { complete } : {}),
      });
    }
  }
  const output =
    process.env.ANATOMY_AUDIT_OUTPUT ||
    `docs/verification/2026-10-15-anatomy-${full ? "full" : checkWire ? "wire" : checkDepth ? "depth" : "supports"}${sweep ? "-sweep" : ""}.json`;
  await writeFile(output, JSON.stringify(evidence, null, 2) + "\n");
  const failures = evidence.states.reduce(
    (sum, s) =>
      sum +
      s.loose.length +
      s.sunk.length +
      (s.depth?.problems.length ?? 0) +
      (s.wire?.terminals.length ?? 0) +
      (s.wire?.clearances.length ?? 0) +
      (s.complete ? A.failures(s.complete) : 0),
    0,
  );
  console.log(
    JSON.stringify(
      { output, failures, states: evidence.states.length },
      null,
      2,
    ),
  );
  if (failures) process.exitCode = 1;
} finally {
  await server.close();
  delete globalThis.__anatomyAuditParts;
  delete globalThis.__anatomyAuditGroup;
}
