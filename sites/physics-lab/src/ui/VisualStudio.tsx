import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../content/types";
import { aiRequest } from "../studio/api";
import { visualizationSchema } from "../studio/schema";
import { AnatomyFigure, type FigureSpec } from "./AnatomyFigure";
const examplePrompt =
  "Покажи лабораторный стенд с пружиной: я меняю удлинение и жёсткость, вижу силу F = kx и энергию E = kx²/2. Объясни, что останется постоянным и какие величины сравнить в опыте.";
const example: FigureSpec = {
  title: "Почему пружина сопротивляется растяжению",
  mechanism: "spring",
  caption:
    "Увеличьте удлинение вдвое и сравните силу и запасённую энергию. Затем измените жёсткость при том же удлинении.",
};
export function VisualStudio({
  data,
  writable,
  onUpdate,
  onUse,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  onUse: (figure: FigureSpec) => void;
}) {
  const [exampleOpen, setExampleOpen] = useState(false);
  const [draft, setDraft] = useState<FigureSpec | null>(null);
  const [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => () => controller.current?.abort(), []);
  async function generate() {
    setBusy(true);
    setError("");
    setDraft(null);
    controller.current = new AbortController();
    try {
      const r = await aiRequest<{ visualization: unknown }>(
        "chat",
        {
          kind: "visualization",
          messages: [{ role: "user", content: prompt }],
        },
        controller.current.signal,
      );
      const v = visualizationSchema.parse(r.visualization);
      setDraft({ ...v, sourcePrompt: prompt.trim() });
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Генерация отменена."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft) return;
    const checked = visualizationSchema.safeParse(draft);
    if (!checked.success) {
      setError(
        "Проверьте название, объяснение и формулы показаний: они должны быть заполнены и давать конечные значения в заданном диапазоне.",
      );
      return;
    }
    const current = latest.current;
    if (current.visualizations.length >= 100) {
      setError("Достигнут предел: 100 визуализаций");
      return;
    }
    setBusy(true);
    try {
      if (
        await onUpdate({
          ...current,
          visualizations: [
            ...current.visualizations,
            { ...checked.data, id: crypto.randomUUID() },
          ],
        })
      ) {
        setDraft(null);
        setPrompt("");
        setError("Визуализация сохранена.");
      } else setError("Не удалось сохранить визуализацию");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel visual-studio">
      <div className="eyebrow">ANATOMY · ИНТЕРАКТИВНЫЕ ПРИБОРЫ</div>
      <h2>Посмотреть закон в устройстве</h2>
      <p>
        Опишите тему, устройство и величины, которые хотите менять и измерять.
        ИИ создаст интерактивную модель. Сохраните её и откройте на игровой
        площадке, чтобы проверить предположение и записать свой опыт.
      </p>
      <details
        className="visualization-example"
        onToggle={(e) => setExampleOpen(e.currentTarget.open)}
      >
        <summary>Пример того, что можно создать</summary>
        <p className="small muted">
          Это только подсказка к запросу, а не ваша модель или пройденная тема.
        </p>
        <blockquote>{examplePrompt}</blockquote>
        <button disabled={busy} onClick={() => setPrompt(examplePrompt)}>
          Использовать пример промпта
        </button>
        {exampleOpen && <AnatomyFigure figure={example} />}
      </details>
      <label>
        Что показать в дополнительной визуализации?
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Какая тема? Что изображено? Какие параметры менять, какие величины измерять и при каких допущениях?"
          disabled={busy}
        />
      </label>
      <div className="row">
        <button
          onClick={() => void generate()}
          disabled={!writable || busy || !prompt.trim()}
        >
          Создать визуализацию
        </button>
        {busy && (
          <button onClick={() => controller.current?.abort()}>
            Отменить визуализацию
          </button>
        )}
      </div>
      <p className="small muted">
        Запрос отправляется выбранному в настройках сервису ИИ. Модель
        рассчитывает заданные зависимости; её формулы и область применимости
        нужно проверить перед исследованием.
      </p>
      <p role="status">{busy ? "Создаём физическую модель…" : error}</p>
      {draft && (
        <section className="panel">
          <h3>Предварительный просмотр</h3>
          <AnatomyFigure figure={draft} />
          <label>
            Название визуализации
            <input
              value={draft.title}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Объяснение визуализации
            <textarea
              rows={4}
              value={draft.caption}
              maxLength={8000}
              onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
            />
          </label>
          {draft.scene && (
            <details>
              <summary>Править показания модели</summary>
              <p className="small muted">
                Переменные:{" "}
                {draft.scene.controls
                  .map((c) => `${c.id} — ${c.label}`)
                  .join("; ")}
                . Допустимы числа, + − * / ^ и скобки.
              </p>
              {draft.scene.readouts.map((r, i) => (
                <label key={i}>
                  Формула: {r.label} ({r.unit})
                  <input
                    value={r.expression}
                    maxLength={160}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scene: {
                          ...draft.scene!,
                          readouts: draft.scene!.readouts.map((value, j) =>
                            j === i
                              ? { ...value, expression: e.target.value }
                              : value,
                          ),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </details>
          )}
          <button onClick={() => void save()} disabled={busy || !writable}>
            Сохранить визуализацию
          </button>
          <button onClick={() => setDraft(null)} disabled={busy}>
            Отбросить
          </button>
        </section>
      )}
      <h3>
        Мои визуализации{" "}
        <span className="count">{data.visualizations.length}</span>
      </h3>
      {!data.visualizations.length && (
        <p className="muted">
          Здесь появятся модели, которые вы создадите и сохраните.
        </p>
      )}
      {data.visualizations.map((v) => (
        <article key={v.id} className="visualization-library-item">
          <h4>{v.title}</h4>
          <p>{v.caption}</p>
          {v.sourcePrompt && (
            <details>
              <summary>Исходный промпт</summary>
              <p className="study-text">{v.sourcePrompt}</p>
            </details>
          )}
          <button onClick={() => onUse(v)}>Исследовать на площадке</button>
        </article>
      ))}
    </section>
  );
}
