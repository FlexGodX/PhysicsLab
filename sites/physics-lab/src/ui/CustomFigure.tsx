import { useMemo, useRef, useEffect, useState } from "react";
import * as k from "../figures/kit/iso-kit";
import { evaluateExpression, type AnatomyScene } from "../figures/scene";
import { Solid } from "../figures/geometry";
import type { FigureInteraction } from "./AnatomyFigure";
export function CustomFigure({
  title,
  caption,
  scene,
  values: controlledValues,
  onValuesChange,
}: {
  title: string;
  caption: string;
  scene: AnatomyScene;
} & FigureInteraction) {
  const [localValues, setValues] = useState(() =>
    Object.fromEntries(scene.controls.map((c) => [c.id, c.value])),
  );
  const values = controlledValues ?? localValues;
  const groups = useRef<(SVGGElement | null)[]>([]),
    outputs = useRef<(HTMLOutputElement | null)[]>([]),
    root = useRef<HTMLDivElement>(null);
  const actual = useRef({ ...values });
  const geometry = useMemo(() => {
    const corners = scene.parts.flatMap((p) => {
      const c = p.move
        ? scene.controls.find((c) => c.id === p.move!.control)
        : null;
      return [c?.min ?? 0, c?.max ?? 0].flatMap((v) => {
        const offset = p.move ? v * p.move.scale : 0;
        return k.boxCorners(
          {
            x: p.x + (p.move?.axis === "x" ? offset : 0),
            y: p.y + (p.move?.axis === "y" ? offset : 0),
            w: p.w,
            d: p.d,
            r: 1,
          },
          p.z + (p.move?.axis === "z" ? offset : 0),
          p.z + p.h + (p.move?.axis === "z" ? offset : 0),
        );
      });
    });
    const projection = k.fitProjection(corners, 640, 380, {
      pad: 45,
      azimuth: 42,
      elevation: 30,
    });
    return {
      projection,
      parts: scene.parts.map((p, index) => ({
        index,
        part: p,
        paths: k.slabOf(
          { x: p.x, y: p.y, w: p.w, d: p.d, r: Math.min(1, p.w / 4, p.d / 4) },
          p.z,
          p.h,
          projection,
          4,
          0.5,
        ),
      })),
    };
  }, [scene]);
  useEffect(() => {
    let frame = 0,
      last = 0,
      visible = false;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const paint = (t: number) => {
      frame = 0;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      let moving = false;
      for (const c of scene.controls) {
        const before = actual.current[c.id],
          target = values[c.id];
        let after =
          media.matches || controlledValues
            ? target
            : before + (target - before) * (1 - Math.exp(-dt / 0.12));
        if (Math.abs(after - target) < 1e-6) after = target;
        actual.current[c.id] = after;
        if (after !== target) moving = true;
      }
      const projected = geometry.parts
        .map(({ part: p, index }) => {
          const n = p.move ? actual.current[p.move.control] * p.move.scale : 0,
            offset: k.Point3 = [
              p.move?.axis === "x" ? n : 0,
              p.move?.axis === "y" ? n : 0,
              p.move?.axis === "z" ? n : 0,
            ];
          groups.current[index]?.setAttribute(
            "transform",
            k.translateAlong(geometry.projection, offset),
          );
          return {
            index,
            depth: k.depthOf(
              [
                p.x + p.w / 2 + offset[0],
                p.y + p.d / 2 + offset[1],
                p.z + p.h / 2 + offset[2],
              ],
              geometry.projection,
            ),
          };
        })
        .sort((a, b) => a.depth - b.depth);
      for (const p of projected) {
        const g = groups.current[p.index];
        if (g) g.parentElement?.appendChild(g);
      }
      scene.readouts.forEach((r, i) => {
        try {
          const n = evaluateExpression(r.expression, actual.current);
          if (outputs.current[i])
            outputs.current[i]!.textContent =
              `${r.label}: ${n.toLocaleString("ru-RU", { maximumSignificantDigits: 5 })} ${r.unit}`;
        } catch {
          if (outputs.current[i])
            outputs.current[i]!.textContent =
              `${r.label}: не определено при этих условиях`;
        }
      });
      if (moving && visible && !document.hidden)
        frame = requestAnimationFrame(paint);
    };
    const run = () => {
      if (visible && !frame && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(paint);
      }
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) run();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    if (root.current) observer.observe(root.current);
    paint(performance.now());
    document.addEventListener("visibilitychange", run);
    media.addEventListener("change", run);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", run);
      media.removeEventListener("change", run);
    };
  }, [values, scene, geometry, controlledValues]);
  return (
    <figure className="anatomy-figure iso" data-theme="light">
      <div className="iso-plate" ref={root}>
        <header>
          <span>FIG. CUSTOM</span>
          <strong>{title}</strong>
        </header>
        <svg viewBox="0 0 640 380" role="img" aria-label={title}>
          {geometry.parts.map(({ index, part, paths }) => (
            <g
              key={index}
              ref={(el) => {
                groups.current[index] = el;
              }}
            >
              <title>{part.name}</title>
              <Solid paths={paths} lit={part.lit} />
            </g>
          ))}
        </svg>
        <div className="anatomy-readout">
          {scene.readouts.map((r, i) => (
            <output
              key={i}
              ref={(el) => {
                outputs.current[i] = el;
              }}
            >
              {r.label}
            </output>
          ))}
        </div>
      </div>
      <div className="studio-fields">
        {scene.controls.map((c) => (
          <label key={c.id}>
            {c.label}: {values[c.id]}
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={values[c.id]}
              onChange={(e) => {
                const next = { ...values, [c.id]: Number(e.target.value) };
                setValues(next);
                onValuesChange?.(next);
              }}
            />
          </label>
        ))}
      </div>
      <figcaption>
        <p>{caption}</p>
        <details>
          <summary>Формулы и устройство модели</summary>
          {scene.readouts.map((r, i) => (
            <p key={i}>
              {r.label}: {r.expression} ({r.unit})
            </p>
          ))}
          <p>
            Деталей: {scene.parts.length}. Геометрия и формулы созданы по
            описанию; физическую достоверность нужно проверить по учебнику.
            Изменение ползунка плавно переводит прибор между состояниями.
          </p>
        </details>
      </figcaption>
    </figure>
  );
}
