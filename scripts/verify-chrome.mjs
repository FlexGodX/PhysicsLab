import { chromium, expect } from "@playwright/test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = await mkdtemp(join(tmpdir(), "physics-chrome-acceptance-"));
const url = process.env.PHYSICS_VERIFY_URL || "http://127.0.0.1:5174/";
const options = {
  channel: "chrome",
  headless: false,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "no-preference",
  args: ["--no-first-run", "--no-default-browser-check"],
};
let context;
const evidence = {
  date: new Date().toISOString(),
  browser: "",
  mode: "installed Chrome, headed, isolated persistent profile",
  url,
  restart: {},
  performance: {},
  pageErrors: [],
};
try {
  context = await chromium.launchPersistentContext(directory, options);
  evidence.browser = context.browser().version();
  let page = await context.newPage();
  page.on("pageerror", (e) => evidence.pageErrors.push(e.message));
  await page.goto(url);
  await page.bringToFront();
  await page
    .getByRole("button", { name: "Начать занятие", exact: true })
    .click();
  await page.getByRole("tab", { name: "Эксперимент", exact: false }).click();
  await page
    .getByLabel("Мой прогноз")
    .fill("Техническая проверка: при a=2 м/с² за 4 с путь 16 м.");
  await page
    .getByRole("button", { name: "К концу опыта", exact: true })
    .click();
  await expect(page.getByTestId("distance-value")).toHaveText("16 м");
  await expect(page.getByTestId("velocity-value")).toHaveText("8 м/с");
  const conclusion =
    "Проверка перезапуска Chrome: путь при разгоне равен 16 м.";
  await page.getByLabel("Мои наблюдения").fill("Путь 16 м, скорость 8 м/с.");
  await page.getByLabel("Мой вывод").fill(conclusion);
  await page
    .getByRole("button", { name: "Сохранить опыт", exact: true })
    .click();
  await expect(page.getByText("Опыт сохранён.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Тренировка", exact: false }).click();
  await page.getByLabel("Число", { exact: true }).fill("4");
  await page.getByLabel("Единица ответа").selectOption("м/с²");
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(
    page.getByText("Число верное. Проверьте единицу измерения.", {
      exact: true,
    }),
  ).toBeVisible();
  const snapshot = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("physics-lab");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const get = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("current");
          get.onsuccess = () => {
            resolve(get.result);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );
  await context.close();
  context = null;
  context = await chromium.launchPersistentContext(directory, options);
  page = await context.newPage();
  page.on("pageerror", (e) => evidence.pageErrors.push(e.message));
  await page.goto(url);
  await page.bringToFront();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(page.getByText(conclusion, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /20 м за 5 с/ }),
  ).toBeVisible();
  const restored = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("physics-lab");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const get = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("current");
          get.onsuccess = () => {
            resolve(get.result);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );
  expect(restored).toEqual(snapshot);
  evidence.restart = {
    passed: true,
    attempts: restored.attempts.length,
    experiments: restored.experiments.length,
    exactSnapshotEqual: true,
  };
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("circular");
  const slider = page.getByRole("slider", {
    name: "Радиус R, м — ползунок",
    exact: true,
  });
  await slider.scrollIntoViewIfNeeded();
  const latencies = [];
  for (let i = 0; i < 20; i++) {
    const ms = await slider.evaluate(
      (element, index) =>
        new Promise((resolve, reject) => {
          const metric = document.querySelector(
            '[data-testid="metric-acceleration"]',
          );
          const previous = metric.textContent;
          const start = performance.now();
          const timeout = setTimeout(
            () => reject(new Error("No metric response")),
            1000,
          );
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          ).set.call(element, index % 2 ? 5 : 6);
          element.dispatchEvent(new Event("input", { bubbles: true }));
          const check = () => {
            if (metric.textContent !== previous) {
              clearTimeout(timeout);
              resolve(performance.now() - start);
            } else requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        }),
      i,
    );
    latencies.push(ms);
  }
  await page.locator(".model-scene").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  const animation = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const start = performance.now();
        let frames = 0,
          changes = 0,
          previous = "";
        const circle = document.querySelector('.model-scene circle[r="7"]');
        const tick = (now) => {
          frames++;
          const next =
            circle.getAttribute("cx") + "," + circle.getAttribute("cy");
          if (previous && previous !== next) changes++;
          previous = next;
          if (now - start >= 3000)
            resolve({
              durationMs: now - start,
              frames,
              scenePositionChanges: changes,
              visible: !document.hidden,
            });
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  evidence.performance = {
    model: "circular",
    viewport: "1440x1000",
    sliderLatencyMs: {
      samples: latencies,
      maximum: Math.max(...latencies),
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    },
    animation,
    sceneUpdatesPerSecond:
      animation.scenePositionChanges / (animation.durationMs / 1000),
    measurement:
      "input event to changed readout observed at animation frame; SVG position changes per visible animation frame, not display scanout",
  };
  evidence.performance.additionalModels = [];
  for (const [model, selector] of [
    ["linear", ".scene svg"],
    ["gas", ".model-scene"],
    ["lightClock", ".clock-panels"],
    ["circuit", 'svg[aria-label^="Выделенная энергия E(t)"]'],
  ]) {
    await page.getByLabel("Модель эксперимента").selectOption(model);
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Запустить", exact: true }).click();
    const sample = await page.evaluate(
      (selector) =>
        new Promise((resolve) => {
          const node = document.querySelector(selector),
            start = performance.now();
          let previous = "",
            frames = 0,
            changes = 0;
          const tick = (now) => {
            frames++;
            const next = node.outerHTML;
            if (previous && previous !== next) changes++;
            previous = next;
            if (now - start >= 3000)
              resolve({
                durationMs: now - start,
                frames,
                sceneChanges: changes,
                visible: !document.hidden,
              });
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      selector,
    );
    const pause = page.getByRole("button", { name: "Пауза", exact: true });
    if (await pause.isVisible()) await pause.click();
    const updatesPerSecond = sample.sceneChanges / (sample.durationMs / 1000);
    evidence.performance.additionalModels.push({
      model,
      selector,
      ...sample,
      updatesPerSecond,
    });
    console.log(JSON.stringify({ model, updatesPerSecond }));
    expect(sample.visible).toBe(true);
    expect(updatesPerSecond).toBeGreaterThanOrEqual(30);
  }
  expect(evidence.performance.sliderLatencyMs.maximum).toBeLessThan(100);
  expect(evidence.performance.sceneUpdatesPerSecond).toBeGreaterThanOrEqual(30);
  expect(evidence.pageErrors).toEqual([]);
  expect(animation.visible).toBe(true);
  await writeFile(
    "docs/verification/2026-10-15-chrome-restart-performance.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await context?.close();
  await rm(directory, { recursive: true, force: true });
}
