import { test, expect } from "@playwright/test";
import { dayModules } from "../src/content/day-plan/catalog";

test("маршрут по PDF: блок вращения, прогресс, результаты и восстановление", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  const catalog = page.getByTestId("day-plan");
  await expect(
    catalog.getByRole("button", { name: /^Открыть блок:/ }),
  ).toHaveCount(10);
  await expect(catalog).toContainText("0 из 10");
  const m = dayModules.find((m) => m.id === "custom-day-rotation")!;
  await catalog
    .getByRole("button", { name: `Открыть блок: ${m.title}`, exact: true })
    .click();
  await expect(
    page.getByText("ПЛАН ПОДГОТОВКИ · ВЕРСИЯ 1", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("day-lesson-context")).toContainText("6");
  await page
    .getByText("Углубиться: полные темы курса", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Полная тема: Момент инерции геометрических тел",
      exact: true,
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Момент инерции",
  );
  await page.getByRole("button", { name: "Курс", exact: true }).click();
  await catalog
    .getByRole("button", { name: `Открыть блок: ${m.title}`, exact: true })
    .click();
  for (const s of m.sections) {
    const check = page
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: s.title, exact: true }),
      })
      .getByLabel("Раздел прочитан");
    await check.click();
    await expect(check).toBeChecked();
  }
  await page
    .getByRole("button", { name: "Проверка модуля", exact: true })
    .click();
  for (const q of m.questions)
    await page
      .getByRole("group", { name: q.prompt, exact: true })
      .getByRole("radio")
      .nth(q.correctIndex)
      .check();
  await page
    .getByRole("button", { name: "Завершить проверку", exact: true })
    .click();
  await expect(page.getByText("Пройдено 100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Курс", exact: true }).click();
  await expect(catalog).toContainText("1 из 10");
  await page.reload();
  await expect(page.getByTestId("day-plan")).toContainText("1 из 10");
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: m.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Баллы: 100 / 100", { exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const download = await downloadEvent;
  const context = await browser.newContext(),
    second = await context.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Настройки", exact: true }).click();
  await second
    .getByLabel("Импорт JSON")
    .setInputFiles((await download.path())!);
  await expect(
    second.getByText("Проверка пройдена", { exact: true }),
  ).toBeVisible();
  await second.getByLabel("Подтверждаю замену текущих данных").check();
  await second
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(
    second.getByText("Данные заменены проверенной копией."),
  ).toBeVisible();
  await second.getByRole("button", { name: "Закрыть настройки" }).click();
  await second.getByRole("button", { name: "Курс", exact: true }).click();
  await expect(second.getByTestId("day-plan")).toContainText("1 из 10");
  await context.close();
});
test("маршрут на телефоне и контекст его темы в чате", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("day-plan")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Продолжить подготовку", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Основа");
  await page
    .getByRole("button", { name: "Следующий блок", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "А. Движение",
  );
  await page
    .getByRole("button", { name: "Обсудить с ИИ", exact: true })
    .click();
  await page.getByLabel("Тема разговора").selectOption("custom-day-rotation");
  await expect(page.getByLabel("Тема разговора")).toHaveValue(
    "custom-day-rotation",
  );
});

test("все блоки и формулы плана читаются на экране 360 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  for (const m of dayModules) {
    await page
      .getByTestId("day-plan")
      .getByRole("button", { name: `Открыть блок: ${m.title}`, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.title);
    if (m.sections.some((s) => s.body.includes("$")))
      await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      m.title,
    ).toBe(true);
    await page.getByRole("button", { name: "Курс", exact: true }).click();
  }
});
