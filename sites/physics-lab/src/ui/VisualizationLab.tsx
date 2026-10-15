import { studyModules } from "../studio/moduleCatalog";
import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../content/types";
import {
  figureControls,
  figureValues,
  figureSeries,
  measureFigure,
  visualizationExperimentSchema,
  type FigureSpec,
  type VisualizationExperiment,
  type VisualizationSample,
} from "../figures/experiment";
import { unitIds, unitTitle } from "../learning/review";
import { aiRequest } from "../studio/api";
import { AnatomyFigure } from "./AnatomyFigure";
import { VisualizationMeasurements } from "./VisualizationMeasurements";
import { StudyText } from "./StudyText";

export function VisualizationLab({
  figure,
  initial,
  data,
  writable,
  onUpdate,
  onBack,
}: {
  figure: FigureSpec;
  initial?: VisualizationExperiment;
  data: Workspace;
  writable: boolean;
  onUpdate: (data: Workspace) => Promise<boolean>;
  onBack: () => void;
}) {
  const [values, setValues] = useState(() => ({
    ...(initial?.samples[0].parameters ?? figureValues(figure)),
  }));
  const controls = figureControls(figure);
  const [vary, setVary] = useState(controls[0].id);
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [prediction, setPrediction] = useState("");
  const [observations, setObservations] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [selfReview, setSelfReview] = useState(false);
  const [samples, setSamples] = useState<VisualizationSample[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [advice, setAdvice] = useState("");
  const [asking, setAsking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => () => controller.current?.abort(), []);
  const ready = !!question.trim() && !!prediction.trim() && !saved && !saving;
  const sampleAt = (
    parameters: Record<string, number>,
  ): VisualizationSample => ({
    parameters: { ...parameters },
    readings: measureFigure(figure, parameters).map((r) => r.value),
    capturedAt: new Date().toISOString(),
  });
  function capture(series: boolean) {
    if (!ready) return;
    const points = series
      ? figureSeries(figure, values, vary)
      : [{ ...values }];
    if (samples.length + points.length > 200) {
      setMessage(
        "В одной записи можно сохранить до 200 измерений. Начните новое исследование.",
      );
      return;
    }
    setSamples((old) => [...old, ...points.map(sampleAt)]);
    setValues(points.at(-1)!);
    controller.current?.abort();
    controller.current = null;
    setAsking(false);
    setAdvice("");
    setMessage(
      series
        ? `Снята серия: ${points.length} состояний. Остальные параметры сохранены.`
        : "Показания записаны. Измените параметр и сравните результат.",
    );
  }
  async function save() {
    const parsed = visualizationExperimentSchema.safeParse({
      id: crypto.randomUUID(),
      modelVersion: 1,
      figureSnapshot: structuredClone(figure),
      topicId: topicId || null,
      question,
      prediction,
      samples,
      observations,
      conclusion,
      selfReview,
      createdAt: new Date().toISOString(),
      context: "playground",
    });
    if (!parsed.success) {
      setMessage(
        "Запишите вопрос, предположение, минимум два измерения, наблюдения и вывод.",
      );
      return;
    }
    if (latest.current.visualizationExperiments.length >= 2000) {
      setMessage("Достигнут предел: 2000 исследований визуализаций.");
      return;
    }
    setSaving(true);
    try {
      if (
        await onUpdate({
          ...latest.current,
          visualizationExperiments: [
            ...latest.current.visualizationExperiments,
            parsed.data,
          ],
        })
      ) {
        setSaved(true);
        setMessage("Исследование сохранено в результатах.");
      } else
        setMessage(
          "Не удалось сохранить исследование. Ваши записи остались здесь — повторите сохранение.",
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function explain() {
    setAsking(true);
    setAdvice("");
    const active = new AbortController();
    controller.current = active;
    try {
      const r = await aiRequest<{ text: string }>(
        "chat",
        {
          kind: "chat",
          context: JSON.stringify({
            title: figure.title,
            assumptions: figure.caption,
            controls,
            formulas:
              figure.mechanism === "custom"
                ? figure.scene!.readouts
                : figure.mechanism === "spring"
                  ? "F=k*(x/1000); E=k*(x/1000)^2/2; x в мм, k в Н/м"
                  : "F2=200/l; M=2 Н·м; l в см",
            question,
            prediction,
            measurementCount: samples.length,
            measurements: samples.flatMap((s, i) =>
              samples.length <= 50 ||
              i % Math.ceil(samples.length / 48) === 0 ||
              i === samples.length - 1
                ? [
                    {
                      number: i + 1,
                      parameters: s.parameters,
                      readings: s.readings,
                    },
                  ]
                : [],
            ),
            observations,
          }),
          messages: [
            {
              role: "user",
              content:
                "Объясни теорию и тенденции этой серии. Укажи, что менялось, что оставалось постоянным, ограничения модели и следующий полезный опыт. Не выдавай расчёт модели за реальное измерение и не пиши вывод от моего имени. Если формулы сомнительны, объясни почему.",
            },
          ],
        },
        active.signal,
      );
      if (controller.current === active) setAdvice(r.text);
    } catch (e) {
      if (controller.current === active)
        setAdvice(
          (e as Error).name === "AbortError"
            ? "Объяснение отменено."
            : (e as Error).message,
        );
    } finally {
      if (controller.current === active) setAsking(false);
    }
  }
  function reset() {
    controller.current?.abort();
    controller.current = null;
    setSamples([]);
    setPrediction("");
    setObservations("");
    setConclusion("");
    setSelfReview(false);
    setSaved(false);
    setAdvice("");
    setMessage("");
  }
  return (
    <section className="panel visualization-lab">
      <div className="row">
        <button onClick={onBack} disabled={saving}>
          К моим визуализациям
        </button>
        <span className="badge">Личное исследование</span>
      </div>
      <h2>Исследование: {figure.title}</h2>
      {initial && (
        <p className="callout">
          Новый опыт по сохранённому снимку. Прежние результаты остаются в
          истории; предположение и измерения запишите заново.
        </p>
      )}
      <p>
        Сформулируйте вопрос и предположение до первого измерения. Меняйте
        параметры, снимайте показания и сравнивайте состояния модели.
      </p>
      <section className="callout" aria-label="Условия исследования">
        <div>
          <strong>Текущие условия: </strong>
          {controls
            .map(
              (c) =>
                `${c.label}: ${values[c.id].toLocaleString("ru-RU", { maximumSignificantDigits: 6 })}`,
            )
            .join(" · ")}
        </div>
        <details>
          <summary>Что моделируем и при каких допущениях</summary>
          <p>{figure.caption}</p>
        </details>
      </section>
      {figure.sourcePrompt && (
        <details>
          <summary>Исходный промпт модели</summary>
          <p className="study-text">{figure.sourcePrompt}</p>
        </details>
      )}
      <div className="research-fields">
        <label>
          Вопрос исследования
          <textarea
            value={question}
            maxLength={4000}
            rows={2}
            disabled={!!samples.length || saving || saved}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Что вы хотите проверить и какой параметр будете менять?"
          />
        </label>
        <label>
          Моё предположение
          <textarea
            value={prediction}
            maxLength={4000}
            rows={2}
            disabled={!!samples.length || saving || saved}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="Как изменится результат и почему?"
          />
        </label>
        <label>
          Связать с модулем
          <select
            value={topicId}
            disabled={saving || saved}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">Свободное исследование</option>
            {unitIds.map((id) => (
              <option key={id} value={id}>
                {id} · {unitTitle(id)}
              </option>
            ))}
            {studyModules(data).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="visualization-controls" disabled={saving || saved}>
        <legend>Условия модели</legend>
        <AnatomyFigure
          figure={figure}
          values={values}
          onValuesChange={setValues}
        />
        <div className="row">
          <button onClick={() => capture(false)} disabled={!ready}>
            Снять показания
          </button>
          <label>
            Изменять в серии
            <select value={vary} onChange={(e) => setVary(e.target.value)}>
              {controls.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => capture(true)} disabled={!ready}>
            Снять серию
          </button>
        </div>
      </fieldset>
      <p className="small muted">
        Серия сравнивает до 11 значений одного параметра по всему диапазону с
        заданным шагом. Это расчёт по формулам модели; плавное изменение
        картинки само по себе не моделирует течение времени.
      </p>
      <VisualizationMeasurements figure={figure} samples={samples} />
      <div className="row">
        <button
          onClick={() => void explain()}
          disabled={!samples.length || asking}
        >
          Объяснить результаты с ИИ
        </button>
        {asking && (
          <button onClick={() => controller.current?.abort()}>
            Отменить объяснение
          </button>
        )}
      </div>
      <div role="status">
        {asking ? "Объясняем записанную серию…" : <StudyText text={advice} />}
      </div>
      <div className="research-fields">
        <label>
          Наблюдения исследования
          <textarea
            value={observations}
            maxLength={4000}
            rows={3}
            disabled={saving || saved}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Что показывают числа? Какие значения сравнили?"
          />
        </label>
        <label>
          Вывод исследования
          <textarea
            value={conclusion}
            maxLength={4000}
            rows={3}
            disabled={saving || saved}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Совпало ли предположение с результатом, при каких условиях?"
          />
        </label>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={selfReview}
          disabled={saving || saved}
          onChange={(e) => setSelfReview(e.target.checked)}
        />
        Я сопоставил предположение и измерения, указал условия применимости
      </label>
      <div className="row">
        <button
          className="primary"
          onClick={() => void save()}
          disabled={
            !writable ||
            saving ||
            saved ||
            samples.length < 2 ||
            !observations.trim() ||
            !conclusion.trim()
          }
        >
          Сохранить исследование
        </button>
        <button onClick={reset} disabled={saving || asking}>
          Начать новое исследование
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
