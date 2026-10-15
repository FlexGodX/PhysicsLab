import { useState } from "react";
import { Assessment } from "./Assessment";
import { k1Tasks } from "../content/k1";
import type { TaskVariant } from "../content/types";
import type { Workspace } from "../content/types";
import {
  reviewQueue,
  unitIds,
  unitTitle,
  type UnitId,
  allProgress,
} from "../learning/review";
import { learningUnits } from "../content/modules";
export function ReviewPanel({
  data,
  onOpen,
  writable,
  onUpdate,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  onOpen: (id: UnitId) => void;
}) {
  const [quick, setQuick] = useState<{
    id: UnitId;
    tasks: TaskVariant[];
    key: number;
  } | null>(null);
  function openQuick(id: UnitId) {
    const bank = id === "K1" ? k1Tasks : learningUnits[id].tasks;
    const pick = (kind: TaskVariant["kind"]) => {
      const failed = [...data.attempts]
        .reverse()
        .find(
          (a) =>
            !a.result.correct &&
            bank.some((t) => t.id === a.taskId && t.kind === kind) &&
            !data.attempts.some(
              (b) =>
                b.submittedAt > a.submittedAt &&
                b.taskSnapshot.templateId === a.taskSnapshot.templateId &&
                b.result.correct &&
                !b.hintsUsed,
            ),
        );
      const first = (
        failed
          ? bank.find((t) => t.templateId === failed.taskSnapshot.templateId)
          : id === "K1"
            ? bank.find(
                (t) =>
                  t.templateId ===
                  (kind === "concept" ? "displacement" : "speed"),
              )
            : bank.find((t) => t.kind === kind)
      )!;
      const last = data.attempts
        .filter((a) => a.taskSnapshot.templateId === first.templateId)
        .at(-1);
      return (
        bank.find(
          (t) => t.templateId === first.templateId && t.id !== last?.variantId,
        ) ?? first
      );
    };
    setQuick({
      id,
      tasks: [pick("concept"), pick("calculation")],
      key: Date.now(),
    });
  }
  const queue = reviewQueue(data),
    progress = allProgress(data);
  const [oral, setOral] = useState(false),
    [first, setFirst] = useState<UnitId>("K1"),
    [second, setSecond] = useState<UnitId>("T1");
  return (
    <section className="panel no-print">
      <div className="eyebrow">ПОВТОРЕНИЕ · 10–20 МИНУТ</div>
      <h2>До трёх следующих шагов</h2>
      <p>
        Сначала срок повторения, затем ошибки, затем новое. Дату и прежний успех
        показываем вместе.
      </p>
      <div className="review-grid">
        {queue.map((q) => (
          <article className="review-card" key={q.unitId}>
            <span className="badge">
              {q.reason === "overdue"
                ? "Пора повторить"
                : q.reason === "error"
                  ? "Вернуться к основе"
                  : "Новая тема"}
            </span>
            <h3>
              {q.unitId} · {unitTitle(q.unitId)}
            </h3>
            <p>{q.detail}</p>
            <button
              aria-label={`Короткая проверка ${q.unitId}`}
              disabled={!writable}
              onClick={() => openQuick(q.unitId)}
            >
              Вопрос и задача
            </button>
            <button onClick={() => onOpen(q.unitId)}>
              К объяснению и новой задаче
            </button>
          </article>
        ))}
      </div>
      {quick && (
        <div className="quick-review">
          <h3>{quick.id} · Короткое повторение</h3>
          <p>
            {quick.id === "K1"
              ? "Путь — сумма длин участков; перемещение — разность координат. При равномерном движении скорость равна пути, делённому на время."
              : learningUnits[quick.id].theory[0]}
          </p>
          <p className="small muted">
            Один вопрос и одна задача. Эта тренировка сохраняет ответы;
            подтверждение модуля требует полной самостоятельной проверки.
          </p>
          <Assessment
            key={quick.key}
            unitId={quick.id}
            sequence={quick.tasks}
            mode="practice"
            round={0}
            writable={writable}
            hintHistory={data.hintHistory}
            onHint={(key, count) =>
              onUpdate({
                ...data,
                hintHistory: { ...data.hintHistory, [key]: count },
              })
            }
            onAttempt={(a) =>
              onUpdate({ ...data, attempts: [...data.attempts, a] })
            }
          />
        </div>
      )}
      {progress.some((p) => p.nextReviewAt) && (
        <details>
          <summary>Расписание повторения</summary>
          {progress
            .filter((p) => p.nextReviewAt)
            .map((p) => (
              <p key={p.id}>
                {p.id}: {new Date(p.nextReviewAt!).toLocaleDateString("ru-RU")}{" "}
                · {p.reviewNeeded ? "требует повторения" : "назначено"} · первое
                подтверждение сохранено
              </p>
            ))}
        </details>
      )}
      <button onClick={() => setOral((v) => !v)}>
        {oral ? "Скрыть два вопроса" : "Сформировать два вопроса"}
      </button>
      {oral && (
        <div className="callout">
          <h3>Устная самопроверка</h3>
          <p>
            Произнесите ответ: смысл → закон → единицы → условия → пример. Речь
            не записывается и не оценивается автоматически; это подготовка,
            формат экзамена пока неизвестен.
          </p>
          <div className="parameter-grid">
            {([first, second] as UnitId[]).map((id, i) => (
              <label key={i}>
                Вопрос {i + 1}
                <select
                  value={id}
                  onChange={(e) =>
                    (i === 0 ? setFirst : setSecond)(e.target.value as UnitId)
                  }
                >
                  {unitIds
                    .filter((u) => u !== (i === 0 ? second : first))
                    .map((u) => (
                      <option key={u} value={u}>
                        {u} · {unitTitle(u)}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
          {[first, second].map((id, i) => (
            <article key={`${i}:${id}`}>
              <h3>
                {i + 1}.{" "}
                {id === "K1"
                  ? "Почему скорость в конце разгона не определяет весь путь?"
                  : learningUnits[id].outcomes[0].title}
              </h3>
              <details>
                <summary>Каркас для сравнения с вашим ответом</summary>
                <p>
                  {id === "K1"
                    ? "Скорость показывает темп изменения координаты. При постоянном ускорении x − x₀ = v₀t + at²/2, скорость в м/с, ускорение в м/с². Из покоя при 2 м/с² за 4 с путь 16 м, конечная скорость 8 м/с. При развороте путь считаем по участкам."
                    : `${learningUnits[id].theory[0]} ${learningUnits[id].units} ${learningUnits[id].conditions} ${learningUnits[id].example}`}
                </p>
              </details>
              <label className="checkbox">
                <input type="checkbox" />
                Моя оценка: смог объяснить без чтения
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
