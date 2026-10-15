import { test, expect } from "@playwright/test";
import { lmsModules } from "../src/content/lms/catalog";

test("курс LMS: каталог, проверка, сохранение и восстановление результатов", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  const catalog = page.getByTestId("lms-course");
  await expect(
    catalog.getByRole("button", { name: /^Открыть тему:/ }),
  ).toHaveCount(27);
  await page.screenshot({ path: "/tmp/physics-lms-catalog.png" });
  await catalog.getByLabel("Найти тему курса").fill("инерции");
  await expect(
    catalog.getByRole("button", { name: /^Открыть тему:/ }),
  ).toHaveCount(1);
  await catalog.getByLabel("Найти тему курса").fill("");
  await catalog.getByLabel("Раздел курса").selectOption("electric");
  await expect(
    catalog.getByRole("button", { name: /^Открыть тему:/ }),
  ).toHaveCount(8);
  await catalog.getByLabel("Раздел курса").selectOption("");
  const m = lmsModules[0];
  await catalog
    .getByRole("button", { name: `Открыть тему: ${m.title}`, exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "00 Обработка измерений", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://lms.sfedu.ru/mod/lesson/view.php?id=30048",
  );
  for (const section of m.sections) {
    const checkbox = page
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: section.title, exact: true }),
      })
      .getByLabel("Раздел прочитан");
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  }
  await page
    .getByRole("button", { name: "Проверка модуля", exact: true })
    .click();
  for (const q of m.questions) {
    await page
      .getByRole("group", { name: q.prompt, exact: true })
      .getByRole("radio")
      .nth(q.correctIndex)
      .check();
  }
  await page.getByRole("button", { name: "Завершить проверку" }).click();
  await expect(page.getByText("Пройдено 100%", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: m.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Баллы: 100 / 100", { exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const backup = await downloadEvent;
  const context = await browser.newContext();
  const second = await context.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Настройки", exact: true }).click();
  await second.getByLabel("Импорт JSON").setInputFiles((await backup.path())!);
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
  await second.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    second.getByRole("heading", { name: m.title, exact: true }),
  ).toBeVisible();
  await expect(
    second.getByText("Баллы: 100 / 100", { exact: true }),
  ).toBeVisible();
  await expect(
    second.getByText("Пройдено 100%", { exact: true }),
  ).toBeVisible();
  await context.close();
});
test("курс LMS помещается на телефоне и передаёт выбранную тему в чат", async ({
  page,
}) => {
  let sentContext = "";
  await page.route("**/api/ai/chat", (route) => {
    sentContext = route.request().postDataJSON().context;
    return route.fulfill({
      json: {
        text: "Интервал описывает неопределённость оценки.",
        provider: "lmstudio",
      },
    });
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("lms-course")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/physics-lms-mobile.png" });
  await page
    .getByRole("button", { name: "Обсудить с ИИ", exact: true })
    .click();
  await page.getByLabel("Тема разговора").selectOption(lmsModules[0].id);
  await page.getByLabel("Ваш вопрос").fill("Что означает интервал?");
  await page.getByRole("button", { name: "Отправить вопрос" }).click();
  await expect(page.getByRole("log")).toContainText(
    "Интервал описывает неопределённость",
  );
  expect(sentContext).toContain(lmsModules[0].sections[0].body);
  await page.reload();
  await page
    .getByRole("button", { name: "Обсудить с ИИ", exact: true })
    .click();
  await page.getByLabel("Тема разговора").selectOption(lmsModules[0].id);
  await expect(page.getByRole("log")).toContainText("Что означает интервал?");
});
