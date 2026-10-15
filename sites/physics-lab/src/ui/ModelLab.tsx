import { useMemo, useState } from "react";
import { Play, Pause, SkipForward, RotateCcw, Save } from "lucide-react";
import {
  modelCatalog,
  modelSamples,
  evaluateModel,
  type ModelId,
  type ModelParams,
} from "../physics/catalog";
import { lightClockState, type LightClockParams } from "../physics/lightClock";
import { parseNumber, formatNumber as f } from "../physics/units";
import { usePlayback } from "./usePlayback";
import { modelAdvice } from "../learning/modelAdvice";
import { VelocityComparison } from "./VelocityComparison";
import type { CircularParams } from "../physics/circular";
import { Parameter } from "./Parameter";
import { ModelScene } from "./ModelScene";
import { VectorControls, defaultVectorView } from "./VectorControls";
import { XYGraph } from "./XYGraph";
import type { ModelExperiment } from "../content/types";
import { modelMetrics as metrics } from "../content/modelMetrics";
export function ModelLab({
  id,
  writable,
  onSave,
  mode = "playground",
  initial,
  previous,
}: {
  id: ModelId;
  writable: boolean;
  onSave: (e: ModelExperiment) => Promise<boolean>;
  mode?: "lesson" | "playground";
  initial?: ModelExperiment;
  previous?: ModelExperiment;
}) {
  const definition = modelCatalog[id];
  const [vectorView, setVectorView] = useState(defaultVectorView);
  const [params, setParams] = useState<ModelParams>(
    initial?.parameters ?? { ...definition.defaults },
  );
  const [manualValues, setManualValues] = useState<number[] | null>(
    initial?.manualValues ?? null,
  );
  const [source, setSource] = useState(
    initial?.manualValues ? "manual" : "virtual",
  );
  const [manualText, setManualText] = useState(
    initial?.manualValues?.join("; ") ?? "0,99; 1,00; 1,01",
  );
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [prediction, setPrediction] = useState("");
  const [observations, setObservations] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [selfReview, setSelfReview] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState(false);
  const [comparison, setComparison] = useState(previous);
  const duration =
    id === "circular" || id === "circuit"
      ? Math.max(1, Number(params.duration))
      : id === "lightClock"
        ? Number(params.ticks) * 4
        : 10;
  const playback = usePlayback(duration);
  const phase = playback.time / duration;
  const activePhase = id === "measurements" ? 1 : phase;
  const canRun = writable && (mode === "playground" || !!prediction.trim());
  const samples = useMemo(
    () => modelSamples(id, params, manualValues),
    [id, params, manualValues],
  );
  const values = evaluateModel(id, params, activePhase, manualValues);
  function change(next: ModelParams) {
    setComparison(previous);
    try {
      evaluateModel(id, next, 0, manualValues);
      playback.reset();
      setParams(next);
      setStarted(false);
      setSaved(false);
      setPrediction("");
      setObservations("");
      setConclusion("");
      setSelfReview(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Недопустимые параметры");
    }
  }
  function preset(next: ModelParams) {
    change({ ...definition.defaults, ...next });
    setRevision((v) => v + 1);
  }
  function resetMeasurements() {
    setManualValues(null);
    setManualText("0,99; 1,00; 1,01");
    setSource("virtual");
    preset({});
  }
  function seek(next: number) {
    if (!canRun) return;
    setStarted(true);
    setSaved(false);
    playback.seek(next * duration);
  }
  function manual() {
    const values = manualText.split(/[;\n]+/).map(parseNumber);
    if (values.some((v) => v === null)) {
      setError("Введите числа через точку с запятой или с новой строки.");
      return;
    }
    try {
      evaluateModel(id, params, 0, values as number[]);
      setManualValues(values as number[]);
      setStarted(true);
      setSaved(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Проверьте ряд");
    }
  }
  async function save() {
    setBusy(true);
    const experiment: ModelExperiment = {
      id: crypto.randomUUID(),
      modelId: id,
      modelVersion: id === "circular" ? 2 : 1,
      parameters: structuredClone(params),
      manualValues: manualValues ? [...manualValues] : null,
      samples: structuredClone(samples),
      prediction: prediction.trim(),
      observations: observations.trim(),
      conclusion: conclusion.trim(),
      selfReview,
      createdAt: new Date().toISOString(),
      context: mode,
    };
    if (await onSave(experiment)) setSaved(true);
    setBusy(false);
  }
  const concealLength =
    id === "measurements" &&
    mode === "lesson" &&
    !started &&
    source === "virtual";
  const condition = definition.parameters
    .filter((q) => !(concealLength && q.key === "length"))
    .filter(
      (q) =>
        id !== "gas" ||
        (params.process === "isothermal" ? q.key !== "T1" : q.key !== "ratio"),
    )
    .map((q) => `${q.label}: ${f(Number(params[q.key]) / (q.factor ?? 1), 5)}`)
    .join(" · ");
  const advice = modelAdvice(id, params, phase, source === "manual");
  return (
    <div className="lab-layout model-lab">
      <div className="lab-main">
        <section className="panel prediction-panel">
          <div className="eyebrow">УСЛОВИЕ ЭКСПЕРИМЕНТА</div>
          <h2>{definition.title}</h2>
          <p className="condition-values">{condition}</p>
          {concealLength && (
            <p>
              Истинная длина скрыта до вашего прогноза и получения измерений.
            </p>
          )}
          {id === "gas" && (
            <p>
              Выбран{" "}
              {params.process === "isochoric"
                ? "изохорный процесс: объём постоянен"
                : params.process === "isobaric"
                  ? "изобарный процесс: давление постоянно"
                  : "изотермический процесс: температура постоянна"}
              . Работа газа положительна при расширении.
            </p>
          )}
          {id === "circular" && (
            <p>
              Оси: вправо и вверх. Движение{" "}
              {params.direction === 1
                ? "против часовой стрелки"
                : "по часовой стрелке"}
              ;{" "}
              {params.releaseAt === null
                ? "удерживающая сила действует"
                : `отпускание при t = ${f(Number(params.releaseAt))} с`}
              .
            </p>
          )}
          {id === "circuit" && (
            <p>
              Цепь {params.closed ? "замкнута" : "разомкнута"}. Источник и
              провода идеальные; сопротивление постоянно.
            </p>
          )}
          <label>
            Мой прогноз
            <textarea
              aria-label="Мой прогноз"
              maxLength={4000}
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              disabled={started || !writable}
              placeholder={definition.question}
            />
          </label>
          <p className="small muted">
            {definition.question}{" "}
            {mode === "playground"
              ? "Прогноз необязателен для свободного запуска."
              : "Запишите прогноз перед запуском."}
          </p>
        </section>
        <section className="panel scene-panel">
          <div className="panel-heading">
            <h2>{definition.title}</h2>
            <span className="badge">
              {id === "measurements"
                ? source === "manual"
                  ? "Ручная серия"
                  : "Виртуальные данные"
                : playback.running
                  ? "Идёт демонстрация"
                  : "На паузе"}
            </span>
          </div>
          {id === "measurements" && (
            <div className="measurement-input">
              <label>
                Источник измерений
                <select
                  aria-label="Источник измерений"
                  value={source}
                  disabled={!writable}
                  onChange={(e) => {
                    change({ ...params });
                    setSource(e.target.value);
                    setManualValues(null);
                    setStarted(false);
                  }}
                >
                  <option value="virtual">Виртуальный прибор</option>
                  <option value="manual">Ручной ввод</option>
                </select>
              </label>
              {source === "manual" ? (
                <>
                  <label>
                    Серия измерений, м
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      maxLength={2000}
                    />
                  </label>
                  <button onClick={manual} disabled={!canRun}>
                    Рассчитать серию
                  </button>
                </>
              ) : (
                <div className="row">
                  <button
                    onClick={() => {
                      setStarted(true);
                      setSaved(false);
                    }}
                    disabled={!canRun}
                  >
                    Получить измерения
                  </button>
                  <button
                    disabled={!writable || Number(params.count) >= 20}
                    onClick={() =>
                      change({ ...params, count: Number(params.count) + 1 })
                    }
                  >
                    Добавить измерение
                  </button>
                  <button
                    disabled={!writable}
                    onClick={() => preset({ count: 5 })}
                  >
                    n = 5
                  </button>
                  <button
                    disabled={!writable}
                    onClick={() => preset({ count: 20 })}
                  >
                    n = 20
                  </button>
                  <button
                    disabled={!writable}
                    onClick={() => preset({ bias: 0.03 })}
                  >
                    Смещённый прибор
                  </button>
                  <button
                    disabled={!writable}
                    onClick={() => preset({ noise: 0.005 })}
                  >
                    Малый разброс
                  </button>
                  <button
                    disabled={!writable}
                    onClick={() => preset({ noise: 0.025 })}
                  >
                    Большой разброс
                  </button>
                </div>
              )}
              <button disabled={!writable} onClick={resetMeasurements}>
                <RotateCcw size={16} />
                Сбросить серию
              </button>
            </div>
          )}
          {id === "measurements" && mode === "lesson" && !started ? (
            <p className="callout">
              Запишите прогноз, затем получите или введите серию измерений.
            </p>
          ) : (
            <ModelScene
              id={id}
              params={params}
              values={values}
              phase={activePhase}
              manualValues={manualValues}
              vectorView={vectorView}
            />
          )}
          {id === "circular" && (
            <VectorControls value={vectorView} onChange={setVectorView} />
          )}
          <div
            className="model-metrics"
            hidden={id === "measurements" && mode === "lesson" && !started}
          >
            {metrics[id].map(([key, label, unit, factor]) => (
              <div key={key}>
                <span>{label}</span>
                <strong data-testid={`metric-${key}`}>
                  {values[key] === null
                    ? key === "period"
                      ? "Вращения нет"
                      : "Не определено"
                    : `${f(values[key]! * factor, id === "measurements" ? 6 : 3)} ${unit}`}
                </strong>
              </div>
            ))}
          </div>
          {id !== "measurements" && (
            <>
              <div className="playback">
                <button
                  className="primary"
                  disabled={!canRun || phase >= 1 || playback.reduced}
                  onClick={() => {
                    setStarted(true);
                    playback.setRunning(!playback.running);
                  }}
                >
                  {playback.running ? <Pause size={16} /> : <Play size={16} />}{" "}
                  {playback.running ? "Пауза" : "Запустить"}
                </button>
                <button
                  aria-label="Шаг модели"
                  disabled={!canRun || playback.running || phase >= 1}
                  onClick={() =>
                    seek(
                      Math.min(
                        1,
                        phase +
                          (id === "gas"
                            ? 0.05
                            : id === "lightClock"
                              ? 1 / (Number(params.ticks) * 2)
                              : id === "circuit"
                                ? 1 / duration
                                : 0.1 / duration),
                      ),
                    )
                  }
                >
                  <SkipForward size={16} />
                  Шаг
                </button>
                <button
                  aria-label="Сбросить модель"
                  disabled={!writable}
                  onClick={() => preset({})}
                >
                  <RotateCcw size={16} />
                </button>
                <label className="speed-label">
                  Темп
                  <select
                    value={playback.speed}
                    onChange={(e) => playback.setSpeed(Number(e.target.value))}
                  >
                    {id === "lightClock" || id === "circuit" ? (
                      <option value="0.5">0,5×</option>
                    ) : (
                      <option value="0.25">0,25×</option>
                    )}
                    <option value="1">1×</option>
                    <option value="2">2×</option>
                  </select>
                </label>
              </div>
              <label className="scrubber">
                {id === "gas"
                  ? "Ход процесса, %"
                  : id === "lightClock"
                    ? "Ход демонстрации, %"
                    : "Момент времени, с"}
                <input
                  type="range"
                  min="0"
                  max={
                    id === "gas" || id === "lightClock"
                      ? 100
                      : Number(params.duration)
                  }
                  step={id === "gas" ? 5 : id === "lightClock" ? 0.1 : 0.1}
                  value={
                    phase *
                    (id === "gas" || id === "lightClock"
                      ? 100
                      : Number(params.duration))
                  }
                  disabled={!canRun || playback.running}
                  onChange={(e) =>
                    seek(
                      Number(e.target.value) /
                        (id === "gas" || id === "lightClock"
                          ? 100
                          : Math.max(0.1, Number(params.duration))),
                    )
                  }
                />
              </label>
              <div className="row">
                <button
                  className="text-button"
                  disabled={!canRun || playback.running}
                  onClick={() => seek(1)}
                >
                  {id === "gas" ? "К концу процесса" : "К концу опыта"}
                </button>
                {id === "circular" && (
                  <button
                    disabled={!canRun || params.releaseAt !== null}
                    onClick={() => {
                      setParams({
                        ...params,
                        releaseAt: phase * Number(params.duration),
                      });
                      setStarted(true);
                      setSaved(false);
                    }}
                  >
                    Убрать удерживающую силу
                  </button>
                )}
              </div>
            </>
          )}
          {id === "lightClock" && (
            <div className="row clock-events">
              {lightClockState(
                params as unknown as LightClockParams,
                phase,
              ).events.map((event, i) => (
                <button
                  key={i}
                  onClick={() => seek(event.phase)}
                  disabled={!canRun}
                >
                  {event.name}
                  {Number(params.ticks) > 1 ? ` ${i}` : ""}
                </button>
              ))}
            </div>
          )}
        </section>
        <section
          className="panel model-graphs"
          hidden={id === "measurements" && mode === "lesson" && !started}
        >
          <h2>Связь величин</h2>
          {id === "circular" ? (
            <>
              {(["vx", "vy", "acceleration"] as const).map((field) => (
                <XYGraph
                  key={field}
                  label={
                    field === "acceleration"
                      ? "Модуль ускорения"
                      : `Скорость ${field}`
                  }
                  xLabel="t, с"
                  yLabel={field === "acceleration" ? "м/с²" : "м/с"}
                  points={samples.map((s) => ({
                    x: s.values.t!,
                    y: s.values[field]!,
                  }))}
                  current={{ x: values.t!, y: values[field]! }}
                />
              ))}
            </>
          ) : id === "gas" ? (
            <XYGraph
              label="Диаграмма p–V · площадь под кривой соответствует работе"
              xLabel="V, л"
              yLabel="p, кПа"
              shade
              points={samples
                .filter((s) => s.phase <= phase)
                .concat({ phase, values })
                .map((s) => ({
                  x: s.values.volume! * 1000,
                  y: s.values.pressure! / 1000,
                }))}
              current={{ x: values.volume! * 1000, y: values.pressure! / 1000 }}
            />
          ) : id === "lightClock" ? (
            <XYGraph
              label="Коэффициент Лоренца γ(β)"
              xLabel="β = v/c"
              yLabel="γ"
              points={Array.from({ length: 96 }, (_, i) => ({
                x: i / 100,
                y: 1 / Math.sqrt(1 - (i / 100) ** 2),
              }))}
              current={{ x: Number(params.beta), y: values.gamma! }}
            />
          ) : id === "circuit" ? (
            <>
              <XYGraph
                label={
                  params.closed
                    ? "Характеристика I(U)"
                    : "Справочная I(U) для замкнутой цепи"
                }
                xLabel="U, В"
                yLabel="I, А"
                points={[
                  { x: 0, y: 0 },
                  { x: 12, y: 12 / Number(params.resistance) },
                ]}
                current={{ x: Number(params.voltage), y: values.current! }}
              />
              <XYGraph
                label="Выделенная энергия E(t)"
                xLabel="t, с"
                yLabel="E, Дж"
                points={samples.map((s) => ({
                  x: s.values.t!,
                  y: s.values.energy!,
                }))}
                current={{ x: values.t!, y: values.energy! }}
              />
            </>
          ) : (
            <p>
              Среднее — положение центра серии; s — разброс отдельных измерений;
              s/√n — стандартная ошибка среднего. Полуширина интервала включает
              коэффициент Стьюдента. Совпадение измерений не исключает
              систематической ошибки.
            </p>
          )}
          {id === "circular" && (
            <VelocityComparison
              params={params as unknown as CircularParams}
              time={values.t!}
            />
          )}
          <details>
            <summary>Числовая таблица состояний</summary>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Таблица данных"
            >
              <table>
                <thead>
                  <tr>
                    <th>Ход</th>
                    {metrics[id].map(([key, label, unit]) => (
                      <th key={key}>
                        {label}, {unit}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {samples
                    .filter((_, i) => i % 10 === 0 || i === samples.length - 1)
                    .map((s) => (
                      <tr key={s.phase}>
                        <td>{f(s.phase * 100)}%</td>
                        {metrics[id].map(([key, , , factor]) => (
                          <td key={key}>
                            {s.values[key] === null
                              ? "—"
                              : f(s.values[key]! * factor, 5)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="panel">
          <h2>Ваши наблюдения и вывод</h2>
          <label>
            Мои наблюдения
            <textarea
              maxLength={4000}
              value={observations}
              onChange={(e) => {
                setObservations(e.target.value);
                setSaved(false);
              }}
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
              disabled={!started || !writable}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={selfReview}
              onChange={(e) => setSelfReview(e.target.checked)}
              disabled={!writable}
            />
            Я сопоставил прогноз, числа и закон — моя оценка
          </label>
          <div className="row">
            <button
              className="primary"
              onClick={() => void save()}
              disabled={
                !started ||
                playback.running ||
                activePhase < 1 ||
                !prediction.trim() ||
                !observations.trim() ||
                !conclusion.trim() ||
                saved ||
                busy ||
                !writable
              }
            >
              <Save size={16} />
              Сохранить опыт
            </button>
            <span role="status">
              {saved
                ? "Опыт сохранён."
                : "Для сохранения нужны прогноз, завершённый опыт, наблюдения и вывод."}
            </span>
          </div>
          <p className="small muted">
            Свободный вывод не оценивается автоматически.{" "}
            {mode === "playground"
              ? "Этот опыт сохраняется отдельно от подтверждения модуля."
              : ""}
          </p>
          {comparison && (
            <>
              <button onClick={() => setCompare(!compare)}>
                Сравнить с предыдущим опытом
              </button>
              {compare && (
                <div className="callout">
                  <p>{comparison.conclusion}</p>
                  {metrics[id].map(([key, label, unit, factor]) => (
                    <p key={key}>
                      {label}: было{" "}
                      {comparison.samples.at(-1)!.values[key] === null
                        ? "—"
                        : f(
                            comparison.samples.at(-1)!.values[key]! * factor,
                            4,
                          )}{" "}
                      {unit}, сейчас{" "}
                      {values[key] === null ? "—" : f(values[key]! * factor, 4)}{" "}
                      {unit}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <aside className="lab-aside">
        <section className="panel" key={revision}>
          <h2>Условия модели</h2>
          {id === "gas" && (
            <label>
              Процесс
              <select
                aria-label="Процесс"
                disabled={playback.running || !writable}
                value={String(params.process)}
                onChange={(e) => change({ ...params, process: e.target.value })}
              >
                <option value="isochoric">Изохорный · V постоянно</option>
                <option value="isobaric">Изобарный · p постоянно</option>
                <option value="isothermal">Изотермический · T постоянно</option>
              </select>
            </label>
          )}
          {id === "circular" && (
            <label>
              Направление
              <select
                value={String(params.direction)}
                disabled={playback.running || !writable}
                onChange={(e) =>
                  change({ ...params, direction: Number(e.target.value) })
                }
              >
                <option value="1">Против часовой стрелки</option>
                <option value="-1">По часовой стрелке</option>
              </select>
            </label>
          )}
          {id === "circuit" && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(params.closed)}
                disabled={playback.running || !writable}
                onChange={(e) =>
                  change({ ...params, closed: e.target.checked })
                }
              />
              Цепь замкнута
            </label>
          )}
          {definition.parameters
            .filter((q) => !(concealLength && q.key === "length"))
            .filter(
              (q) =>
                id !== "gas" ||
                (params.process === "isothermal"
                  ? q.key !== "T1"
                  : q.key !== "ratio"),
            )
            .map((q) => (
              <Parameter
                key={q.key}
                label={q.label}
                value={Number(params[q.key]) / (q.factor ?? 1)}
                min={q.min}
                max={q.max}
                step={q.step}
                integer={
                  q.key === "count" || q.key === "seed" || q.key === "ticks"
                }
                showRange={q.key !== "seed"}
                disabled={
                  playback.running ||
                  !writable ||
                  (id === "measurements" && source === "manual")
                }
                onChange={(v) =>
                  change({ ...params, [q.key]: v * (q.factor ?? 1) })
                }
              />
            ))}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="preset-buttons">
            {id === "gas" ? (
              <>
                <button
                  disabled={playback.running || !writable}
                  onClick={() => preset({ process: "isochoric" })}
                >
                  Жёсткий сосуд
                </button>
                <button
                  disabled={playback.running || !writable}
                  onClick={() => preset({ process: "isobaric" })}
                >
                  Постоянное давление
                </button>
                <button
                  disabled={playback.running || !writable}
                  onClick={() => preset({ process: "isothermal", ratio: 2 })}
                >
                  Изотермическое расширение
                </button>
                <button
                  disabled={playback.running || !writable}
                  onClick={() => preset({ process: "isothermal", ratio: 0.5 })}
                >
                  Сжатие
                </button>
              </>
            ) : id === "lightClock" ? (
              [0, 0.6, 0.8].map((beta) => (
                <button
                  key={beta}
                  disabled={playback.running || !writable}
                  onClick={() => preset({ beta })}
                >
                  β = {f(beta)}
                </button>
              ))
            ) : id === "circuit" ? (
              <>
                <button
                  disabled={playback.running || !writable}
                  onClick={() => preset({ voltage: 12 })}
                >
                  Удвоить U от старта
                </button>
                <button
                  disabled={playback.running || !writable}
                  onClick={() => preset({ resistance: 200 })}
                >
                  Удвоить R от старта
                </button>
              </>
            ) : null}
          </div>
        </section>
        <section
          className="panel contextual-theory"
          data-testid="contextual-theory"
        >
          <div className="eyebrow">ТЕОРИЯ ВАШЕГО ОПЫТА</div>
          <h3>Что объясняет модель</h3>
          <p>{advice}</p>
          <div className="advice-law">{definition.law}</div>
          <a href={definition.source} target="_blank" rel="noreferrer">
            Открыть источник ↗
          </a>
        </section>
        <section className="model-card">
          <h3>Границы применимости</h3>
          <p>{definition.assumptions}</p>
        </section>
      </aside>
    </div>
  );
}
