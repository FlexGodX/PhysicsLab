import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../content/types";
import { extractDocument } from "../studio/documents";
import { createReadingModule, materializeModule } from "../studio/modules";
import { moduleDraftSchema, type ModuleDraft } from "../studio/schema";
import { aiRequest } from "../studio/api";
import { VisualStudio } from "./VisualStudio";
import type { FigureSpec } from "./AnatomyFigure";
export function CourseStudio({
  data,
  writable,
  onUpdate,
  onOpen,
  onUseVisualization,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  onOpen: (id: string) => void;
  onUseVisualization: (figure: FigureSpec) => void;
}) {
  const [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [fileName, setFileName] = useState(""),
    [prompt, setPrompt] = useState(""),
    [mode, setMode] = useState<"document" | "prompt">("document");
  const [draft, setDraft] = useState<ModuleDraft | null>(null),
    [provider, setProvider] = useState(""),
    [sourceText, setSourceText] = useState(""),
    [sourceName, setSourceName] = useState(""),
    [sourceKind, setSourceKind] = useState<"document" | "prompt">("document");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function read(file: File) {
    setBusy(true);
    setMessage("Читаем документ на этом устройстве…");
    setDraft(null);
    setText("");
    setFileName("");
    controller.current = new AbortController();
    try {
      const content = await extractDocument(file, controller.current.signal);
      setText(content);
      setFileName(file.name);
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 160));
      setMessage("Текст извлечён. Проверьте формулы и порядок абзацев.");
    } catch (e) {
      setMessage(
        (e as Error).name === "AbortError"
          ? "Чтение отменено."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setMessage("Создаём объяснения и задания…");
    setDraft(null);
    controller.current = new AbortController();
    try {
      const r = await aiRequest<{ draft: unknown; provider: string }>(
        "chat",
        {
          kind: "module",
          context: mode === "document" ? text : "",
          messages: [
            {
              role: "user",
              content:
                mode === "document"
                  ? `Создай модуль «${title}» по справочному документу. ${prompt}`
                  : prompt,
            },
          ],
        },
        controller.current.signal,
      );
      const parsed = moduleDraftSchema.parse(r.draft);
      if (parsed.questions.length < 3)
        throw new Error("Недостаточно вопросов в ответе модели");
      setDraft(parsed);
      setProvider(r.provider);
      setSourceText(mode === "document" ? text : prompt);
      setSourceName(mode === "document" ? fileName : "Описание темы");
      setSourceKind(mode);
      setMessage("Модуль подготовлен. Проверьте содержание перед добавлением.");
    } catch (e) {
      setMessage(
        (e as Error).name === "AbortError"
          ? "Генерация отменена."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function add(reading = false) {
    if (data.customModules.length >= 100) {
      setMessage("Достигнут предел: 100 собственных модулей.");
      return;
    }
    setBusy(true);
    try {
      const m = reading
        ? createReadingModule(title, text, fileName)
        : materializeModule(draft!, {
            kind: sourceKind,
            name: sourceName,
            text: sourceText,
            provider,
          });
      if (
        await onUpdate({ ...data, customModules: [...data.customModules, m] })
      )
        onOpen(m.id);
      else setMessage("Не удалось сохранить модуль. Повторите добавление.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ВАШ СОБСТВЕННЫЙ КУРС</div>
          <h1>Мастерская модулей</h1>
          <p>
            Превратите материал или непонятную тему в последовательное занятие.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="row">
          <button
            aria-pressed={mode === "document"}
            onClick={() => {
              setMode("document");
              setDraft(null);
            }}
            disabled={busy}
          >
            Из документа
          </button>
          <button
            aria-pressed={mode === "prompt"}
            onClick={() => {
              setMode("prompt");
              setDraft(null);
            }}
            disabled={busy}
          >
            По описанию темы
          </button>
        </div>
        {mode === "document" && (
          <>
            <label>
              PDF или DOCX
              <input
                type="file"
                accept=".pdf,.docx"
                disabled={busy || !writable}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void read(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="small muted">
              До 10 МБ, 100 страниц PDF и 60 000 символов. Сканам нужен OCR.
              Изображения, таблицы и сложные формулы могут потребовать ручного
              уточнения.
            </p>
            {text && (
              <>
                <label>
                  Название модуля
                  <input
                    value={title}
                    maxLength={160}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label>
                  Текст документа
                  <textarea
                    value={text}
                    maxLength={60000}
                    rows={9}
                    onChange={(e) => {
                      setText(e.target.value);
                      setDraft(null);
                    }}
                    disabled={busy}
                  />
                </label>
                <small>
                  {text.length.toLocaleString("ru-RU")} символов. Исходный файл
                  остаётся на устройстве.
                </small>
              </>
            )}
          </>
        )}
        <label>
          {mode === "prompt"
            ? "Какую тему вы хотите понять?"
            : "На чём сделать акцент?"}
          <textarea
            value={prompt}
            maxLength={12000}
            rows={4}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: почему ускорение направлено к центру, если скорость постоянна? Объясни на примере и дай задачи."
            disabled={busy}
          />
        </label>
        <p className="small">
          Кнопка «Создать с ИИ» отправит введённый текст выбранному сервису.
          Сервис и модель задаются в настройках.
        </p>
        <div className="row">
          <button
            className="primary"
            disabled={
              !writable ||
              busy ||
              (mode === "document"
                ? !text.trim() || !title.trim()
                : !prompt.trim())
            }
            onClick={() => void generate()}
          >
            Создать с ИИ
          </button>
          {mode === "document" && (
            <button
              disabled={!writable || busy || !text.trim() || !title.trim()}
              onClick={() => void add(true)}
            >
              Добавить модуль чтения
            </button>
          )}
          {busy && (
            <button onClick={() => controller.current?.abort()}>
              Отменить
            </button>
          )}
        </div>
        <p role="status">{message}</p>
      </section>
      {draft && (
        <section className="panel">
          <div className="eyebrow">ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР</div>
          <h2>{draft.title}</h2>
          <label>
            Заголовок занятия
            <input
              value={draft.title}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Цель занятия
            <textarea
              value={draft.objective}
              maxLength={8000}
              onChange={(e) =>
                setDraft({ ...draft, objective: e.target.value })
              }
            />
          </label>
          {draft.sections.map((s, i) => (
            <details key={i} open={i === 0}>
              <summary>{s.title}</summary>
              <label>
                Текст раздела {i + 1}
                <textarea
                  rows={5}
                  value={s.body}
                  maxLength={8000}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((section, j) =>
                        j === i
                          ? { ...section, body: e.target.value }
                          : section,
                      ),
                    })
                  }
                />
              </label>
            </details>
          ))}
          <h3>Разобранный пример</h3>
          <label>
            Решение примера
            <textarea
              value={draft.example}
              rows={4}
              maxLength={8000}
              onChange={(e) => setDraft({ ...draft, example: e.target.value })}
            />
          </label>
          <details>
            <summary>
              Проверить задания и ответы ({draft.questions.length})
            </summary>
            {draft.questions.map((q, i) => (
              <div key={i}>
                <label>
                  Формулировка вопроса {i + 1}
                  <textarea
                    value={q.prompt}
                    maxLength={8000}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        questions: draft.questions.map((question, j) =>
                          j === i
                            ? { ...question, prompt: e.target.value }
                            : question,
                        ),
                      })
                    }
                  />
                </label>
                {q.options.map((option, j) => (
                  <label key={j}>
                    Вариант {j + 1} к вопросу {i + 1}
                    <input
                      value={option}
                      maxLength={1000}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          questions: draft.questions.map((question, qi) =>
                            qi === i
                              ? {
                                  ...question,
                                  options: question.options.map((text, oi) =>
                                    oi === j ? e.target.value : text,
                                  ),
                                }
                              : question,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Правильный ответ к вопросу {i + 1}
                  <select
                    value={q.correctIndex}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        questions: draft.questions.map((question, j) =>
                          j === i
                            ? {
                                ...question,
                                correctIndex: Number(e.target.value),
                              }
                            : question,
                        ),
                      })
                    }
                  >
                    {q.options.map((option, j) => (
                      <option key={j} value={j}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Объяснение ответа {i + 1}
                  <textarea
                    rows={3}
                    value={q.explanation}
                    maxLength={8000}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        questions: draft.questions.map((question, j) =>
                          j === i
                            ? { ...question, explanation: e.target.value }
                            : question,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </details>
          <p className="small muted">
            Проверьте физические утверждения и ответы: модель может ошибаться.
            Добавление сохраняет эту версию целиком.
          </p>
          <button
            className="primary"
            onClick={() => void add()}
            disabled={!writable || busy}
          >
            Добавить в курс
          </button>
        </section>
      )}
      <VisualStudio
        data={data}
        writable={writable}
        onUpdate={onUpdate}
        onUse={onUseVisualization}
      />
    </>
  );
}
