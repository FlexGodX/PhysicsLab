import { circularState, type CircularParams } from "../physics/circular";
import { formatNumber as f } from "../physics/units";
export function VelocityComparison({
  params,
  time,
}: {
  params: CircularParams;
  time: number;
}) {
  const t1 = Math.max(0, Math.min(time, params.duration - 0.1)),
    t2 = Math.min(params.duration, t1 + 0.1);
  const a = circularState(params, t1),
    b = circularState(params, t2),
    dx = b.vx - a.vx,
    dy = b.vy - a.vy;
  const scale = 70 / Math.max(1, params.speed),
    x = 130,
    y = 110;
  return (
    <div className="velocity-comparison">
      <h3>Почему меняется скорость</h3>
      <p>
        Векторы скорости в {f(t1)} с и {f(t2)} с совмещены началами. Стрелка Δv
        соединяет их концы.
      </p>
      <svg
        viewBox="0 0 300 210"
        role="img"
        aria-label={`Изменение скорости: Δvx=${f(dx, 4)} м/с, Δvy=${f(dy, 4)} м/с`}
      >
        <defs>
          <marker
            id="delta-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path d="M0 0L5 2.5L0 5" fill="#a24b16" />
          </marker>
        </defs>
        <line
          x1={x}
          y1={y}
          x2={x + a.vx * scale}
          y2={y - a.vy * scale}
          stroke="#245fc1"
          strokeWidth="3"
        />
        <line
          x1={x}
          y1={y}
          x2={x + b.vx * scale}
          y2={y - b.vy * scale}
          stroke="#28704d"
          strokeDasharray="5 3"
          strokeWidth="3"
        />
        {Math.hypot(dx, dy) > 1e-12 && (
          <line
            x1={x + a.vx * scale}
            y1={y - a.vy * scale}
            x2={x + b.vx * scale}
            y2={y - b.vy * scale}
            stroke="#a24b16"
            strokeWidth="2"
            markerEnd="url(#delta-arrow)"
          />
        )}
        <text x="15" y="180">
          v₁ — синяя · v₂ — пунктир · Δv — оранжевая
        </text>
        <text x="15" y="200">
          Масштаб всех стрелок: {f(scale)} px/(м/с)
        </text>
      </svg>
      <p>
        Δvx = {f(dx, 4)} м/с; Δvy = {f(dy, 4)} м/с.{" "}
        {Math.hypot(dx, dy) < 1e-12
          ? "Скорость на этом участке не меняется."
          : "При уменьшении интервала направление Δv стремится к направлению ускорения."}
      </p>
    </div>
  );
}
