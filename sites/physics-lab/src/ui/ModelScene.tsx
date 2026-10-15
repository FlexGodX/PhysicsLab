import { defaultVectorView, type VectorView } from "./VectorControls";
import type { ModelId, ModelParams } from "../physics/catalog";
import { formatNumber as f } from "../physics/units";
import {
  generateMeasurements,
  measurementStats,
  roundedMeasurement,
  type MeasurementParams,
} from "../physics/measurements";
export function ModelScene({
  id,
  params: p,
  values: s,
  phase,
  manualValues,
  vectorView = defaultVectorView,
}: {
  id: ModelId;
  params: ModelParams;
  values: Record<string, number | null>;
  phase: number;
  manualValues: number[] | null;
  vectorView?: VectorView;
}) {
  if (id === "circular") {
    const R = Number(p.radius),
      x = s.x!,
      y = s.y!,
      scale = 110 / Math.max(R, Math.abs(x), Math.abs(y));
    const cx = 210,
      cy = 155;
    const px = cx + x * scale,
      py = cy - y * scale;
    const vs = (vectorView.velocityScale * 50) / Math.max(1, Number(p.speed)),
      as =
        (vectorView.accelerationScale * 45) /
        Math.max(1, Number(p.speed) ** 2 / R);
    return (
      <svg
        className="model-scene"
        viewBox="0 0 440 310"
        role="img"
        aria-label={`Точка (${f(x)}; ${f(y)}) м. Скорость (${f(s.vx!)}; ${f(s.vy!)}) м/с. Ускорение (${f(s.ax!)}; ${f(s.ay!)}) м/с².`}
      >
        <defs>
          <marker
            id="circle-v"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path d="M0 0L5 2.5L0 5" fill="#2563c5" />
          </marker>
          <marker
            id="circle-a"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path d="M0 0L5 2.5L0 5" fill="#a24b16" />
          </marker>
        </defs>
        <line x1="35" x2="410" y1={cy} y2={cy} stroke="#a0adbf" />
        <line x1={cx} x2={cx} y1="25" y2="285" stroke="#a0adbf" />
        <text x="410" y="149">
          x
        </text>
        <text x="218" y="25">
          y
        </text>
        <circle
          cx={cx}
          cy={cy}
          r={R * scale}
          stroke="#7893ba"
          strokeDasharray="4 4"
          fill="#edf3fe"
        />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="#91a6c6" />
        <circle cx={px} cy={py} r="7" fill="#245fc1" />
        {vectorView.velocity && Number(p.speed) > 0 && (
          <>
            <line
              x1={px}
              y1={py}
              x2={px + s.vx! * vs}
              y2={py - s.vy! * vs}
              stroke="#2563c5"
              strokeWidth="3"
              data-vector="velocity"
              markerEnd="url(#circle-v)"
            />
            {vectorView.labels && (
              <text
                data-vector-label="velocity"
                x={px + s.vx! * vs + 8}
                y={py - s.vy! * vs}
              >
                v
              </text>
            )}
          </>
        )}
        {vectorView.acceleration && s.acceleration !== 0 && (
          <>
            <line
              x1={px}
              y1={py}
              x2={px + s.ax! * as}
              y2={py - s.ay! * as}
              stroke="#a24b16"
              strokeWidth="2.5"
              data-vector="acceleration"
              markerEnd="url(#circle-a)"
            />
            {vectorView.labels && (
              <text
                data-vector-label="acceleration"
                x={px + s.ax! * as + 8}
                y={py - s.ay! * as}
              >
                a
              </text>
            )}
          </>
        )}
        <text x="25" y="305">
          Масштаб: {f(scale)} px/м · v: {f(vs)} px/(м/с) · a: {f(as)} px/(м/с²)
        </text>
      </svg>
    );
  }
  if (id === "measurements") {
    const values =
      manualValues ?? generateMeasurements(p as unknown as MeasurementParams);
    const stats = measurementStats(values);
    let min = Math.min(stats.lower, ...values),
      max = Math.max(stats.upper, ...values);
    if (min === max) {
      min -= 0.01;
      max += 0.01;
    }
    const x = (v: number) => 40 + ((v - min) / (max - min)) * 360;
    return (
      <>
        <svg
          className="model-scene measurement-scene"
          viewBox="0 0 440 160"
          role="img"
          aria-label={`Среднее ${f(stats.mean, 6)} м, полуширина интервала ${f(stats.halfWidth, 6)} м`}
        >
          <line x1="30" x2="415" y1="95" y2="95" stroke="#94a3b8" />
          <rect
            x={x(stats.lower)}
            y="80"
            width={Math.max(0, x(stats.upper) - x(stats.lower))}
            height="28"
            fill="#d4e4fc"
            stroke="#5a83bf"
          />
          {values.map((v, i) => (
            <circle
              key={i}
              cx={x(v)}
              cy={45 + (i % 3) * 9}
              r="4"
              fill="#2563c5"
            />
          ))}
          <line
            x1={x(stats.mean)}
            x2={x(stats.mean)}
            y1="30"
            y2="118"
            stroke="#a24b16"
            strokeWidth="2"
          />
          <text x="40" y="137">
            {f(min, 4)} м
          </text>
          <text x="400" y="137" textAnchor="end">
            {f(max, 4)} м
          </text>
          <text x="40" y="18">
            Точки — измерения · полоса — 95% интервал
          </text>
        </svg>
        <p className="measurement-result">{roundedMeasurement(stats)}</p>
        <p className="small muted">
          95% относится к методу построения интервалов при повторении серий. Это
          не вероятность для уже рассчитанного фиксированного интервала.
          {stats.s === 0
            ? " Нулевой разброс не доказывает идеальность прибора."
            : ""}
        </p>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Таблица данных"
        >
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Длина, м (исходные значения)</th>
              </tr>
            </thead>
            <tbody>
              {values.map((v, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{String(v).replace(".", ",")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (id === "gas") {
    const height = 60 + (s.volume! / 0.025) * 130,
      top = 235 - height;
    return (
      <svg
        className="model-scene"
        viewBox="0 0 440 290"
        role="img"
        aria-label={`Газ: ${f(s.volume! * 1000)} л, ${f(s.temperature!)} К, ${f(s.pressure! / 1000)} кПа`}
      >
        <path
          d="M95 35V235H270V35"
          fill="none"
          stroke="#637894"
          strokeWidth="5"
        />
        <rect x="98" y={top} width="169" height={height} fill="#deebfc" />
        <rect
          x="90"
          y={top - 7}
          width="185"
          height="13"
          rx="3"
          fill="#7b93b7"
        />
        <line
          x1="183"
          x2="183"
          y1="20"
          y2={top - 7}
          stroke="#7b93b7"
          strokeWidth="7"
        />
        <text x="180" y={top + height / 2} textAnchor="middle">
          {f(s.volume! * 1000)} л
        </text>
        <text x="300" y="90">
          {f(s.temperature!)} К
        </text>
        <text x="300" y="115">
          {f(s.pressure! / 1000)} кПа
        </text>
        <text x="300" y="150">
          ν = {f(Number(p.moles))} моль
        </text>
        {s.heat !== 0 && (
          <>
            <path
              d={
                s.heat! > 0
                  ? "M30 180H80L68 172M80 180L68 188"
                  : "M80 180H30L42 172M30 180L42 188"
              }
              stroke="#a24b16"
              strokeWidth="3"
              fill="none"
            />
            <text x="30" y="160">
              Q
            </text>
          </>
        )}
        <text x="95" y="270">
          Ход процесса: {f(phase * 100)}% (не физическое время)
        </text>
      </svg>
    );
  }
  if (id === "lightClock") {
    const L = Number(p.length),
      maxTravel = Number(p.beta) * 299792458 * s.labTick! * Number(p.ticks),
      scale = Math.min(110 / L, 310 / Math.max(0.01, maxTravel));
    const cy = 170;
    return (
      <div className="clock-panels">
        {[false, true].map((lab) => {
          const x = 45 + (lab ? s.x! : 0) * scale;
          const tickCount = Number(p.ticks);
          const pathPhases = Array.from(
            { length: Math.floor(phase * tickCount * 2 + 1e-10) + 1 },
            (_, i) => i / (tickCount * 2),
          );
          if (pathPhases.at(-1)! < phase - 1e-10) pathPhases.push(phase);
          const lightPath = pathPhases
            .map((value) => {
              const cycle = (value * tickCount) % 1;
              const height = L * (cycle < 0.5 ? 2 * cycle : 2 - 2 * cycle);
              return `${45 + (lab ? maxTravel * value : 0) * scale},${cy - height * scale}`;
            })
            .join(" ");
          return (
            <div key={String(lab)}>
              <h3>{lab ? "Лабораторная система" : "Система часов"}</h3>
              <svg
                viewBox="0 0 400 210"
                role="img"
                aria-label={`${lab ? "Лабораторное время" : "Время в системе часов"} ${f((lab ? s.labTime! : s.properTime!) * 1e9, 4)} нс`}
              >
                <line
                  x1={x - 19}
                  x2={x + 19}
                  y1={cy}
                  y2={cy}
                  stroke="#576b8b"
                  strokeWidth="5"
                />
                <line
                  x1={x - 19}
                  x2={x + 19}
                  y1={cy - L * scale}
                  y2={cy - L * scale}
                  stroke="#576b8b"
                  strokeWidth="5"
                />
                <polyline
                  data-testid={lab ? "light-path-lab" : "light-path-clock"}
                  points={lightPath}
                  fill="none"
                  stroke="#a77919"
                  strokeDasharray="4 3"
                />
                <circle cx={x} cy={cy - s.y! * scale} r="6" fill="#b18316" />
                <text x="25" y="30">
                  {f((lab ? s.labTime! : s.properTime!) * 1e9, 4)} нс
                </text>
                <text x="25" y="195">
                  Один масштаб: {f(scale)} px/м
                </text>
              </svg>
            </div>
          );
        })}
      </div>
    );
  }
  const closed = Boolean(p.closed);
  return (
    <svg
      className="model-scene"
      viewBox="0 0 440 260"
      role="img"
      aria-label={`Цепь ${closed ? "замкнута" : "разомкнута"}, ток ${f(s.current!, 4)} А`}
    >
      <path
        d="M90 115V50H180 M230 50H350V200H90V145"
        fill="none"
        stroke="#617895"
        strokeWidth="3"
      />
      <line
        x1="70"
        x2="110"
        y1="120"
        y2="120"
        stroke="#34577f"
        strokeWidth="3"
      />
      <line
        x1="78"
        x2="102"
        y1="138"
        y2="138"
        stroke="#34577f"
        strokeWidth="5"
      />
      <line
        x1="180"
        y1="50"
        x2="230"
        y2={closed ? "50" : "28"}
        stroke="#34577f"
        strokeWidth="3"
      />
      <circle cx="180" cy="50" r="4" fill="#34577f" />
      <circle cx="230" cy="50" r="4" fill="#34577f" />
      <rect
        x="336"
        y="100"
        width="28"
        height="65"
        fill="#e7effb"
        stroke="#34577f"
        strokeWidth="2"
      />
      <circle
        cx="220"
        cy="200"
        r="20"
        fill="white"
        stroke="#34577f"
        strokeWidth="2"
      />
      <text x="220" y="205" textAnchor="middle">
        A
      </text>
      <text x="30" y="165">
        {f(Number(p.voltage))} В
      </text>
      <text x="325" y="135" textAnchor="end">
        {f(Number(p.resistance))} Ом
      </text>
      <text x="195" y="242">
        I = {f(s.current!, 4)} А
      </text>
      {s.current !== 0 && (
        <path
          d="M270 50H310L300 44M310 50L300 56"
          stroke="#2563c5"
          strokeWidth="3"
          fill="none"
        />
      )}
      <text x="425" y="16" textAnchor="end">
        Условное направление тока
      </text>
    </svg>
  );
}
