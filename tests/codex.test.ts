import { it, expect } from "vitest";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createCodexClient } from "../server/codex";

async function fixture(config: Record<string, unknown> = {}) {
  const dir = await mkdtemp(join(tmpdir(), "physics-codex-test-"));
  const record = join(dir, "record.json"),
    inputRecord = join(dir, "input.txt");
  await writeFile(
    join(dir, "fixture.json"),
    JSON.stringify({ record, inputRecord, ...config }),
  );
  const client = createCodexClient({
    executable: resolve("tests/fixtures/codex-cli.mjs"),
    environment: {
      ...process.env,
      CODEX_HOME: dir,
      OPENAI_API_KEY: "must-not-leak",
      CODEX_API_KEY: "must-not-leak",
    },
  });
  return {
    dir,
    record,
    inputRecord,
    client,
    async dispose() {
      client.cancelLogin();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
it("передаёт контекст через stdin и использует изолированный каталог без API-ключей", async () => {
  const f = await fixture();
  try {
    expect(await f.client.status()).toMatchObject({
      installed: true,
      authenticated: true,
      authMode: "chatgpt",
    });
    const text = await f.client.ask("", "Объясняй физику", [
      { role: "user", content: 'Как считать "путь"? $(touch unwanted) `text`' },
    ]);
    expect(text).toBe("Объяснение силы: F = ma.");
    const recorded = JSON.parse(await readFile(f.record, "utf8"));
    expect(recorded.args).toContain("--ignore-user-config");
    expect(recorded.args).toContain("--ephemeral");
    expect(recorded.args).toContain("read-only");
    expect(recorded.args).not.toContain("--model");
    expect(recorded.api).toBeUndefined();
    expect(recorded.codexApi).toBeUndefined();
    expect(await readFile(f.inputRecord, "utf8")).toContain(
      "$(touch unwanted)",
    );
    expect(await readFile(f.inputRecord, "utf8")).toContain("Объясняй физику");
    await expect(access(recorded.cwd)).rejects.toThrow();
  } finally {
    await f.dispose();
  }
});
it("отклоняет API-вход и не запускает модель без входа по подписке", async () => {
  const f = await fixture({ auth: "api" });
  try {
    expect(await f.client.status()).toMatchObject({
      installed: true,
      authenticated: false,
      authMode: "apiKey",
    });
    await expect(
      f.client.ask("model", "", [{ role: "user", content: "Вопрос" }]),
    ).rejects.toThrow(/ChatGPT/);
    await expect(access(f.inputRecord)).rejects.toThrow();
  } finally {
    await f.dispose();
  }
});
it("сообщает об отсутствующем Codex без сырой ошибки процесса", async () => {
  const c = createCodexClient({ executable: "/missing/physics-codex" });
  expect(await c.status()).toMatchObject({
    installed: false,
    authenticated: false,
  });
  await expect(
    c.ask("", "", [{ role: "user", content: "Вопрос" }]),
  ).rejects.toThrow(/установ/);
});
it("отмена завершает запущенный процесс и удаляет его каталог", async () => {
  const f = await fixture({ hang: true });
  try {
    const controller = new AbortController();
    const pending = f.client.ask(
      "",
      "",
      [{ role: "user", content: "Вопрос" }],
      controller.signal,
      1000,
    );
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    for (let i = 0; i < 100; i++) {
      try {
        await access(f.inputRecord);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    controller.abort();
    await rejected;
    const record = JSON.parse(await readFile(f.record, "utf8"));
    await expect(access(record.cwd)).rejects.toThrow();
  } finally {
    await f.dispose();
  }
});
it("таймаут и лимит Codex возвращают понятные ошибки", async () => {
  const hanging = await fixture({ hang: true });
  const limited = await fixture({
    fail: "rate limit reached; bearer private-value",
  });
  try {
    await expect(
      hanging.client.ask(
        "",
        "",
        [{ role: "user", content: "Вопрос" }],
        undefined,
        100,
      ),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    await expect(
      limited.client.ask("", "", [{ role: "user", content: "Вопрос" }]),
    ).rejects.toThrow(/Лимит/);
  } finally {
    await hanging.dispose();
    await limited.dispose();
  }
});
it("вход возвращает только адрес проверки и код; отмена останавливает вход", async () => {
  const f = await fixture({ auth: "none" });
  try {
    expect(await f.client.startLogin()).toMatchObject({
      state: "pending",
      url: "https://auth.openai.com/codex/device",
      code: "ABCD-12345",
    });
    f.client.cancelLogin();
    await expect.poll(() => f.client.loginState().state).toBe("cancelled");
  } finally {
    await f.dispose();
  }
});
it("отмена входа не заменяется поздним подтверждением завершившегося login", async () => {
  const f = await fixture({ auth: "none", loginComplete: true });
  try {
    await f.client.startLogin();
    await new Promise((r) => setTimeout(r, 100));
    f.client.cancelLogin();
    await new Promise((r) => setTimeout(r, 500));
    expect(f.client.loginState().state).toBe("cancelled");
  } finally {
    await f.client.dispose();
    await f.dispose();
  }
});
it.each([
  [{ answer: "  " }, /пустой/],
  [{ large: true }, /слишком большой/],
])("не принимает непригодный ответ Codex: %j", async (config, message) => {
  const f = await fixture(config);
  try {
    await expect(
      f.client.ask("", "", [{ role: "user", content: "Вопрос" }]),
    ).rejects.toThrow(message);
  } finally {
    await f.dispose();
  }
});
it("принимает завершённый ответ после временного разрыва потока", async () => {
  const f = await fixture({
    transientError: true,
    answer: "Момент силы M = Fd.",
  });
  try {
    await expect(
      f.client.ask("", "", [{ role: "user", content: "Момент силы" }]),
    ).resolves.toBe("Момент силы M = Fd.");
  } finally {
    await f.dispose();
  }
});
it.each([{ incomplete: true }, { turnFailed: true }])(
  "не выдаёт незавершённый ответ за готовый модуль: %j",
  async (config) => {
    const f = await fixture(config);
    try {
      await expect(
        f.client.ask("", "", [{ role: "user", content: "Момент силы" }]),
      ).rejects.toThrow(/Codex не выполнил/);
    } finally {
      await f.dispose();
    }
  },
);
