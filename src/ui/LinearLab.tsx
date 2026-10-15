import { useMemo, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Save,
  ArrowRight,
} from "lucide-react";
import {
  defaultLinear,
  linearPresets,
  linearSamples,
  linearState,
} from "../physics/linear";
import type { LinearParams } from "../physics/linear";
import type { Experiment } from "../content/types";
import { formatNumber as f } from "../physics/units";
import { usePlayback } from "./usePlayback";
import { Graph } from "./Graph";
import { linearAdvice } from "../learning/experimentAdvice";
import { Parameter } from "./Parameter";
import { VectorControls, defaultVectorView } from "./VectorControls";
export function LinearLab({
  writable,
  onSave,
  previous,
  initial,
  mode = "lesson",
}: {
  writable: boolean;
  onSave: (e: Experiment) => Promise<boolean>;
  previous?: Experiment;
  initial?: LinearParams;
  mode?: "lesson" | "playground";
}) {
  const [params, setParams] = useState<LinearParams>(
    initial ?? { ...defaultLinear },
  );
  const [vectorView, setVectorView] = useState(defaultVectorView);
  const [revision, setRevision] = useState(0);
  const playback = usePlayback(params.duration);
  const { time, running, seek, reset } = playback;
  const [prediction, setPrediction] = useState("");
  const [observations, setObservations] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [selfReview, setSelfReview] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compare, setCompare] = useState(false);
  const [comparison, setComparison] = useState(previous);
  const samples = useMemo(() => linearSamples(params), [params]);
  const state = linearState(params, time);
  const lo = Math.min(0, ...samples.map((s) => s.x)) - 4,
    hi = Math.max(1, ...samples.map((s) => s.x)) + 4;
  const px = (x: number) => 110 + ((x - lo) / (hi - lo)) * 490;
  const vScale =
    (vectorView.velocityScale * 75) /
    Math.max(1, ...samples.map((s) => Math.abs(s.v)));
  const aScale =
    (vectorView.accelerationScale * 50) / Math.max(1, Math.abs(params.a));
  const canRun = (mode === "playground" || !!prediction.trim()) && writable;
  const advice = linearAdvice(params);
  const signed = (n: number) => f(n).replace("-", "−");
  function change(p: LinearParams) {
    setComparison(previous);
    reset();
    setParams(p);
    setStarted(false);
    setSaved(false);
    setPrediction("");
    setObservations("");
    setConclusion("");
    setSelfReview(false);
  }
  function go(t: number) {
    setStarted(true);
    setSaved(false);
    seek(t);
  }
  async function save() {
    setSaving(true);
    const e: Experiment = {
      id: crypto.randomUUID(),
      simulationId: "L1",
      modelVersion: 1,
      parameterSnapshot: { ...params },
      samples: samples.filter(
        (s, i) =>
          i % 8 === 0 ||
          i === samples.length - 1 ||
          (params.a !== 0 && s.t === -params.v0 / params.a),
      ),
      prediction: prediction.trim(),
      observations: observations.trim(),
      conclusion: conclusion.trim(),
      selfReview,
      createdAt: new Date().toISOString(),
      sourceKind: "virtual",
      context: mode,
    };
    if (await onSave(e)) setSaved(true);
    setSaving(false);
  }
  return (
    <div className="lab-layout">
      <div className="lab-main">
        <section className="panel prediction-panel">
          <div className="eyebrow">
            {mode === "lesson"
              ? "01 / УСЛОВИЕ ОПЫТА"
              : "УСЛОВИЯ ВАШЕГО ЭКСПЕРИМЕНТА"}
          </div>
          <div
            className="experiment-condition"
            data-testid="experiment-condition"
          >
            <h2>
              {params.v0 === 0
                ? "Тележка начинает движение из покоя"
                : "Тележка движется вдоль прямой"}
            </h2>
            <p>
              В начальный момент тележка находится в точке{" "}
              <strong>x₀ = {signed(params.x0)} м</strong>, её начальная скорость{" "}
              {signed(params.v0)} м/с. На протяжении {f(params.duration)} с
              действует постоянное ускорение {signed(params.a)} м/с².
            </p>
            <p className="small muted">
              Ось направлена вправо: положительная скорость — движение вправо,
              отрицательная — влево. Столкновений и сопротивления нет.
            </p>
          </div>
          <label htmlFor="prediction">
            Какой путь пройдёт тележка за {f(params.duration)} с и какой будет
            её скорость в конце?
          </label>
          <p className="muted">
            {mode === "lesson"
              ? "Запишите предполагаемые значения с единицами и объясните, почему вы так думаете. Затем проверьте их в опыте."
              : "Можно запустить опыт сразу. Если хотите сохранить прогноз и сравнить его с результатом, запишите его до запуска."}
          </p>
          <textarea
            id="prediction"
            aria-label="Мой прогноз"
            placeholder="Я думаю, что…"
            maxLength={4000}
            value={prediction}
            disabled={started || !writable}
            onChange={(e) => setPrediction(e.target.value)}
          />
          {started && (
            <small>
              Прогноз зафиксирован. Чтобы изменить условия и прогноз, начните
              новый опыт.
            </small>
          )}
        </section>
        <section className="panel scene-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">L1 / ДВИЖЕНИЕ ПО ПРЯМОЙ</div>
              <h2>Посмотрите, как меняется движение</h2>
            </div>
            <span className="badge">
              {running
                ? "Идёт опыт"
                : time >= params.duration
                  ? "Опыт завершён"
                  : "На паузе"}
            </span>
          </div>
          <div className="scene">
            <svg
              viewBox="0 0 720 230"
              role="img"
              aria-label={`Тележка на оси: координата ${f(state.x)} м, скорость ${f(state.v)} м/с, ускорение ${f(state.a)} м/с²`}
            >
              <defs>
                <pattern
                  id="scene-grid"
                  width="30"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M30 0H0V30"
                    fill="none"
                    stroke="#e4e9f0"
                    strokeWidth=".7"
                  />
                </pattern>
                <marker
                  id="arrow-v"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6" fill="#2563c5" />
                </marker>
                <marker
                  id="arrow-a"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6" fill="#a24b16" />
                </marker>
              </defs>
              <rect width="720" height="230" fill="url(#scene-grid)" />
              <line
                x1="40"
                x2="680"
                y1="170"
                y2="170"
                stroke="#7b8798"
                strokeWidth="1.5"
              />
              {Array.from({ length: 6 }, (_, i) => {
                const n = lo + ((hi - lo) * i) / 5;
                return (
                  <g key={i}>
                    <line
                      x1={px(n)}
                      x2={px(n)}
                      y1="166"
                      y2="175"
                      stroke="#7b8798"
                    />
                    <text x={px(n)} y="194" textAnchor="middle">
                      {f(n, 1)}
                    </text>
                  </g>
                );
              })}
              <text x="685" y="190">
                x, м
              </text>
              <line
                x1={px(params.x0)}
                x2={px(state.x)}
                y1="169"
                y2="169"
                stroke="#2563c5"
                strokeWidth="4"
                opacity=".4"
              />
              {samples
                .filter((s, i) => s.t <= time && i % 16 === 0)
                .map((s) => (
                  <circle
                    key={s.t}
                    cx={px(s.x)}
                    cy="157"
                    r="2.5"
                    fill="#8ba9da"
                  />
                ))}
              <g transform={`translate(${px(state.x)},135)`}>
                <rect
                  x="-17"
                  y="-12"
                  width="34"
                  height="22"
                  rx="5"
                  fill="#2563c5"
                />
                <circle cx="-10" cy="13" r="5" fill="#24334a" />
                <circle cx="10" cy="13" r="5" fill="#24334a" />
                <rect
                  x="-9"
                  y="-19"
                  width="18"
                  height="7"
                  rx="2"
                  fill="#a5c5f5"
                />
              </g>
              {vectorView.velocity && state.v !== 0 && (
                <line
                  x1={px(state.x)}
                  x2={px(state.x) + state.v * vScale}
                  y1="97"
                  y2="97"
                  stroke="#2563c5"
                  strokeWidth="2.5"
                  data-vector="velocity"
                  markerEnd="url(#arrow-v)"
                />
              )}
              {vectorView.labels && (
                <text
                  data-vector-label="velocity"
                  x={px(state.x)}
                  y="83"
                  textAnchor="middle"
                  fill="#2563c5"
                >
                  v = {f(state.v)} м/с
                </text>
              )}
              {vectorView.acceleration && state.a !== 0 && (
                <line
                  x1={px(state.x)}
                  x2={px(state.x) + state.a * aScale}
                  y1="49"
                  y2="49"
                  stroke="#a24b16"
                  strokeWidth="2"
                  data-vector="acceleration"
                  markerEnd="url(#arrow-a)"
                />
              )}
              {vectorView.labels && (
                <text
                  data-vector-label="acceleration"
                  x={px(state.x)}
                  y="34"
                  textAnchor="middle"
                  fill="#a24b16"
                >
                  a = {f(state.a)} м/с²
                </text>
              )}
              <text x="40" y="220">
                Положение: автоматический масштаб · v: {f(vScale)} px/(м/с) · a:{" "}
                {f(aScale)} px/(м/с²)
              </text>
            </svg>
          </div>
          <VectorControls value={vectorView} onChange={setVectorView} />
          <div className="metrics">
            <div>
              <span>Координата x</span>
              <strong>
                {f(state.x)} <small>м</small>
              </strong>
            </div>
            <div>
              <span>Скорость v</span>
              <strong data-testid="velocity-value">{f(state.v)} м/с</strong>
            </div>
            <div>
              <span>Путь s</span>
              <strong data-testid="distance-value">
                {f(state.distance)} м
              </strong>
            </div>
            <div>
              <span>Перемещение Δx</span>
              <strong>
                {f(state.displacement)} <small>м</small>
              </strong>
            </div>
          </div>
          <div className="playback">
            <button
              className="primary"
              disabled={!canRun || time >= params.duration || playback.reduced}
              onClick={() => {
                setStarted(true);
                playback.setRunning(!running);
              }}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}{" "}
              {running ? "Пауза" : "Запустить"}
            </button>
            <button
              aria-label="Шаг 0,1 секунды"
              disabled={!canRun || running || time >= params.duration}
              onClick={() =>
                go(Math.min(params.duration, Number((time + 0.1).toFixed(8))))
              }
            >
              <SkipForward size={17} />
              <span>Шаг 0,1 с</span>
            </button>
            <button
              aria-label="Сбросить опыт"
              disabled={!writable}
              onClick={() => {
                change({ ...defaultLinear });
                setRevision((r) => r + 1);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <label className="speed-label">
              Темп{" "}
              <select
                aria-label="Темп воспроизведения"
                value={playback.speed}
                onChange={(e) => playback.setSpeed(Number(e.target.value))}
              >
                <option value="0.25">0,25×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
              </select>
            </label>
            <output className="time">
              {f(time, 1)} / {f(params.duration)} с
            </output>
          </div>
          <label className="scrubber">
            Момент времени
            <input
              aria-label="Момент времени"
              type="range"
              min="0"
              max={params.duration}
              step="0.1"
              value={time}
              disabled={!canRun || running}
              onChange={(e) => go(Number(e.target.value))}
            />
          </label>
          <div className="lab-bottom">
            <small>
              {!canRun
                ? "Сначала запишите прогноз."
                : playback.reduced
                  ? "Уменьшение анимации: используйте шаги и выбор времени."
                  : "Модель рассчитывает движение точно в выбранный момент."}
            </small>
            <button
              className="text-button"
              disabled={!canRun || running}
              onClick={() => go(params.duration)}
            >
              К концу опыта <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Одно движение — три графика</h2>
            <span className="muted">Общий момент: {f(time, 1)} с</span>
          </div>
          <div className="graphs">
            {(["x", "v", "a"] as const).map((field, i) => (
              <Graph
                key={field}
                field={field}
                label={
                  ["Координата x(t)", "Скорость v(t)", "Ускорение a(t)"][i]
                }
                unit={["м", "м/с", "м/с²"][i]}
                samples={samples}
                current={state}
              />
            ))}
          </div>
          <p className="note">
            Площадь под v(t) с учётом знака — перемещение. Для пути складывайте
            модули площадей; при развороте это разные величины.
          </p>
          <details>
            <summary>Таблица по секундам</summary>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Таблица данных"
            >
              <table>
                <thead>
                  <tr>
                    <th>t, с</th>
                    <th>x, м</th>
                    <th>v, м/с</th>
                    <th>Путь, м</th>
                    <th>За последнюю секунду, м</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    { length: Math.floor(params.duration) + 1 },
                    (_, t) => {
                      const s = linearState(params, t);
                      return (
                        <tr key={t}>
                          <td>{t}</td>
                          <td>{f(s.x)}</td>
                          <td>{f(s.v)}</td>
                          <td>{f(s.distance)}</td>
                          <td>
                            {t
                              ? f(
                                  s.distance -
                                    linearState(params, t - 1).distance,
                                )
                              : "—"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="panel">
          <div className="eyebrow">02 / НАБЛЮДЕНИЕ И ВЫВОД</div>
          <h2>Что показал ваш опыт?</h2>
          <label>
            Мои наблюдения
            <textarea
              maxLength={4000}
              value={observations}
              onChange={(e) => {
                setObservations(e.target.value);
                setSaved(false);
              }}
              placeholder="Какие значения получились? Совпал ли прогноз?"
              disabled={!started || !writable}
            />
          </label>
          <label>
            Мой вывод
            <textarea
              maxLength={4000}
              value={conclusion}
              onChange={(e) => {
                setConclusion(e.target.value);
                setSaved(false);
              }}
              placeholder="Объясните связь между ускорением, скоростью и путём."
              disabled={!started || !writable}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={selfReview}
              disabled={!writable}
              onChange={(e) => setSelfReview(e.target.checked)}
            />
            Моя оценка: я сравнил прогноз с числами и объяснил результат
          </label>
          <div className="row">
            <button
              className="primary"
              onClick={() => void save()}
              disabled={
                running ||
                time < params.duration ||
                !observations.trim() ||
                !conclusion.trim() ||
                !prediction.trim() ||
                saved ||
                saving ||
                !writable
              }
            >
              <Save size={16} />
              Сохранить опыт
            </button>
            <span role="status">
              {saved
                ? "Опыт сохранён."
                : time < params.duration
                  ? "Завершите опыт, чтобы сохранить итог."
                  : ""}
            </span>
          </div>
          <p className="muted small">
            Числа проверяются по модели. Свободный вывод записан вами и
            автоматически не оценивается.
          </p>
          {comparison && (
            <>
              <button
                className="text-button"
                onClick={() => setCompare(!compare)}
              >
                Сравнить с предыдущим опытом
              </button>
              {compare && (
                <div className="callout">
                  <strong>
                    Предыдущий опыт ·{" "}
                    {new Date(comparison.createdAt).toLocaleDateString("ru-RU")}
                  </strong>
                  <p>
                    v₀ = {f(comparison.parameterSnapshot.v0)} м/с · a ={" "}
                    {f(comparison.parameterSnapshot.a)} м/с² · t ={" "}
                    {f(comparison.parameterSnapshot.duration)} с
                  </p>
                  <p>
                    Путь: {f(comparison.samples.at(-1)!.distance)} м. Сейчас:{" "}
                    {f(state.distance)} м.
                  </p>
                  <p>{comparison.conclusion}</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <aside className="lab-aside">
        {mode === "playground" && (
          <section
            className="panel contextual-theory"
            data-testid="contextual-theory"
          >
            <div className="eyebrow">ТЕОРИЯ ВАШЕГО ОПЫТА</div>
            <h3>{advice.title}</h3>
            <p>{advice.explanation}</p>
            <div className="advice-law">{advice.law}</div>
            <strong>Что попробовать</strong>
            <p>{advice.next}</p>
          </section>
        )}
        <section className="panel">
          <div className="eyebrow">УСЛОВИЯ ОПЫТА</div>
          <h2>Параметры</h2>
          <label>
            Сценарий
            <select
              aria-label="Сценарий"
              disabled={running || !writable}
              value={
                Object.entries(linearPresets).find(
                  ([, p]) => JSON.stringify(p) === JSON.stringify(params),
                )?.[0] ?? "Свой опыт"
              }
              onChange={(e) => {
                change({ ...linearPresets[e.target.value] });
                setRevision((r) => r + 1);
              }}
            >
              <option disabled>Свой опыт</option>
              {Object.keys(linearPresets).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <div key={revision}>
            {(
              [
                ["x0", "Начальная координата x₀, м", -20, 20, 1],
                ["v0", "Начальная скорость v₀, м/с", -10, 10, 0.5],
                ["a", "Ускорение a, м/с²", -5, 5, 0.5],
                ["duration", "Длительность, с", 1, 10, 1],
              ] as const
            ).map(([key, label, min, max, step]) => (
              <Parameter
                key={key}
                label={label}
                min={min}
                max={max}
                step={step}
                value={params[key]}
                disabled={running || !writable}
                onChange={(v) => change({ ...params, [key]: v })}
              />
            ))}
          </div>
          <p className="muted small">
            Изменение условий начинает новый опыт. Во время движения параметры
            заблокированы.
          </p>
        </section>
        <section className="model-card">
          <span className="eyebrow">ГРАНИЦЫ МОДЕЛИ</span>
          <h3>Одна прямая. Постоянное ускорение.</h3>
          <p>
            Тележка — материальная точка. Ось направлена вправо. Сопротивление,
            столкновения и причины ускорения здесь не моделируются.
          </p>
          <details>
            <summary>Как читать стрелки</summary>
            <p>
              v показывает направление скорости, a — её изменения. Масштабы
              разные и подписаны под сценой. Нулевая величина не имеет стрелки.
            </p>
          </details>
        </section>
      </aside>
    </div>
  );
}
