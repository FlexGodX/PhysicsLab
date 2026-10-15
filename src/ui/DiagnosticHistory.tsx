import type { DiagnosticRun } from "../content/types";
import {
  diagnosticQuestions,
  diagnosticFollowup,
  diagnosticResult,
} from "../content/diagnostics";
export function DiagnosticHistory({
  runs,
  selected,
  onSelect,
  demo,
}: {
  runs: DiagnosticRun[];
  selected: Set<string>;
  onSelect: (id: string) => void;
  demo: boolean;
}) {
  return (
    <>
      <h2>Диагностика до и после обучения</h2>
      <p>
        Эти ответы не входят в подтверждение модулей. Изменение результата само
        по себе не доказывает эффективность обучения.
      </p>
      {runs.length === 0 ? (
        <p>Диагностика ещё не пройдена.</p>
      ) : (
        [...runs]
          .reverse()
          .filter((r) => !demo || selected.has(r.id))
          .map((run) => (
            <article
              key={run.id}
              className={`panel result-card ${selected.has(run.id) ? "" : "excluded-print"}`}
            >
              <h3>
                {run.phase === "before" ? "До обучения" : "После обучения"} ·{" "}
                {new Date(run.createdAt).toLocaleString("ru-RU")}
              </h3>
              {!demo && (
                <label className="checkbox no-print">
                  <input
                    type="checkbox"
                    checked={selected.has(run.id)}
                    onChange={() => onSelect(run.id)}
                  />
                  Включить в отчёт
                </label>
              )}
              <p>
                Верно:{" "}
                {
                  run.responses.filter(
                    (r) =>
                      diagnosticResult(
                        [...diagnosticQuestions, diagnosticFollowup].find(
                          (q) => q.id === r.questionId,
                        )!,
                        r.answer,
                        r.kind,
                      ) === "correct",
                  ).length
                }{" "}
                · Основных вопросов: 8
                {run.responses.length > 8 ? " · 1 уточняющий" : ""} · Версия{" "}
                {run.version}
              </p>
              {run.responses.map((r) => {
                const q = [...diagnosticQuestions, diagnosticFollowup].find(
                  (q) => q.id === r.questionId,
                )!;
                return (
                  <div key={r.questionId}>
                    <h4>{q.prompt}</h4>
                    <p>
                      {r.kind === "skip"
                        ? "Пропущено — нет данных"
                        : r.kind === "unknown"
                          ? "Не знаю — нужен разбор"
                          : `${r.answer} — ${r.answer === q.answer ? "верно" : "нужен разбор"}`}
                    </p>
                  </div>
                );
              })}
            </article>
          ))
      )}
    </>
  );
}
