import { studyModules } from "../studio/moduleCatalog";
import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../content/types";
import { learningUnits } from "../content/modules";
import { aiRequest, providerNames, type PublicConfig } from "../studio/api";
import { StudyText } from "./StudyText";
export function StudyChat({
  data,
  writable,
  onUpdate,
  initialTopic = "K1",
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  initialTopic?: string;
}) {
  const topics = [
    {
      id: "K1",
      title: "Разгон и торможение",
      context:
        "Прямолинейное равноускоренное движение: x=x0+v0*t+a*t²/2. Путь и перемещение; скорость и ускорение; x(t), v(t), a(t).",
    },
    ...Object.values(learningUnits).map((u) => ({
      id: u.id,
      title: u.title,
      context: [u.intro, ...u.theory, u.example, u.formula, u.conditions].join(
        "\n",
      ),
    })),
    ...studyModules(data).map((m) => ({
      id: m.id,
      title: m.title,
      context: [
        m.objective,
        ...m.sections.map((s) => s.title + "\n" + s.body),
        m.example,
      ]
        .join("\n")
        .slice(0, 60000),
    })),
  ];
  const [topic, setTopic] = useState(initialTopic),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [service, setService] = useState("");
  const active = topics.find((t) => t.id === topic) ?? topics[0];
  const chat = data.studyChats.find((c) => c.topicId === active.id);
  const messages = chat?.messages ?? [];
  const latest = useRef(data);
  latest.current = data;
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    void aiRequest<PublicConfig>("config")
      .then((c) =>
        setService(
          `${providerNames[c.active]} · ${c.providers[c.active]?.model || (c.active === "codex" ? "модель по умолчанию" : "модель не выбрана")}`,
        ),
      )
      .catch(() => setService("Подключение не настроено"));
    return () => controller.current?.abort();
  }, []);
  async function send() {
    if (!input.trim() || busy) return;
    if (!chat && data.studyChats.length >= 100) {
      setError(
        "Достигнут предел: 100 обсуждений. Продолжите одну из сохранённых тем.",
      );
      return;
    }
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const user = { role: "user" as const, content: input.trim() };
    try {
      const r = await aiRequest<{ text: string }>(
        "chat",
        {
          kind: "chat",
          context: active.context,
          messages: [...messages.slice(-19), user],
        },
        controller.current.signal,
      );
      if (r.text.length > 16000)
        throw new Error(
          "Ответ слишком длинный для истории. Попросите объяснить короче.",
        );
      const current = latest.current;
      const record = {
        id: chat?.id ?? crypto.randomUUID(),
        topicId: active.id,
        messages: [
          ...messages,
          user,
          { role: "assistant" as const, content: r.text },
        ].slice(-200),
        updatedAt: new Date().toISOString(),
      };
      if (
        await onUpdate({
          ...current,
          studyChats: [
            ...current.studyChats.filter((c) => c.topicId !== active.id),
            record,
          ],
        })
      )
        setInput("");
      else setError("Ответ получен, но не сохранён. Повторите запрос.");
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Запрос отменён."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ВОПРОСЫ ПО МАТЕРИАЛУ</div>
          <h1>Обсудить с ИИ</h1>
          <p>
            {service}. Сообщения и материал выбранной темы передаются этому
            сервису при отправке.
          </p>
        </div>
      </div>
      <section className="panel chat-panel">
        <label>
          Тема разговора
          <select
            value={active.id}
            disabled={busy}
            onChange={(e) => {
              setTopic(e.target.value);
              setError("");
            }}
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <div
          className="chat-history"
          role="log"
          aria-label="История обсуждения"
        >
          {!messages.length && (
            <p className="muted">
              Задайте вопрос, попросите объяснить формулу словами или разобрать
              ваш ход решения.
            </p>
          )}
          {messages.map((m, i) => (
            <article className={`chat-message ${m.role}`} key={i}>
              <strong>{m.role === "user" ? "Вы" : "Помощник"}</strong>
              <StudyText text={m.content} />
            </article>
          ))}
        </div>
        <label>
          Ваш вопрос
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            maxLength={12000}
            disabled={busy || !writable}
          />
        </label>
        <div className="row">
          <button
            className="primary"
            disabled={busy || !writable || !input.trim()}
            onClick={() => void send()}
          >
            Отправить вопрос
          </button>
          {busy && (
            <button onClick={() => controller.current?.abort()}>
              Остановить ответ
            </button>
          )}
        </div>
        <p role="status">{busy ? "Модель готовит объяснение…" : error}</p>
        <p className="small muted">
          Чат не начисляет баллы. Проверяйте выводы, единицы и условия
          применимости. Хранится до 200 последних сообщений каждой темы; в
          запрос включается до 20 последних сообщений.
        </p>
      </section>
    </>
  );
}
