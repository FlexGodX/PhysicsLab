import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("создаёт модель на площадке, фиксирует исследование, переносит и воспроизводит снимок", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/ai/chat", async (route) => {
    const request = route.request().postDataJSON();
    if (request.kind === "chat") {
      const context = JSON.parse(request.context);
      expect(context.formulas).toContain("x/1000");
      expect(context.measurementCount).toBe(2);
    }
    await route.fulfill({
      json:
        request.kind === "visualization"
          ? {
              visualization: {
                title: "Упругость в исследовании",
                mechanism: "spring",
                caption: "F=kx. Линейная область упругости.",
              },
              provider: "codex",
            }
          : {
              text: "При постоянной жёсткости сила пропорциональна удлинению.",
              provider: "codex",
            },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Визуализации Anatomy", exact: true })
    .click();
  await expect(page.locator(".anatomy-figure")).toHaveCount(0);
  await page
    .getByText("Пример того, что можно создать", { exact: true })
    .click();
  await expect(page.locator(".anatomy-figure")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Использовать пример промпта" })
    .click();
  await expect(
    page.getByLabel("Что показать в дополнительной визуализации?"),
  ).toHaveValue(/пружин/i);
  await page
    .getByText("Пример того, что можно создать", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Создать визуализацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сохранить визуализацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Исследовать на площадке", exact: true })
    .click();
  await page
    .getByLabel("Вопрос исследования", { exact: true })
    .fill("Как сила зависит от удлинения при одном k?");
  await page
    .getByLabel("Моё предположение", { exact: true })
    .fill("Удвоение удлинения удвоит силу");
  await page.getByLabel("Связать с модулем").selectOption("K1");
  await page
    .getByRole("button", { name: "Снять показания", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Моё предположение", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Лабораторные модели", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Визуализации Anatomy", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Измерения визуализации", exact: true })
      .getByRole("row"),
  ).toHaveCount(2);
  const slider = page.getByLabel("Удлинение, мм", { exact: true });
  await slider.focus();
  await slider.press("End");
  await expect(page.locator(".anatomy-readout output")).toContainText(
    "F = 10.00 Н",
  );
  await page
    .getByRole("button", { name: "Снять показания", exact: true })
    .click();
  const table = page.getByRole("region", {
    name: "Измерения визуализации",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table).toContainText("10");
  await page
    .getByRole("button", { name: "Объяснить результаты с ИИ", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "При постоянной жёсткости" }),
  ).toBeVisible();
  await page
    .getByLabel("Наблюдения исследования")
    .fill("От 2 Н до 10 Н при 20 и 100 мм");
  await page
    .getByLabel("Вывод исследования")
    .fill("При одинаковой жёсткости F пропорциональна x");
  await page
    .getByRole("button", { name: "Сохранить исследование", exact: true })
    .click();
  await expect(
    page.getByText("Исследование сохранено в результатах.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  const result = page.getByTestId("visualization-result");
  await expect(result).toContainText("Как сила зависит");
  await expect(result).toContainText("Удвоение удлинения");
  await expect(
    result
      .getByRole("region", { name: "Измерения визуализации" })
      .getByRole("row"),
  ).toHaveCount(3);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const backup = await download;
  const other = await browser.newContext();
  const restored = await other.newPage();
  await restored.goto("/");
  await restored
    .getByRole("button", { name: "Настройки", exact: true })
    .click();
  await restored
    .getByLabel("Импорт JSON")
    .setInputFiles((await backup.path())!);
  await restored.getByLabel("Подтверждаю замену текущих данных").check();
  await restored
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(
    restored.getByText("Данные заменены проверенной копией."),
  ).toBeVisible();
  await restored.getByRole("button", { name: "Закрыть настройки" }).click();
  await restored
    .getByRole("button", { name: "Результаты", exact: true })
    .click();
  await expect(restored.getByTestId("visualization-result")).toContainText(
    "От 2 Н до 10 Н",
  );
  await other.close();
  await result.getByRole("button", { name: "Повторить исследование" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Исследование: Упругость в исследовании",
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Моё предположение", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("region", { name: "Измерения визуализации" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Удлинение, мм", { exact: true })).toHaveValue(
    "20",
  );
});

test("новая сцена исследуется серией на телефоне и сохраняет исходный промпт", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        visualization: {
          title: "Работа постоянной силы",
          mechanism: "custom",
          caption: "Постоянная сила 5 Н направлена вдоль перемещения. A=F*s.",
          scene: {
            controls: [
              {
                id: "s",
                label: "Перемещение, м",
                min: 0,
                max: 10,
                value: 2,
                step: 1,
              },
            ],
            parts: Array.from({ length: 40 }, (_, i) => ({
              name: `Деталь ${i + 1}`,
              x: (i % 10) * 12,
              y: Math.floor(i / 10) * 15,
              z: 0,
              w: 10,
              d: 10,
              h: 5,
              lit: i === 0,
              move: i === 0 ? { control: "s", axis: "x", scale: 2 } : null,
            })),
            readouts: [{ label: "Работа", expression: "5*s", unit: "Дж" }],
          },
        },
        provider: "codex",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Мастерская", exact: true }).click();
  await page
    .getByLabel("Что показать в дополнительной визуализации?")
    .fill("Покажи работу постоянной силы 5 Н");
  await page
    .getByRole("button", { name: "Создать визуализацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сохранить визуализацию", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Исследовать на площадке", exact: true })
    .click();
  await page
    .getByLabel("Вопрос исследования", { exact: true })
    .fill("Как работа зависит от перемещения?");
  await page
    .getByLabel("Моё предположение", { exact: true })
    .fill("Пропорционально");
  await page.getByRole("button", { name: "Снять серию", exact: true }).click();
  const table = page.getByRole("region", {
    name: "Измерения визуализации",
    exact: true,
  });
  await expect(table.getByRole("row")).toHaveCount(12);
  await expect(table.getByRole("row").last()).toHaveText("111050");
  await expect(page.locator(".anatomy-readout output")).toHaveText(
    "Работа: 50 Дж",
  );
  await page.getByText("Исходный промпт модели", { exact: true }).click();
  await expect(
    page.getByText("Покажи работу постоянной силы 5 Н", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByLabel("Наблюдения исследования").fill("Работа от 0 до 50 Дж");
  await page
    .getByLabel("Вывод исследования")
    .fill("Работа равна 5*s при выбранной силе");
  await page
    .getByRole("button", { name: "Сохранить исследование", exact: true })
    .click();
  await expect(
    page.getByText("Исследование сохранено в результатах.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Начать новое исследование", exact: true })
    .click();
  await expect(table).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Моё предположение", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByTestId("visualization-result").getByRole("row"),
  ).toHaveCount(12);
});

test("неподдерживаемая тема сохраняет запрос для уточнения", async ({
  page,
}) => {
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      status: 422,
      json: {
        error:
          "Для этой модели требуется моделирование столкновений. Уточните упрощённый опыт.",
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Визуализации Anatomy", exact: true })
    .click();
  const prompt = page.getByLabel("Что показать в дополнительной визуализации?");
  await prompt.fill("Столкновение сложных упругих тел");
  await page
    .getByRole("button", { name: "Создать визуализацию", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "требуется моделирование столкновений" }),
  ).toBeVisible();
  await expect(prompt).toHaveValue("Столкновение сложных упругих тел");
  await expect(
    page.getByRole("button", { name: "Исследовать на площадке" }),
  ).toHaveCount(0);
});
