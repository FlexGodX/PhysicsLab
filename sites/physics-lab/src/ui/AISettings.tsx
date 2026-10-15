import { useEffect, useState, useRef } from "react";
import { aiRequest, providerNames, type PublicConfig } from "../studio/api";
import {
  cloudProviders,
  saveHostedChoice,
  type CloudProvider,
} from "../studio/hostedConfig";
import { providers } from "../../lib/provider-registry";
type Model = { id: string; name: string };
export function AISettings() {
  const [needsLogin, setNeedsLogin] = useState(false);
  const [provider, setProvider] = useState<CloudProvider>("openrouter"),
    [model, setModel] = useState(""),
    [baseUrl, setBaseUrl] = useState(""),
    [key, setKey] = useState(""),
    [config, setConfig] = useState<PublicConfig | null>(null),
    [models, setModels] = useState<Model[]>([]),
    [filter, setFilter] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const mounted = useRef(true),
    controller = useRef<AbortController | null>(null);
  function select(id: CloudProvider, c = config) {
    setProvider(id);
    setModel(c?.providers[id]?.model || "");
    setBaseUrl(c?.providers[id]?.baseUrl || providers[id].baseUrl);
    setKey("");
    setModels([]);
    setFilter("");
    setMessage("");
  }
  useEffect(() => {
    mounted.current = true;
    const ac = new AbortController();
    aiRequest<PublicConfig>("config", undefined, ac.signal)
      .then((c) => {
        if (mounted.current) {
          setConfig(c);
          select(c.active as CloudProvider, c);
        }
      })
      .catch((e) => {
        if (mounted.current && e.name !== "AbortError") {
          setMessage(e.message);
          setNeedsLogin(e.message.includes("Войдите"));
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
      ac.abort();
      controller.current?.abort();
    };
  }, []);
  async function action(kind: "save" | "models" | "test" | "remove") {
    setBusy(true);
    setMessage("");
    const ac = new AbortController();
    controller.current = ac;
    try {
      const c = await aiRequest<PublicConfig>(
        "config",
        {
          provider,
          model,
          baseUrl,
          apiKey: kind === "remove" ? "" : key,
          removeKey: kind === "remove",
        },
        ac.signal,
      );
      if (!mounted.current) return;
      setConfig(c);
      setKey("");
      saveHostedChoice(provider, model);
      if (kind === "models") {
        const list = await aiRequest<{
          provider: CloudProvider;
          models: Model[];
        }>(`models?provider=${provider}`, undefined, ac.signal);
        if (!mounted.current) return;
        setModels(list.models);
        setMessage(
          list.models.length
            ? `Загружено моделей: ${list.models.length}. Выберите модель и сохраните настройки.`
            : "Список пуст. Введите идентификатор модели вручную.",
        );
      } else if (kind === "test") {
        const r = await aiRequest<{ text: string }>(
          "chat",
          {
            kind: "test",
            messages: [
              { role: "user", content: "Ответь одним словом: готово" },
            ],
          },
          ac.signal,
        );
        if (mounted.current)
          setMessage("Соединение работает: " + r.text.slice(0, 200));
      } else
        setMessage(
          kind === "remove"
            ? "Ключ удалён."
            : "Настройки сохранены. Можно использовать чат и мастерскую.",
        );
    } catch (e) {
      if (mounted.current)
        setMessage(
          (e as Error).name === "AbortError"
            ? "Запрос отменён."
            : (e as Error).message,
        );
    } finally {
      if (mounted.current) setBusy(false);
      controller.current = null;
    }
  }
  const locked = loading || busy || needsLogin,
    visible = models.filter((m) =>
      `${m.id} ${m.name}`
        .toLocaleLowerCase()
        .includes(filter.toLocaleLowerCase()),
    );
  return (
    <section className="panel ai-settings">
      <h2>Подключение ИИ</h2>
      {needsLogin && (
        <p className="callout">
          <a
            href="/signin-with-chatgpt?return_to=%2F"
            target="_top"
            style={{ textDecoration: "underline" }}
          >
            Войти через ChatGPT для личных настроек ИИ
          </a>
          . Ключи хранятся отдельно для каждого пользователя.
        </p>
      )}
      <p>
        Выберите сервис, введите его API-ключ и сохраните настройки. Для каждого
        провайдера сохраняются свой ключ и модель. Ключ хранится на сервере в
        зашифрованном виде и не входит в резервную копию занятий.
      </p>
      <div className="studio-fields">
        <label>
          Сервис
          <select
            value={provider}
            disabled={locked}
            onChange={(e) => select(e.target.value as CloudProvider)}
          >
            {cloudProviders.map((p) => (
              <option key={p} value={p}>
                {providerNames[p]}
              </option>
            ))}
          </select>
        </label>
        {provider === "qwen" && (
          <label>
            Регион Qwen
            <select
              disabled={locked}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            >
              <option value="https://dashscope-intl.aliyuncs.com/compatible-mode/v1">
                Сингапур / международный
              </option>
              <option value="https://dashscope.aliyuncs.com/compatible-mode/v1">
                Китай
              </option>
              <option value="https://dashscope-us.aliyuncs.com/compatible-mode/v1">
                США
              </option>
            </select>
          </label>
        )}
        {provider === "ollama" && (
          <label>
            Адрес сервера Ollama
            <input
              type="url"
              disabled={locked}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ollama.com"
              maxLength={300}
            />
          </label>
        )}
        <label>
          API-ключ
          <input
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            value={key}
            disabled={locked}
            onChange={(e) => setKey(e.target.value)}
            placeholder={
              config?.providers[provider]?.hasKey
                ? "Ключ сохранён; пустое поле оставит его прежним"
                : "Вставьте ключ выбранного сервиса"
            }
            maxLength={4096}
          />
        </label>
        <label>
          Модель
          <input
            value={model}
            maxLength={200}
            disabled={locked}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Выберите из списка или введите идентификатор"
          />
        </label>
      </div>
      <p>
        {config?.providers[provider]?.hasKey
          ? "Ключ сервиса сохранён."
          : "Ключ не добавлен."}
      </p>
      {provider === "ollama" && (
        <p>
          По умолчанию используется Ollama Cloud. Для собственного сервера нужен
          общедоступный HTTPS-адрес. Localhost и адреса домашней сети с сайта
          недоступны. У сервера без авторизации ключ можно оставить пустым.
        </p>
      )}
      {provider === "qwen" && (
        <p>
          Регион должен совпадать с регионом вашего ключа Alibaba Cloud Model
          Studio.
        </p>
      )}
      <div className="row">
        <button disabled={locked} onClick={() => void action("save")}>
          Сохранить настройки ИИ
        </button>
        <button disabled={locked} onClick={() => void action("models")}>
          Загрузить модели
        </button>
        <button
          disabled={locked || !model.trim()}
          onClick={() => void action("test")}
        >
          Проверить соединение
        </button>
        {config?.providers[provider]?.hasKey && (
          <button disabled={locked} onClick={() => void action("remove")}>
            Удалить API-ключ
          </button>
        )}
        {busy && (
          <button onClick={() => controller.current?.abort()}>
            Отменить запрос
          </button>
        )}
      </div>
      {models.length > 0 && (
        <div className="studio-fields">
          <label>
            Поиск модели
            <input
              disabled={locked}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Название или идентификатор"
            />
          </label>
          <label>
            Доступные модели
            <select
              value={models.some((m) => m.id === model) ? model : ""}
              disabled={locked}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">Выберите модель</option>
              {visible.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name === m.id ? m.id : `${m.name} — ${m.id}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p role="status">{message}</p>
      <p className="small muted">
        Список моделей не подтверждает доступ к каждой из них. «Проверить
        соединение» отправляет короткий запрос и может расходовать баланс
        провайдера. Учебный материал передаётся ИИ только по вашему запросу.
      </p>
      <p className="small muted">
        Codex по подписке и LM Studio доступны в локальной версии. История
        веб-сайта хранится в браузере; перенос записей выполняется через
        JSON-копию.
      </p>
    </section>
  );
}
