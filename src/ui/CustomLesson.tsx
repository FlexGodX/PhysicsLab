import { dayEntries, daySourceName } from "../content/day-plan/catalog";
import { findStudyModule } from "../studio/moduleCatalog";
import { useState } from "react";
import type { Workspace } from "../content/types";
import type { CustomModule } from "../studio/schema";
import { customScore } from "../studio/modules";
import { StudyText } from "./StudyText";
import { AnatomyFigure } from "./AnatomyFigure";
import {
  lmsEntries,
  lmsGroups,
  lmsSources,
  lmsVerifiedDate,
} from "../content/lms/catalog";
import type { ExtraUnitId } from "../content/modules";
export function CustomLesson({
  module: m,
  data,
  writable,
  onUpdate,
  onOpenRelated,
  onOpenTopic,
}: {
  module: CustomModule;
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  onOpenTopic?: (id: string) => void;
  onOpenRelated?: (id: "K1" | ExtraUnitId) => void;
}) {
  const dayIndex = dayEntries.findIndex((e) => e.module.id === m.id);
  const dayEntry = dayEntries[dayIndex];
  const entry = lmsEntries.find((e) => e.module.id === m.id);
  const [checking, setChecking] = useState(false),
    [answers, setAnswers] = useState<number[]>([]),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const read = data.customRead[m.id] ?? [],
    s = customScore(m, data.customRuns, read);
  async function mark(id: string, checked: boolean) {
    setBusy(true);
    const next = checked ? [...read, id] : read.filter((x) => x !== id);
    if (
      !(await onUpdate({
        ...data,
        customRead: { ...data.customRead, [m.id]: next },
      }))
    )
      setError("Не удалось сохранить отметку");
    setBusy(false);
  }
  async function submit() {
    setBusy(true);
    const r = {
      id: crypto.randomUUID(),
      moduleId: m.id,
      answers: [...answers],
      createdAt: new Date().toISOString(),
    };
    if (await onUpdate({ ...data, customRuns: [...data.customRuns, r] }))
      setDone(true);
    else setError("Не удалось сохранить проверку");
    setBusy(false);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {dayEntry
              ? "ПЛАН ПОДГОТОВКИ"
              : entry
                ? "КУРС ЮФУ"
                : "ЛИЧНЫЙ МОДУЛЬ"}{" "}
            · ВЕРСИЯ {m.version}
          </div>
          <h1>{m.title}</h1>
          <StudyText text={m.objective} />
        </div>
      </div>
      {dayEntry && (
        <section className="panel" data-testid="day-lesson-context">
          <p>
            Шаг {dayIndex + 1} из 10 · {dayEntry.minutes} мин · {daySourceName},
            с. {dayEntry.pages.join(", ")}
          </p>
          <p>
            Сначала решите и объясните самостоятельно, затем сверяйтесь.
            Автоматическая проверка тренирует выбор ответа; устный ответ и
            самооценка 0–24 в пробной пересдаче ведутся отдельно.
          </p>
          {onOpenTopic && (
            <>
              <div className="row no-print">
                {dayIndex > 0 && (
                  <button
                    onClick={() =>
                      onOpenTopic(dayEntries[dayIndex - 1].module.id)
                    }
                  >
                    Предыдущий блок
                  </button>
                )}
                {dayIndex < dayEntries.length - 1 && (
                  <button
                    onClick={() =>
                      onOpenTopic(dayEntries[dayIndex + 1].module.id)
                    }
                  >
                    Следующий блок
                  </button>
                )}
              </div>
              {dayEntry.relatedTopics.length > 0 && (
                <details>
                  <summary>Углубиться: полные темы курса</summary>
                  <div className="studio-fields">
                    {dayEntry.relatedTopics.map((id) => {
                      const topic = findStudyModule(data, id);
                      return (
                        topic && (
                          <button
                            key={id}
                            aria-label={`Полная тема: ${topic.title}`}
                            onClick={() => onOpenTopic(id)}
                          >
                            {topic.title}
                          </button>
                        )
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </section>
      )}
      {entry && (
        <section className="panel">
          <p>
            {lmsGroups.find((g) => g.id === entry.groupId)?.title} · Материалы
            сверены {lmsVerifiedDate}
          </p>
          <p>
            Учебная адаптация с собственной проверкой. Результат сохраняется в
            приложении отдельно от LMS.
          </p>
          {entry.relatedUnit && onOpenRelated && (
            <button onClick={() => onOpenRelated(entry.relatedUnit!)}>
              Открыть лабораторию по теме
            </button>
          )}
        </section>
      )}
      <section className="module-score">
        <div>
          <strong>Баллы: {s.points ?? "—"} / 100</strong>
          <small>
            {m.questions.length
              ? "Последняя завершённая проверка"
              : "Модуль чтения: без проверки знаний"}
          </small>
        </div>
        <div>
          <strong>Пройдено {s.completion}%</strong>
          <progress
            max={100}
            value={s.completion}
            aria-label="Прохождение модуля"
          />
        </div>
        <p>
          Прохождение: прочитанные разделы
          {m.questions.length ? " и проверка с результатом от 80%" : ""}. Эти
          показатели относятся только к данному материалу.
        </p>
      </section>
      <div className="row no-print">
        <button onClick={() => setChecking(false)} aria-pressed={!checking}>
          Материал модуля
        </button>
        {m.questions.length > 0 && (
          <button onClick={() => setChecking(true)} aria-pressed={checking}>
            Проверка модуля
          </button>
        )}
      </div>
      {!checking ? (
        <>
          <section className="panel">
            {m.sections.map((section) => (
              <article key={section.id}>
                <h2>{section.title}</h2>
                <StudyText text={section.body} />
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={read.includes(section.id)}
                    disabled={!writable || busy}
                    onChange={(e) => void mark(section.id, e.target.checked)}
                  />
                  Раздел прочитан
                </label>
              </article>
            ))}
            {m.example && (
              <>
                <h2>Разобранный пример</h2>
                <StudyText text={m.example} />
              </>
            )}
          </section>
          {m.visualizations.map((v, i) => (
            <AnatomyFigure key={i} figure={v} />
          ))}
          <section className="panel study-sources">
            <h2>Источник материала</h2>
            <p>
              {m.source.name} ·{" "}
              {entry
                ? "Учебная адаптация"
                : dayEntry
                  ? "Маршрут подготовки по PDF"
                  : m.source.provider || "Локальный импорт"}{" "}
              · {new Date(m.createdAt).toLocaleString("ru-RU")}
            </p>
            {entry && (
              <ul>
                {entry.sourceIds.map((id) => {
                  const source = lmsSources.find((s) => s.id === id)!;
                  return (
                    <li key={id}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title}
                      </a>{" "}
                      · {source.kind === "resource" ? "файл" : "лекция"}
                    </li>
                  );
                })}
              </ul>
            )}
            <details>
              <summary>{entry ? "О материалах" : "Исходный текст"}</summary>
              <StudyText text={m.source.text} />
            </details>
          </section>
        </>
      ) : (
        <section className="panel">
          <h2>Проверка понимания</h2>
          {m.questions.map((q, i) => (
            <fieldset key={q.id} disabled={!writable || busy || done}>
              <legend>{q.prompt}</legend>
              {q.options.map((o, j) => (
                <label className="answer" key={j}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[i] === j}
                    onChange={() =>
                      setAnswers((a) => {
                        const n = [...a];
                        n[i] = j;
                        return n;
                      })
                    }
                  />
                  {o}
                </label>
              ))}
              {done && (
                <div className="callout">
                  <strong>
                    {answers[i] === q.correctIndex
                      ? "Верно."
                      : "Нужно повторить."}
                  </strong>
                  <StudyText text={q.explanation} />
                </div>
              )}
            </fieldset>
          ))}
          {done ? (
            <>
              <p role="status">Баллы: {s.points} / 100</p>
              <button
                onClick={() => {
                  setAnswers([]);
                  setDone(false);
                }}
              >
                Пройти ещё раз
              </button>
            </>
          ) : (
            <button
              className="primary"
              disabled={
                !writable ||
                busy ||
                m.questions.some((_, i) => answers[i] === undefined)
              }
              onClick={() => void submit()}
            >
              Завершить проверку
            </button>
          )}
        </section>
      )}
      <p role="status">{error}</p>
    </>
  );
}
