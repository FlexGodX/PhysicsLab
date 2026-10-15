import { useState } from "react";
import { ArrowRight, Lightbulb, CheckCircle2, RotateCcw } from "lucide-react";
import { assessmentTasks, k1Tasks } from "../content/k1";
import {
  learningUnits,
  unitAssessmentTasks,
  type ExtraUnitId,
} from "../content/modules";
import { deriveUnitProgress } from "../learning/unitProgress";
import type { Attempt, TaskVariant } from "../content/types";
import { makeAttempt } from "../learning/assessment";
import { deriveProgress } from "../learning/progress";
export function Assessment({
  sequence,
  unitId = "K1",
  mode,
  round,
  writable,
  onAttempt,
  hintHistory,
  onHint,
}: {
  sequence?: TaskVariant[];
  unitId?: "K1" | ExtraUnitId;
  mode: "practice" | "assessment";
  round: number;
  writable: boolean;
  onAttempt: (a: Attempt) => Promise<boolean>;
  hintHistory: Record<string, number>;
  onHint: (key: string, count: number) => Promise<boolean>;
}) {
  const [session, setSession] = useState(() => crypto.randomUUID());
  const [currentRound, setRound] = useState(round);
  const [index, setIndex] = useState(0);
  const [practiceTemplate, setPracticeTemplate] = useState(
    unitId === "K1" ? "speed" : learningUnits[unitId].tasks[0].templateId,
  );
  const [localHints, setHints] = useState(0);
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState("м");
  const [result, setResult] = useState<Attempt | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const bank = unitId === "K1" ? k1Tasks : learningUnits[unitId].tasks;
  const tasks = sequence
    ? sequence.map((t) =>
        (currentRound - round) % 2 === 0
          ? t
          : bank.find((v) => v.templateId === t.templateId && v.id !== t.id)!,
      )
    : mode === "assessment"
      ? unitId === "K1"
        ? assessmentTasks(currentRound)
        : unitAssessmentTasks(unitId, currentRound)
      : [
          bank.find(
            (t) =>
              t.templateId === practiceTemplate &&
              t.id.endsWith(currentRound % 2 === 0 ? "-a" : "-b"),
          )!,
        ];
  const task = tasks[index];
  const hintKey = `${mode}:${currentRound}:${task.id}`;
  const hints = recovery ? 3 : Math.max(localHints, hintHistory[hintKey] ?? 0);
  async function revealHint() {
    setBusy(true);
    if (await onHint(hintKey, hints + 1)) setHints(hints + 1);
    setBusy(false);
  }
  function clear() {
    setAnswer("");
    setUnit("м");
    setResult(null);
    setHints(0);
  }
  function restart() {
    setRecovery(false);
    setSession(crypto.randomUUID());
    setRound((r) => r + 1);
    setIndex(0);
    setAttempts([]);
    setDone(false);
    clear();
  }
  async function submit() {
    if (result || busy) return;
    setBusy(true);
    const attempt = makeAttempt(
      task,
      answer,
      unit,
      hints,
      mode === "assessment" && !recovery ? session : null,
    );
    if (await onAttempt(attempt)) {
      setResult(attempt);
      setAttempts((a) => [...a, attempt]);
    }
    setBusy(false);
  }
  function next() {
    if (index === tasks.length - 1) setDone(true);
    else {
      setIndex((i) => i + 1);
      clear();
    }
  }
  if (done) {
    const progress =
      unitId === "K1"
        ? deriveProgress(attempts, [])
        : deriveUnitProgress(unitId, attempts, []);
    return (
      <section className="panel assessment-panel">
        <CheckCircle2 size={34} className="blue" />
        <h2>
          {mode === "practice"
            ? "Тренировка сохранена"
            : progress.demonstrated
              ? "Понимание подтверждено заданиями"
              : "Есть что повторить"}
        </h2>
        <p>
          Верно: {attempts.filter((a) => a.result.correct).length} из{" "}
          {tasks.length}.
        </p>
        <p>
          <strong>
            Баллы за эту попытку:{" "}
            {Math.round(
              (100 * attempts.filter((a) => a.result.correct).length) /
                tasks.length,
            )}{" "}
            / 100
          </strong>{" "}
          · Правильных ответов:{" "}
          {Math.round(
            (100 * attempts.filter((a) => a.result.correct).length) /
              tasks.length,
          )}
          %
        </p>
        {attempts.some((a) => a.hintsUsed > 0) && (
          <p className="callout">
            Вы использовали подсказку. Эта проверка остаётся учебной.
          </p>
        )}
        <p>
          {mode === "assessment"
            ? "Для подтверждения нужны 4 из 5, все критические задания и самостоятельное выполнение. Завершение маршрута также требует сохранённого опыта с выводом."
            : "Попробуйте другой вариант без подсказок, затем переходите к проверке."}
        </p>
        {mode === "assessment" && progress.demonstrated && (
          <p className="callout">
            Скачайте резервную копию после завершения маршрута — кнопка экспорта
            находится в верхней строке.
          </p>
        )}
        <button className="primary" onClick={restart} disabled={!writable}>
          <RotateCcw size={16} />
          Другой вариант
        </button>
      </section>
    );
  }
  return (
    <section className="panel assessment-panel">
      <div className="panel-heading">
        <span className="eyebrow">
          {mode === "practice"
            ? "САМОСТОЯТЕЛЬНАЯ ТРЕНИРОВКА"
            : `ПРОВЕРКА · ${index + 1} ИЗ 5`}
        </span>
        <span className="badge">
          {task.critical
            ? "Критическое задание"
            : task.kind === "prediction"
              ? "Прогноз"
              : task.kind === "calculation"
                ? "Расчёт"
                : "Понимание"}
        </span>
      </div>
      {mode === "practice" && !sequence && (
        <label>
          Тема тренировки
          <select
            aria-label="Тема тренировки"
            value={practiceTemplate}
            disabled={!writable}
            onChange={(e) => {
              setPracticeTemplate(e.target.value);
              setIndex(0);
              setAttempts([]);
              clear();
            }}
          >
            {unitId === "K1" ? (
              <>
                <option value="speed">Равномерное движение</option>
                <option value="stop">Остановка и ускорение</option>
                <option value="distance">Путь при разгоне</option>
              </>
            ) : (
              bank
                .filter((t) => t.id.endsWith("-a"))
                .map((t, i) => (
                  <option key={t.templateId} value={t.templateId}>
                    {i + 1}.{" "}
                    {t.kind === "calculation"
                      ? "Расчёт"
                      : t.kind === "prediction"
                        ? "Прогноз"
                        : t.kind === "units"
                          ? "Единицы"
                          : "Понимание"}{" "}
                    — {t.prompt.slice(0, 75)}
                  </option>
                ))
            )}
          </select>
        </label>
      )}
      {recovery && (
        <div className="callout">
          <strong>
            Восстановительная тренировка · без самостоятельного зачёта
          </strong>
          <p>Восстановите решение разобранного примера: {task.explanation}</p>
          <p>Затем вернитесь к полной проверке с другим вариантом.</p>
        </div>
      )}
      <h2>{task.prompt}</h2>
      <p className="muted">
        {mode === "practice"
          ? "Число и единица проверяются отдельно. Можно использовать десятичную запятую."
          : "Подсказка доступна, но переводит эту проверку в тренировочную."}
      </p>
      <fieldset disabled={!!result || !writable || busy}>
        <legend className="sr-only">Ответ</legend>
        {task.options ? (
          <div className="answers">
            {task.options.map((option) => (
              <label
                className={`answer ${answer === option ? "selected" : ""}`}
                key={option}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={answer === option}
                  onChange={() => setAnswer(option)}
                />
                {option}
              </label>
            ))}
          </div>
        ) : (
          <div className="answer-inputs">
            <label>
              Число
              <input
                inputMode="decimal"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Ваш ответ"
                maxLength={100}
              />
            </label>
            <label>
              Единица ответа
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {[
                  "м",
                  "см",
                  "км",
                  "м/с",
                  "км/ч",
                  "м/с²",
                  "с",
                  "1",
                  "рад/с",
                  "Дж",
                  "К",
                  "Па",
                  "кПа",
                  "л",
                  "м³",
                  "А",
                  "мА",
                  "В",
                  "Ом",
                  "Вт",
                  "Кл",
                  "нс",
                  "моль",
                ].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </fieldset>
      <div className="row">
        <button
          className="primary"
          disabled={!answer.trim() || !!result || busy || !writable}
          onClick={() => void submit()}
        >
          Проверить ответ <ArrowRight size={15} />
        </button>
        <button
          className="text-button"
          disabled={hints >= 3 || !!result || !writable || busy}
          onClick={() => void revealHint()}
        >
          <Lightbulb size={16} />
          Подсказка {hints}/3
        </button>
      </div>
      {hints > 0 && (
        <div className="callout">
          <strong>Подсказка {hints}</strong>
          <p>{task.hints[hints - 1]}</p>
          <small>Ответ будет сохранён как учебный.</small>
        </div>
      )}
      {result && (
        <div
          className={`feedback ${result.result.correct ? "correct" : "incorrect"}`}
          role="status"
        >
          <strong>
            {result.result.correct
              ? "Верно."
              : result.result.valueCorrect && !result.result.unitCorrect
                ? "Число верное. Проверьте единицу измерения."
                : !result.result.valueCorrect && result.result.unitCorrect
                  ? "Проверьте смысл величины и расчёт."
                  : "Проверьте число и единицу измерения."}
          </strong>
          <p>{task.explanation}</p>
          {!result.result.correct && (
            <p className="small">
              Попробуйте восстановить ход решения: {task.hints[0]} Затем решите
              новый вариант.
            </p>
          )}
          {recovery ? (
            <button onClick={restart}>
              Вернуться к проверке: новый вариант <ArrowRight size={15} />
            </button>
          ) : (
            <>
              {!result.result.correct && (
                <button
                  onClick={() => {
                    clear();
                    setRecovery(true);
                  }}
                >
                  Разобрать и потренироваться
                </button>
              )}
              <button onClick={next}>
                {index === tasks.length - 1
                  ? "Показать итог"
                  : "Следующее задание"}
                <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
