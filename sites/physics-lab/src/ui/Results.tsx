import { studyModules } from "../studio/moduleCatalog";
import { customScore } from "../studio/modules";
import { StudyText } from "./StudyText";
import { ModuleScore } from "./ModuleScore";
import { allProgress, achievements, unitTitle } from "../learning/review";
import { DiagnosticHistory } from "./DiagnosticHistory";
import { ModelResults } from "./ModelResults";
import { VisualizationResults } from "./VisualizationResults";
import type { VisualizationExperiment } from "../figures/experiment";
import type { ModelExperiment } from "../content/types";
import { useState } from "react";
import { Printer, Download, FlaskConical, ArrowUpRight } from "lucide-react";
import type { Workspace } from "../content/types";
import type { LinearParams } from "../physics/linear";
import { formatNumber as f } from "../physics/units";
import { downloadBackup } from "../persistence/store";
export function Results({
  data,
  onReplay,
  onModelReplay,
  onVisualizationReplay,
}: {
  data: Workspace;
  onReplay: (p: LinearParams) => void;
  onModelReplay: (e: ModelExperiment) => void;
  onVisualizationReplay: (e: VisualizationExperiment) => void;
}) {
  const reportedModules = studyModules(data).filter(
    (m) =>
      data.customModules.some((c) => c.id === m.id) ||
      data.customRead[m.id]?.length ||
      data.customRuns.some((r) => r.moduleId === m.id),
  );
  const progress = allProgress(data);
  const awards = achievements(data);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const inPeriod = (at: string) => {
    const d = new Date(at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return (!from || key >= from) && (!to || key <= to);
  };
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        [
          ...data.attempts,
          ...data.experiments,
          ...data.modelExperiments,
          ...data.diagnostics,
          ...data.customRuns,
          ...data.visualizationExperiments,
        ].map((r) => r.id),
      ),
  );
  const [demo, setDemo] = useState(false);
  const date = (s: string) => new Date(s).toLocaleString("ru-RU");
  function select(id: string) {
    setSelected((old) => {
      const n = new Set(old);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <div className="eyebrow">ВАШИ СОБСТВЕННЫЕ РЕЗУЛЬТАТЫ</div>
          <h1>История понимания</h1>
          <p>Попытки и эксперименты, к которым можно вернуться.</p>
        </div>
        <div className="row">
          <button onClick={() => downloadBackup(data)}>
            <Download size={16} />
            Экспорт JSON
          </button>
          <button
            onClick={() => window.print()}
            disabled={!selected.size && !reportedModules.length}
          >
            <Printer size={16} />
            Печатать отчёт
          </button>
        </div>
      </div>
      <section className="panel">
        <h2>Баллы и прохождение модулей</h2>
        {progress.map((p) => (
          <div key={p.id}>
            <h3>
              {p.id} · {unitTitle(p.id)}
            </h3>
            <ModuleScore data={data} id={p.id} />
          </div>
        ))}
      </section>
      {reportedModules.length > 0 && (
        <section className="panel">
          <h2>Результаты учебных и личных модулей</h2>
          {reportedModules.map((m) => {
            const s = customScore(
              m,
              data.customRuns,
              data.customRead[m.id] ?? [],
            );
            return (
              <article key={m.id}>
                <h3>{m.title}</h3>
                <p>Баллы: {s.points ?? "—"} / 100</p>
                <p>Пройдено {s.completion}%</p>
                {!m.questions.length && (
                  <p>Модуль чтения: знания заданиями не проверялись.</p>
                )}
                {data.customRuns
                  .filter(
                    (r) =>
                      r.moduleId === m.id &&
                      inPeriod(r.createdAt) &&
                      (!demo || selected.has(r.id)),
                  )
                  .map((r) => (
                    <details
                      key={r.id}
                      className={selected.has(r.id) ? "" : "excluded-print"}
                    >
                      <summary>
                        {date(r.createdAt)} ·{" "}
                        {Math.round(
                          (100 *
                            r.answers.filter(
                              (a, i) => a === m.questions[i].correctIndex,
                            ).length) /
                            m.questions.length,
                        )}{" "}
                        баллов
                      </summary>
                      {!demo && (
                        <label className="checkbox no-print">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => select(r.id)}
                          />
                          Включить в отчёт
                        </label>
                      )}
                      {m.questions.map((q, i) => (
                        <div key={q.id}>
                          <strong>{q.prompt}</strong>
                          <p>Ваш ответ: {q.options[r.answers[i]]}</p>
                          <StudyText text={q.explanation} />
                        </div>
                      ))}
                    </details>
                  ))}
              </article>
            );
          })}
        </section>
      )}
      <section className="panel report-header">
        <h2>Личная лаборатория · отчёт</h2>
        <p>
          Подтверждено заданиями:{" "}
          {progress.filter((p) => p.demonstrated).length} / 6. Завершено
          маршрутов: {progress.filter((p) => p.completed).length} / 6.
        </p>
        <p>
          Период записей: {from || "с начала"} — {to || "по настоящее время"}.
          Сводка прогресса относится ко всей сохранённой истории.
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
                <th>Модуль · материал v1</th>
                <th>Открытие и моя оценка</th>
                <th>Самостоятельная проверка</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p) => {
                const opened =
                  p.id === "K1"
                    ? data.materialOpenedAt
                    : data.moduleMarks[p.id]?.openedAt;
                const marked =
                  p.id === "K1"
                    ? data.selfMarkedAt
                    : data.moduleMarks[p.id]?.selfMarkedAt;
                return (
                  <tr key={p.id}>
                    <th scope="row">
                      {p.id} · {unitTitle(p.id)}
                    </th>
                    <td>
                      {opened ? `Открыт ${date(opened)}` : "Не открыт"}
                      <br />
                      {marked ? "Моя оценка: изучен" : "Самооценка не отмечена"}
                    </td>
                    <td>
                      {p.demonstratedAt
                        ? `Подтверждено ${date(p.demonstratedAt)}`
                        : "Нет подтверждения"}
                      {p.reviewNeeded ? " · Требует повторения" : ""}
                      {p.completed ? " · Маршрут завершён" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details>
          <summary>Когда выполнялись самостоятельные проверки</summary>
          {progress.map((p) => {
            let previous: string | null = null;
            return (
              <div key={p.id}>
                <h3>{p.id}</h3>
                {p.checks.length ? (
                  p.checks.map((c, i) => {
                    const kind = previous
                      ? Date.parse(c.at) - Date.parse(previous) >= 86400000
                        ? "Отложенное повторение"
                        : "Немедленная проверка"
                      : "Первая проверка";
                    if (c.pass) previous = c.at;
                    return (
                      <p key={i}>
                        {date(c.at)} · {kind} · {c.score}/5 ·{" "}
                        {c.pass ? "подтверждено" : "требует разбора"}
                      </p>
                    );
                  })
                ) : (
                  <p>Нет завершённых проверок.</p>
                )}
              </div>
            );
          })}
        </details>
        <p className="small muted">
          Приложение {data.appVersion}. Доступны шесть лабораторных маршрутов и
          27 тем учебной адаптации курса LMS ЮФУ. Оценки LMS не импортированы.
          Свободные выводы не проверены автоматически. Отчёт отражает личные
          записи и не является независимым контролем знаний.
        </p>
        <div className="parameter-grid no-print">
          <label>
            Записи с даты
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Записи по дату
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <label className="checkbox no-print">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => setDemo(e.target.checked)}
          />
          Режим демонстрации: только выбранные записи
        </label>
        <p className="no-print small muted">
          Выберите записи флажками. В печатный отчёт попадут только они.
        </p>
      </section>
      <section className="panel">
        <h2>Достижения с подтверждением</h2>
        <p className="small muted">
          Четыре отметки за реальные действия: решение без подсказки, опыт с
          выводом, исправление ошибки на другом варианте, успешная проверка
          через сутки. Они не заменяют оценку знаний.
        </p>
        {awards.length ? (
          awards.map((a) => (
            <article key={a.id}>
              <h3>{a.title}</h3>
              <p>
                {date(a.awardedAt)} · Правило {a.ruleVersion}
              </p>
              <details>
                <summary>Записи-основания</summary>
                <p className="evidence-ids">{a.evidenceIds.join(", ")}</p>
              </details>
            </article>
          ))
        ) : (
          <p>Пока нет отметок. Чтение и ручная самооценка их не дают.</p>
        )}
      </section>
      <div className="section-heading">
        <h2>
          Эксперименты{" "}
          <span className="count">
            {data.experiments.length +
              data.modelExperiments.length +
              data.visualizationExperiments.length}
          </span>
        </h2>
      </div>
      {!data.experiments.length &&
        !data.modelExperiments.length &&
        !data.visualizationExperiments.length && (
          <section className="empty-state">
            <FlaskConical size={30} />
            <h3>Здесь будет ваш первый опыт</h3>
            <p>
              Запишите прогноз, проведите эксперимент и сохраните собственный
              вывод.
            </p>
          </section>
        )}
      {[...data.experiments]
        .reverse()
        .filter((e) => inPeriod(e.createdAt) && (!demo || selected.has(e.id)))
        .map((e) => (
          <article
            key={e.id}
            className={`panel result-card ${selected.has(e.id) ? "" : "excluded-print"}`}
          >
            <div className="panel-heading">
              <h3>
                Движение по прямой
                {e.context === "playground" ? " · Игровая площадка" : " · K1"}
              </h3>
              <span className="small muted">{date(e.createdAt)}</span>
            </div>
            {!demo && (
              <label className="checkbox no-print">
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => select(e.id)}
                />
                Включить в отчёт
              </label>
            )}
            <p>
              x₀ = {f(e.parameterSnapshot.x0)} м · v₀ ={" "}
              {f(e.parameterSnapshot.v0)} м/с · a = {f(e.parameterSnapshot.a)}{" "}
              м/с² · t = {f(e.parameterSnapshot.duration)} с
            </p>
            <div className="result-values">
              Путь: <strong>{f(e.samples.at(-1)!.distance)} м</strong> ·
              Конечная скорость: <strong>{f(e.samples.at(-1)!.v)} м/с</strong>
            </div>
            <dl>
              <dt>Прогноз</dt>
              <dd>{e.prediction}</dd>
              <dt>Наблюдения</dt>
              <dd>{e.observations}</dd>
              <dt>Мой вывод</dt>
              <dd>{e.conclusion}</dd>
            </dl>
            <p className="small muted">
              Виртуальные данные аналитической модели L1 v{e.modelVersion}.
              Числа согласованы с моделью. Вывод записан пользователем.
              Самопроверка по рубрике:{" "}
              {e.selfReview ? "выполнена" : "не отмечена"}.
            </p>
            {!demo && (
              <button
                className="no-print"
                onClick={() => onReplay(e.parameterSnapshot)}
              >
                Воспроизвести отдельной копией <ArrowUpRight size={16} />
              </button>
            )}
          </article>
        ))}
      <DiagnosticHistory
        runs={data.diagnostics.filter((r) => inPeriod(r.createdAt))}
        selected={selected}
        onSelect={select}
        demo={demo}
      />
      <ModelResults
        records={data.modelExperiments.filter((e) => inPeriod(e.createdAt))}
        selected={selected}
        onSelect={select}
        onReplay={onModelReplay}
        demo={demo}
      />
      <VisualizationResults
        records={data.visualizationExperiments.filter((e) =>
          inPeriod(e.createdAt),
        )}
        data={data}
        selected={selected}
        onSelect={select}
        onReplay={onVisualizationReplay}
        demo={demo}
      />
      <div className="section-heading">
        <h2>
          Попытки <span className="count">{data.attempts.length}</span>
        </h2>
      </div>
      {!data.attempts.length && (
        <section className="empty-state">
          <h3>Пока нет сохранённых ответов</h3>
          <p>
            Тренировка и проверка в занятии сохраняют каждый отправленный ответ.
          </p>
        </section>
      )}
      {[...data.attempts]
        .reverse()
        .filter((a) => inPeriod(a.submittedAt) && (!demo || selected.has(a.id)))
        .map((a) => (
          <article
            key={a.id}
            className={`panel result-card ${selected.has(a.id) ? "" : "excluded-print"}`}
          >
            <div className="panel-heading">
              <span className={`badge ${a.result.correct ? "green" : ""}`}>
                {a.result.correct ? "Верно" : "Нужно повторить"}
              </span>
              <span className="small muted">{date(a.submittedAt)}</span>
            </div>
            <h3>{a.taskSnapshot.prompt}</h3>
            {!demo && (
              <label className="checkbox no-print">
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => select(a.id)}
                />
                Включить в отчёт
              </label>
            )}
            <p>
              Ваш ответ:{" "}
              <strong>
                {a.answer} {a.taskSnapshot.unit ? a.unit : ""}
              </strong>
            </p>
            <p>
              {a.hintsUsed
                ? "Учебная попытка с подсказкой"
                : "Самостоятельная попытка"}{" "}
              · Подсказок: {a.hintsUsed} · Задание {a.taskId}, версия{" "}
              {a.taskVersion}
            </p>
            <p className="small muted">
              Число/выбор: {a.result.valueCorrect ? "верно" : "ошибка"};
              единица:{" "}
              {a.result.unitCorrect ? "верно / не требуется" : "ошибка"}.{" "}
              {a.result.errorTags.length
                ? `Пробелы: ${a.result.errorTags.join(", ")}`
                : ""}
            </p>
            <details>
              <summary>Разбор и использованные подсказки</summary>
              <p>{a.taskSnapshot.explanation}</p>
              {a.taskSnapshot.hints.slice(0, a.hintsUsed).map((h, i) => (
                <p key={i}>
                  {i + 1}. {h}
                </p>
              ))}
            </details>
          </article>
        ))}
    </>
  );
}
