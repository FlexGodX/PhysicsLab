import { useState } from "react";
import {
  diagnosticQuestions,
  diagnosticFollowup,
  diagnosticResult,
} from "../content/diagnostics";
import type { DiagnosticResponse, Workspace } from "../content/types";
import { unitTitle, type UnitId } from "../learning/review";
export function Diagnostics({
  data,
  writable,
  onUpdate,
  onOpen,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  onOpen: (id: UnitId) => void;
}) {
  const [editing, setEditing] = useState(false),
    [started, setStarted] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(data.preferences?.mode ?? "sequential");
  const [minutes, setMinutes] = useState(data.preferences?.minutes ?? 20);
  const [examDate, setExamDate] = useState(data.preferences?.examDate ?? "");
  const [responses, setResponses] = useState<DiagnosticResponse[]>([]),
    [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"before" | "after">(
    data.diagnostics.length ? "after" : "before",
  );
  const q = diagnosticQuestions[responses.length] ?? diagnosticFollowup;
  async function start() {
    setBusy(true);
    if (
      await onUpdate({
        ...data,
        preferences: { mode, minutes, examDate: examDate || null },
      })
    ) {
      setResponses([]);
      setDone(false);
      setStarted(true);
    }
    setBusy(false);
  }
  async function respond(kind: DiagnosticResponse["kind"]) {
    if (busy || !writable) return;
    const next = [
      ...responses,
      {
        questionId: q.id,
        kind,
        answer: kind === "answer" ? answer : null,
        at: new Date().toISOString(),
      },
    ];
    // Correct meaning but incorrect calculation can have more than one cause: ask one extra item.
    const concepts = next.find((r) => r.questionId === "d-units");
    const calculation = next.find((r) => r.questionId === "d-speed");
    const clarify =
      concepts?.kind === "answer" &&
      concepts.answer === "м/с²" &&
      calculation?.kind === "answer" &&
      calculation.answer !== "6 м/с";
    if (next.length >= 8 && (!clarify || next.length === 9)) {
      setBusy(true);
      const saved = await onUpdate({
        ...data,
        diagnostics: [
          ...data.diagnostics,
          {
            id: crypto.randomUUID(),
            version: 1,
            phase,
            createdAt: new Date().toISOString(),
            responses: next,
          },
        ],
      });
      setBusy(false);
      if (!saved) return;
      setDone(true);
      setStarted(false);
    }
    setResponses(next);
    setAnswer("");
  }
  if (!editing)
    return (
      <section className="panel diagnostic-entry no-print">
        <div>
          <div className="eyebrow">ОТПРАВНАЯ ТОЧКА</div>
          <h2>
            {data.diagnostics.length
              ? "Вернуться к диагностике"
              : "С чего начать?"}
          </h2>
          <p>
            Восемь вопросов помогут выбрать тему. Можно пропускать вопросы и
            сразу открыть любой модуль.
          </p>
          {data.preferences && (
            <p className="small">
              Режим:{" "}
              {data.preferences.mode === "review"
                ? "повторить перед сдачей"
                : "разобраться последовательно"}{" "}
              · {data.preferences.minutes} мин
              {data.preferences.examDate
                ? ` · экзамен ${data.preferences.examDate}`
                : ""}
            </p>
          )}
        </div>
        <button onClick={() => setEditing(true)} disabled={!writable}>
          Пройти диагностику
        </button>
      </section>
    );
  return (
    <section className="panel diagnostic-entry no-print">
      <div className="panel-heading">
        <h2>
          {done
            ? "Отправная точка сохранена"
            : started
              ? `Диагностика · ${responses.length + 1}${responses.length < 8 ? " из 8" : " · уточнение"}`
              : "Настроим учебный сеанс"}
        </h2>
        <button
          onClick={() => {
            setEditing(false);
            setStarted(false);
          }}
        >
          К курсу
        </button>
      </div>
      {!started && !done && (
        <>
          <p>
            Данные останутся в этом браузере. Резервная копия доступна в
            настройках. Диагностика не подтверждает освоение модулей.
          </p>
          <div className="parameter-grid">
            <label>
              Как заниматься
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="sequential">Разобраться последовательно</option>
                <option value="review">Повторить перед сдачей</option>
              </select>
            </label>
            <label>
              Время сеанса
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                {[10, 15, 20, 25, 40, 60].map((n) => (
                  <option key={n} value={n}>
                    {n} минут
                  </option>
                ))}
              </select>
            </label>
            <label>
              Дата экзамена · необязательно
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </label>
            <label>
              Этап диагностики
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as typeof phase)}
              >
                <option value="before">До обучения</option>
                <option value="after">После обучения</option>
              </select>
            </label>
          </div>
          <button
            className="primary"
            disabled={busy || !writable}
            onClick={() => void start()}
          >
            Начать 8 вопросов
          </button>
        </>
      )}
      {started && (
        <>
          <h3>{q.prompt}</h3>
          <fieldset disabled={busy || !writable}>
            <legend className="sr-only">Диагностический ответ</legend>
            <div className="answers">
              {q.options.map((o) => (
                <label
                  key={o}
                  className={`answer ${answer === o ? "selected" : ""}`}
                >
                  <input
                    name="diagnostic-answer"
                    type="radio"
                    checked={answer === o}
                    onChange={() => setAnswer(o)}
                  />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="row">
            <button
              className="primary"
              disabled={!answer || busy || !writable}
              onClick={() => void respond("answer")}
            >
              Ответить
            </button>
            <button
              disabled={busy || !writable}
              onClick={() => void respond("unknown")}
            >
              Не знаю
            </button>
            <button
              disabled={busy || !writable}
              onClick={() => void respond("skip")}
            >
              Пропустить вопрос
            </button>
          </div>
        </>
      )}
      {done && (
        <>
          <p>
            Это ориентир для выбора темы. Самостоятельные проверки модулей
            учитываются отдельно.
          </p>
          <p>Нет данных: {responses.filter((r) => r.kind === "skip").length}</p>
          <p>
            Нужен разбор:{" "}
            {
              responses.filter(
                (r) =>
                  diagnosticResult(
                    [...diagnosticQuestions, diagnosticFollowup].find(
                      (q) => q.id === r.questionId,
                    )!,
                    r.answer,
                    r.kind,
                  ) === "gap",
              ).length
            }
          </p>
          {responses
            .filter((r) => r.kind !== "skip")
            .map((r) => {
              const q = [...diagnosticQuestions, diagnosticFollowup].find(
                (q) => q.id === r.questionId,
              )!;
              return (
                <div className="callout" key={r.questionId}>
                  <strong>{q.prompt}</strong>
                  <p>
                    {diagnosticResult(q, r.answer, r.kind) === "correct"
                      ? "Верно. "
                      : ""}
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          <button
            className="primary"
            onClick={() => {
              const gap = responses.find(
                (r) =>
                  r.kind !== "skip" &&
                  diagnosticResult(
                    [...diagnosticQuestions, diagnosticFollowup].find(
                      (q) => q.id === r.questionId,
                    )!,
                    r.answer,
                    r.kind,
                  ) === "gap",
              );
              onOpen(
                gap
                  ? [...diagnosticQuestions, diagnosticFollowup].find(
                      (q) => q.id === gap.questionId,
                    )!.unitId
                  : "K1",
              );
            }}
          >
            Открыть рекомендуемый модуль:{" "}
            {unitTitle(
              (() => {
                const gap = responses.find(
                  (r) =>
                    r.kind !== "skip" &&
                    diagnosticResult(
                      [...diagnosticQuestions, diagnosticFollowup].find(
                        (q) => q.id === r.questionId,
                      )!,
                      r.answer,
                      r.kind,
                    ) === "gap",
                );
                return gap
                  ? [...diagnosticQuestions, diagnosticFollowup].find(
                      (q) => q.id === gap.questionId,
                    )!.unitId
                  : "K1";
              })(),
            )}
          </button>
        </>
      )}
    </section>
  );
}
