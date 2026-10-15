import { it, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aiMiddleware } from "../server/api";
it("защищает локальный API и хранит ключ отдельно, не возвращая его", async () => {
  const dir = await mkdtemp(join(tmpdir(), "physics-api-"));
  const server = createServer(aiMiddleware(dir));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const headers = {
    "content-type": "application/json",
    "x-physics-lab": "1",
    origin: base,
  };
  try {
    expect((await fetch(base + "/api/ai/config")).status).toBe(403);
    expect(
      (
        await fetch(base + "/api/ai/config", {
          headers: { ...headers, origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
    const res = await fetch(base + "/api/ai/config", {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "openai",
        model: "test-model",
        apiKey: "secret-test-value",
      }),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("secret-test-value");
    const config = await (
      await fetch(base + "/api/ai/config", { headers })
    ).json();
    expect(config.providers.openai.hasKey).toBe(true);
    expect(JSON.stringify(config)).not.toContain("secret-test-value");
    expect((await stat(join(dir, "providers.json"))).mode & 0o777).toBe(0o600);
    expect(await readFile(join(dir, "providers.json"), "utf8")).toContain(
      "secret-test-value",
    );
    expect(
      (
        await fetch(base + "/api/ai/chat", {
          method: "POST",
          headers,
          body: "x".repeat(600000),
        })
      ).status,
    ).toBe(413);
    await fetch(base + "/api/ai/config", {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "openai",
        model: "test-model",
        removeKey: true,
      }),
    });
    expect(
      (await (await fetch(base + "/api/ai/config", { headers })).json())
        .providers.openai.hasKey,
    ).toBe(false);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
it("исправляет один неверный ответ модели и возвращает проверенный модуль", async () => {
  const draft = {
    title: "Закон Гука",
    objective: "Понять упругость",
    sections: [{ title: "Сила", body: "F=kx" }],
    example: "100 Н/м × 0,02 м = 2 Н",
    questions: Array.from({ length: 5 }, () => ({
      prompt: "Сила при k=100 Н/м и x=0,02 м?",
      options: ["2 Н", "4 Н"],
      answer: "2 Н",
      explanation: "100 × 0,02 = 2",
    })),
    visualizations: [],
  };
  let calls = 0;
  const upstream = createServer(async (req, res) => {
    for await (const _ of req) {
    }
    calls++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                calls === 1 ? "Некорректный ответ" : JSON.stringify(draft),
            },
            finish_reason: "stop",
          },
        ],
      }),
    );
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  const dir = await mkdtemp(join(tmpdir(), "physics-repair-"));
  const server = createServer(aiMiddleware(dir));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = { "content-type": "application/json", "x-physics-lab": "1" };
  try {
    await fetch(base + "/api/ai/config", {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "lmstudio",
        model: "fixture",
        baseUrl: `http://127.0.0.1:${(upstream.address() as { port: number }).port}/v1`,
      }),
    });
    const result = await fetch(base + "/api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "module",
        messages: [{ role: "user", content: "Закон Гука" }],
      }),
    });
    expect(result.status).toBe(200);
    expect((await result.json()).draft.questions[0].correctIndex).toBe(0);
    expect(calls).toBe(2);
  } finally {
    server.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise<void>((r) => server.close(() => r())),
      new Promise<void>((r) => upstream.close(() => r())),
    ]);
    await rm(dir, { recursive: true, force: true });
  }
});
it("сохраняет Codex без ключа и защищает статус агента от чужого сайта", async () => {
  const dir = await mkdtemp(join(tmpdir(), "physics-codex-api-"));
  const server = createServer(aiMiddleware(dir));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = {
    "content-type": "application/json",
    "x-physics-lab": "1",
    origin: base,
  };
  try {
    const saved = await fetch(base + "/api/ai/config", {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: "codex",
        model: "",
        apiKey: "must-not-store",
      }),
    });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      active: "codex",
      providers: { codex: { model: "", hasKey: false } },
    });
    expect(await readFile(join(dir, "providers.json"), "utf8")).not.toContain(
      "must-not-store",
    );
    expect(
      (
        await fetch(base + "/api/ai/codex/status", {
          headers: { ...headers, origin: "https://other.test" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(base + "/api/ai/codex/login", {
          method: "POST",
          headers: { ...headers, origin: "https://other.test" },
          body: "{}",
        })
      ).status,
    ).toBe(403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
it("проводит запрос Codex через локальный HTTP API и проверяет структуру нового модуля", async () => {
  const { createCodexClient } = await import("../server/codex");
  const { writeFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "physics-agent-http-"));
  const draft = {
    title: "Закон Ома",
    objective: "Вычислить ток",
    sections: [{ title: "Связь", body: "I=U/R" }],
    example: "6 В / 100 Ом = 0,06 А",
    questions: Array.from({ length: 3 }, () => ({
      prompt: "Ток при 6 В и 100 Ом?",
      options: ["0,06 А", "6 А"],
      answer: "0,06 А",
      explanation: "Делим напряжение на сопротивление.",
    })),
    visualizations: [],
  };
  await writeFile(
    join(dir, "fixture.json"),
    JSON.stringify({ answer: JSON.stringify(draft) }),
  );
  const client = createCodexClient({
    executable: resolve("tests/fixtures/codex-cli.mjs"),
    environment: { ...process.env, CODEX_HOME: dir },
  });
  const server = createServer(aiMiddleware(dir, client));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = {
    "content-type": "application/json",
    "x-physics-lab": "1",
    origin: base,
  };
  try {
    await fetch(base + "/api/ai/config", {
      method: "POST",
      headers,
      body: JSON.stringify({ provider: "codex", model: "" }),
    });
    const status = await (
      await fetch(base + "/api/ai/codex/status", { headers })
    ).json();
    expect(status).toMatchObject({
      installed: true,
      authenticated: true,
      authMode: "chatgpt",
    });
    const response = await fetch(base + "/api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "module",
        messages: [{ role: "user", content: "Закон Ома" }],
      }),
    });
    expect(response.status).toBe(200);
    const output = await response.json();
    expect(output.provider).toBe("codex");
    expect(output.draft.title).toBe("Закон Ома");
    expect(output.draft.questions[0].correctIndex).toBe(0);
  } finally {
    await client.dispose();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
