import { useEffect, useState } from "react";
import { CodexConnection } from "./CodexConnection";
import {
  aiRequest,
  providerNames,
  type ProviderId,
  type PublicConfig,
} from "../studio/api";
export function AISettings() {
  const [config, setConfig] = useState<PublicConfig | null>(null),
    [provider, setProvider] = useState<ProviderId>("lmstudio");
  const [fastMode, setFastMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(""),
    [baseUrl, setBaseUrl] = useState("http://127.0.0.1:1234/v1"),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function select(id: ProviderId, c = config) {
    setProvider(id);
    setFastMode(c?.providers[id]?.fastMode ?? false);
    setModel(c?.providers[id]?.model ?? "");
    setBaseUrl(c?.providers[id]?.baseUrl || "http://127.0.0.1:1234/v1");
    setKey("");
    setMessage("");
  }
  useEffect(() => {
    let alive = true;
    void aiRequest<PublicConfig>("config")
      .then((c) => {
        if (alive) {
          setConfig(c);
          select(c.active, c);
        }
      })
      .catch((e) => alive && setMessage(e.message))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function save(removeKey = false) {
    setBusy(true);
    setMessage("");
    try {
      const c = await aiRequest<PublicConfig>("config", {
        provider,
        model,
        baseUrl,
        fastMode,
        apiKey: key,
        removeKey,
      });
      setConfig(c);
      setKey("");
      setMessage(removeKey ? "Ключ удалён." : "Настройки сохранены.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setMessage("Проверяем соединение…");
    try {
      const c = await aiRequest<PublicConfig>("config", {
        provider,
        model,
        baseUrl,
        fastMode,
        apiKey: key,
      });
      setConfig(c);
      setKey("");
      const r = await aiRequest<{ text: string }>("chat", {
        kind: "test",
        messages: [{ role: "user", content: "Ответь одним словом: готово" }],
      });
      setMessage(`Соединение работает: ${r.text.slice(0, 200)}`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const controlsBusy = loading || busy;
  return (
    <section className="panel ai-settings">
      <h2>Подключение ИИ</h2>
      <p>
        Выберите сервис. Для Codex доступен вход по подписке ChatGPT, для
        остальных сервисов укажите точное имя модели. Ключи хранятся на этом
        компьютере отдельно от учебной истории. Облачный сервис получает текст
        только при отправке вопроса или генерации.
      </p>
      <div className="studio-fields">
        <label>
          Сервис
          <select
            value={provider}
            onChange={(e) => select(e.target.value as ProviderId)}
            disabled={controlsBusy}
          >
            {Object.entries(providerNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Модель
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            maxLength={200}
            placeholder={
              provider === "codex"
                ? "Модель по умолчанию Codex"
                : provider === "lmstudio"
                  ? "Имя загруженной модели в LM Studio"
                  : "Идентификатор модели из кабинета сервиса"
            }
            disabled={controlsBusy}
          />
          {provider === "codex" && (
            <small>
              Можно оставить пустым или указать модель, доступную в вашем Codex.
            </small>
          )}
        </label>
        {provider === "lmstudio" && (
          <label>
            Адрес LM Studio
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={controlsBusy}
            />
            <small>
              Запустите Local Server в LM Studio. Разрешён адрес этого
              компьютера с путём /v1.
            </small>
          </label>
        )}
        {provider !== "codex" && (
          <label>
            {provider === "lmstudio"
              ? "Токен LM Studio (если включена авторизация)"
              : "Ключ API"}
            <input
              type="password"
              autoComplete="new-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={controlsBusy}
              placeholder={
                config?.providers[provider]?.hasKey
                  ? "Ключ сохранён. Пустое поле оставит его прежним."
                  : "Введите ключ"
              }
              maxLength={500}
            />
          </label>
        )}
      </div>
      {provider === "codex" && <CodexConnection disabled={controlsBusy} />}
      {provider === "lmstudio" && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={fastMode}
            onChange={(e) => setFastMode(e.target.checked)}
            disabled={controlsBusy}
          />
          Без длительного обдумывания (если модель поддерживает)
        </label>
      )}
      <div className="row">
        <button
          className="primary"
          disabled={controlsBusy || (provider !== "codex" && !model.trim())}
          onClick={() => void save()}
        >
          Сохранить подключение
        </button>
        <button
          disabled={controlsBusy || (provider !== "codex" && !model.trim())}
          onClick={() => void test()}
        >
          Проверить соединение
        </button>
        {provider !== "codex" && config?.providers[provider]?.hasKey && (
          <button disabled={controlsBusy} onClick={() => void save(true)}>
            Удалить ключ
          </button>
        )}
      </div>
      <p role="status">{message}</p>
      <p className="small muted">
        Проверка соединения отправляет короткий запрос выбранной модели;{" "}
        {provider === "codex"
          ? "используются лимиты Codex вашего плана ChatGPT."
          : "облачный провайдер может учитывать его по своему тарифу."}
      </p>
    </section>
  );
}
