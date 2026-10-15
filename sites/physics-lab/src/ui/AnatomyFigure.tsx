import { CustomFigure } from "./CustomFigure";
import type { z } from "zod";
import type { visualizationSchema } from "../studio/schema";
import { useEffect, useRef, useState } from "react";
import { springState, leverState } from "../figures/model";
import {
  P,
  baseArt,
  springArt,
  carriageArt,
  leverArt,
  leverBeamArt,
  loadArt,
} from "../figures/geometry";
import { translateAlong } from "../figures/kit/iso-kit";
import { springWire } from "../figures/springWire";
import "../figures/kit/iso.css";
export type FigureSpec = z.infer<typeof visualizationSchema>;
export interface FigureInteraction {
  values?: Record<string, number>;
  onValuesChange?: (values: Record<string, number>) => void;
}
export function AnatomyFigure({
  figure,
  ...interaction
}: { figure: FigureSpec } & FigureInteraction) {
  return figure.mechanism === "custom" && figure.scene ? (
    <CustomFigure
      title={figure.title}
      caption={figure.caption}
      scene={figure.scene}
      {...interaction}
    />
  ) : (
    <KnownFigure key={figure.mechanism} figure={figure} {...interaction} />
  );
}
function KnownFigure({
  figure,
  values,
  onValuesChange,
}: { figure: FigureSpec } & FigureInteraction) {
  const spring = figure.mechanism === "spring";
  const [localValue, setValue] = useState(spring ? 20 : 30),
    [localStiffness, setStiffness] = useState(100),
    [tour, setTour] = useState(false);
  const value = values ? values[spring ? "x" : "l"] : localValue;
  const stiffness = values ? values.k : localStiffness;
  const controlled = values !== undefined;
  const root = useRef<HTMLDivElement>(null),
    moving = useRef<SVGGElement>(null),
    front = useRef<SVGPathElement>(null),
    back = useRef<SVGPathElement>(null),
    readout = useRef<HTMLOutputElement>(null);
  const now = useRef(value);
  const target = useRef(value);
  target.current = value;
  useEffect(() => {
    let frame = 0,
      last = 0,
      visible = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const origin = performance.now();
    const draw = (timestamp: number) => {
      frame = 0;
      const dt = last ? Math.min(0.05, (timestamp - last) / 1000) : 0;
      last = timestamp;
      const wanted =
        tour && !reduce.matches && !controlled
          ? spring
            ? 50 + 45 * Math.sin((timestamp - origin) / 2200)
            : 25 + 14 * Math.sin((timestamp - origin) / 2200)
          : target.current;
      now.current =
        reduce.matches || controlled
          ? wanted
          : now.current + (wanted - now.current) * (1 - Math.exp(-dt / 0.14));
      if (Math.abs(now.current - wanted) < 0.005) now.current = wanted;
      if (spring) {
        const m = springState(
          stiffness,
          Math.max(0, Math.min(0.1, now.current / 1000)),
        );
        const dx = m.extension * 1000;
        moving.current?.setAttribute(
          "transform",
          translateAlong(P, [dx, 0, 0]),
        );
        const c = springWire(dx, P);
        back.current?.setAttribute("d", c.back);
        front.current?.setAttribute("d", c.front);
        if (readout.current)
          readout.current.textContent = `x = ${(m.extension * 1000).toFixed(1)} мм · F = ${m.force.toFixed(2)} Н · E = ${m.energy.toFixed(3)} Дж`;
      } else {
        const m = leverState(
          10,
          0.2,
          Math.max(0.1, Math.min(0.4, now.current / 100)),
        );
        moving.current?.setAttribute(
          "transform",
          translateAlong(P, [-6 + (m.right - 0.3) * 300, 0, 0]),
        );
        if (readout.current)
          readout.current.textContent = `F₁ = 10 Н · l₁ = 20 см · l₂ = ${(m.right * 100).toFixed(1)} см · F₂ = ${m.effort.toFixed(2)} Н · M = 2 Н·м`;
      }
      if (
        visible &&
        !document.hidden &&
        ((tour && !reduce.matches && !controlled) ||
          Math.abs(now.current - wanted) > 0.004)
      )
        frame = requestAnimationFrame(draw);
    };
    const run = () => {
      if (!frame && visible && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(draw);
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
    document.addEventListener("visibilitychange", run);
    reduce.addEventListener("change", run);
    draw(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", run);
      reduce.removeEventListener("change", run);
    };
  }, [value, stiffness, tour, spring, controlled]);
  const initialCoil = springWire(20, P);
  return (
    <figure className="anatomy-figure iso" data-theme="light">
      <div className="iso-plate" ref={root}>
        <header>
          <span>FIG. {spring ? "01" : "02"}</span>
          <strong>{figure.title}</strong>
        </header>
        <svg
          viewBox="85 105 470 240"
          role="img"
          aria-label={
            spring
              ? "Изометрический стенд: каретка растягивает пружину вдоль направляющих"
              : "Изометрический рычаг в равновесии: положение правой нагрузки задаёт плечо"
          }
        >
          {baseArt}
          {spring ? (
            <>
              {springArt}
              <path
                ref={back}
                d={initialCoil.back}
                className="iso-line"
                data-tone="hi"
              />
              <path
                ref={front}
                d={initialCoil.front}
                className="iso-line"
                data-tone="hi"
              />
              <g ref={moving} transform={translateAlong(P, [20, 0, 0])}>
                {carriageArt}
              </g>
            </>
          ) : (
            <>
              {leverArt}
              <g ref={moving}>{loadArt}</g>
              {leverBeamArt}
            </>
          )}
        </svg>
        <div className="anatomy-readout">
          <span>Измените {spring ? "удлинение" : "плечо"} ползунком</span>
          <output ref={readout}>
            {spring
              ? "x = 20 мм · F = 2 Н · E = 0,020 Дж"
              : "F₁ = 10 Н · l₁ = 20 см · l₂ = 30 см · F₂ = 6,67 Н"}
          </output>
        </div>
      </div>
      <div className="studio-fields">
        <label>
          {spring ? "Удлинение, мм" : "Правое плечо, см"}
          <input
            type="range"
            min={spring ? 0 : 10}
            max={spring ? 100 : 40}
            value={value}
            step={1}
            onChange={(e) => {
              setTour(false);
              setValue(Number(e.target.value));
              if (values)
                onValuesChange?.({
                  ...values,
                  [spring ? "x" : "l"]: Number(e.target.value),
                });
            }}
          />
        </label>
        {spring && (
          <label>
            Жёсткость, Н/м
            <input
              type="range"
              min={20}
              max={200}
              step={10}
              value={stiffness}
              onChange={(e) => {
                setStiffness(Number(e.target.value));
                if (values)
                  onValuesChange?.({ ...values, k: Number(e.target.value) });
              }}
            />
            <span>{stiffness} Н/м</span>
          </label>
        )}
      </div>
      {!controlled && (
        <button onClick={() => setTour((t) => !t)} aria-pressed={tour}>
          {tour ? "Остановить демонстрацию" : "Показать изменение"}
        </button>
      )}
      <figcaption>
        <p>{figure.caption}</p>
        <p className="small muted">
          {spring
            ? "F = kx; E = kx²/2. Идеальная пружина в области упругих деформаций. Плавный переход показывает последовательность равновесных состояний, а не колебания."
            : "F₁l₁ = F₂l₂. Невесомый рычаг без трения. Усилие подбирается для равновесия; наклон и движение не моделируются. Грузы изображены условно."}
        </p>
      </figcaption>
    </figure>
  );
}
