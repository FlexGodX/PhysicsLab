import { it, expect, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  saveProviderConfig,
  loadProviderConfig,
  publicProviderConfig,
} from "../sites/physics-lab/lib/provider-store";
import { hostedAI } from "../sites/physics-lab/lib/hosted-ai";
function storage() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      "sites/physics-lab/drizzle/0000_motionless_mac_gargan.sql",
      "utf8",
    ),
  );
  const adapter = {
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            async all() {
              return { results: db.prepare(sql).all(...args) };
            },
            async first() {
              return db.prepare(sql).get(...args) || null;
            },
            async run() {
              return db.prepare(sql).run(...args);
            },
          };
        },
      };
    },
    async batch(queries: any[]) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const q of queries) results.push(await q.run());
        db.exec("COMMIT");
        return results;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return {
    db,
    env: {
      DB: adapter as any,
      PHYSICS_KEY_ENCRYPTION_KEY: btoa(
        String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
      ),
    },
  };
}
function req(path: string, body?: unknown, user = "alice") {
  return new Request("https://lab.example/api/ai/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "oai-authenticated-user-id": user,
      "X-Physics-Lab": "1",
      Origin: "https://lab.example",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
it("D1 сохраняет отдельные зашифрованные ключи, пустой ввод не удаляет, другой пользователь не видит настройки", async () => {
  const { db, env } = storage();
  await saveProviderConfig(
    env,
    "alice",
    "openrouter",
    "model-a",
    "",
    "secret-a",
    false,
  );
  await saveProviderConfig(
    env,
    "alice",
    "deepseek",
    "model-b",
    "",
    "secret-b",
    false,
  );
  await saveProviderConfig(
    env,
    "alice",
    "openrouter",
    "model-c",
    "",
    "",
    false,
  );
  const a = await loadProviderConfig(env, "alice"),
    b = await loadProviderConfig(env, "bob");
  expect(a.active).toBe("openrouter");
  expect(a.settings.openrouter.apiKey).toBe("secret-a");
  expect(a.settings.deepseek.apiKey).toBe("secret-b");
  expect(b.settings.openrouter.apiKey).toBe("");
  expect(
    JSON.stringify(db.prepare("SELECT * FROM ai_provider_settings").all()),
  ).not.toContain("secret-a");
  expect(JSON.stringify(publicProviderConfig(a))).not.toContain("secret-a");
  await saveProviderConfig(
    { ...env, OPENROUTER_API_KEY: "env-key" },
    "alice",
    "openrouter",
    "model-c",
    "",
    "",
    true,
  );
  expect(
    (
      await loadProviderConfig(
        { ...env, OPENROUTER_API_KEY: "env-key" },
        "alice",
      )
    ).settings.openrouter.apiKey,
  ).toBe("");
});
it("смена адреса Ollama требует явного нового ключа и не переносит старый секрет на другой сервер", async () => {
  const { env } = storage();
  await saveProviderConfig(env, "alice", "ollama", "m", "", "secret", false);
  await expect(
    saveProviderConfig(
      env,
      "alice",
      "ollama",
      "m",
      "https://ollama.example.org",
      "",
      false,
    ),
  ).rejects.toThrow();
  expect((await loadProviderConfig(env, "alice")).settings.ollama.baseUrl).toBe(
    "https://ollama.com",
  );
});
it("сохранённый провайдер и модель используются чатом, ключ не возвращается в API, каталог моделей разбирается", async () => {
  const { env } = storage();
  const saved = await hostedAI(
    req("config", {
      provider: "nvidia",
      model: "chat-model",
      apiKey: "fake-key",
    }),
    env,
  );
  expect(saved.status).toBe(200);
  expect(JSON.stringify(await saved.json())).not.toContain("fake-key");
  const fetcher = vi.fn(
    async (input: any, init: any) =>
      new Response(
        JSON.stringify(
          init.method === "POST"
            ? {
                choices: [
                  { message: { content: "Ответ" }, finish_reason: "stop" },
                ],
              }
            : { data: [{ id: "chat-model" }] },
        ),
      ),
  );
  const models = await hostedAI(req("models?provider=nvidia"), env, fetcher);
  expect((await models.json()).models).toEqual([
    { id: "chat-model", name: "chat-model" },
  ]);
  expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
  const chat = await hostedAI(
    req("chat", {
      kind: "chat",
      messages: [{ role: "user", content: "Вопрос" }],
    }),
    env,
    fetcher,
  );
  expect((await chat.json()).text).toBe("Ответ");
  expect(fetcher.mock.calls.at(-1)?.[0]).toBe(
    "https://integrate.api.nvidia.com/v1/chat/completions",
  );
  expect(fetcher.mock.calls.at(-1)?.[1].headers.Authorization).toBe(
    "Bearer fake-key",
  );
  expect((await hostedAI(req("config", undefined, "bob"), env)).status).toBe(
    200,
  );
  const bob = await (
    await hostedAI(req("config", undefined, "bob"), env)
  ).json();
  expect(bob.providers.nvidia.hasKey).toBe(false);
});
