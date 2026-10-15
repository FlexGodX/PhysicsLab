import { test, expect } from "@playwright/test";
test("площадка переключает модели с согласованными контрольными значениями", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("circular");
  await expect(page.getByTestId("metric-acceleration")).toContainText("5");
  await page.getByRole("button", { name: "Убрать удерживающую силу" }).click();
  await expect(page.getByTestId("metric-acceleration")).toContainText("0");
  await page.getByLabel("Модель эксперимента").selectOption("measurements");
  await page.getByLabel("Источник измерений").selectOption("manual");
  await page.getByLabel("Серия измерений, м").fill("0,99; 1,00; 1,01");
  await page.getByRole("button", { name: "Рассчитать серию" }).click();
  await expect(
    page.getByText("1,000 ± 0,025 м", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Модель эксперимента").selectOption("gas");
  await page.getByRole("button", { name: "К концу процесса" }).click();
  await expect(page.getByTestId("metric-heat")).toContainText("124,717");
  await page.getByLabel("Модель эксперимента").selectOption("lightClock");
  await expect(page.getByTestId("metric-gamma")).toContainText("1,25");
  await page.getByRole("button", { name: "Отражение", exact: true }).click();
  await expect(page.getByTestId("metric-labTime")).toContainText("1,251");
  await page.getByLabel("Модель эксперимента").selectOption("circuit");
  await expect(page.getByTestId("metric-current")).toContainText("0,06");
});
test("настройка газа сохраняется отдельным опытом и восстанавливается после перезагрузки", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("gas");
  await page
    .getByLabel("Мой прогноз")
    .fill("Вся теплота увеличит внутреннюю энергию");
  await page.getByRole("button", { name: "К концу процесса" }).click();
  await page.getByLabel("Мои наблюдения").fill("Работа равна нулю");
  await page
    .getByLabel("Мой вывод")
    .fill("В жёстком сосуде газ не совершает работу расширения");
  await page
    .getByRole("button", { name: "Сохранить опыт", exact: true })
    .click();
  await expect(page.getByText("Опыт сохранён.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByText("В жёстком сосуде газ не совершает работу расширения", {
      exact: true,
    }),
  ).toBeVisible();
});

test("свет после отражения оставляет ломаную траекторию", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("lightClock");
  await page.getByRole("button", { name: "Возврат", exact: true }).click();
  await expect(page.locator('[data-testid="light-path-lab"]')).toHaveAttribute(
    "points",
    /\S+ \S+ \S+/,
  );
});
test("сравнение после сохранения второго опыта сохраняет первый как основание", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("gas");
  for (const index of [1, 2]) {
    if (index === 2)
      await page
        .getByRole("button", { name: "Постоянное давление", exact: true })
        .click();
    await page.getByLabel("Мой прогноз").fill(`Прогноз ${index}`);
    await page.getByRole("button", { name: "К концу процесса" }).click();
    await page.getByLabel("Мои наблюдения").fill(`Наблюдение ${index}`);
    await page.getByLabel("Мой вывод").fill(`Собственный вывод ${index}`);
    await page
      .getByRole("button", { name: "Сохранить опыт", exact: true })
      .click();
    await expect(
      page.getByText("Опыт сохранён.", { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Сравнить с предыдущим опытом" })
    .click();
  await expect(
    page.getByText("Собственный вывод 1", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Теплота Q: было 124/)).toBeVisible();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await page
    .getByRole("button", { name: "Воспроизвести отдельной копией" })
    .first()
    .click();
  await expect(page.getByLabel("Модель эксперимента")).toHaveValue("gas");
  await expect(page.getByLabel("Процесс", { exact: true })).toHaveValue(
    "isobaric",
  );
});
test("опыты всех пяти лабораторий переносятся в чистый профиль без потери снимков", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  for (const model of [
    "circular",
    "measurements",
    "gas",
    "lightClock",
    "circuit",
  ]) {
    await page.getByLabel("Модель эксперимента").selectOption(model);
    await page.getByLabel("Мой прогноз").fill(`Проверочный прогноз ${model}`);
    await page
      .getByRole("button", {
        name:
          model === "measurements"
            ? "Получить измерения"
            : model === "gas"
              ? "К концу процесса"
              : "К концу опыта",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Мои наблюдения")
      .fill(`Проверочные наблюдения ${model}`);
    await page.getByLabel("Мой вывод").fill(`Проверочный вывод ${model}`);
    await page
      .getByRole("button", { name: "Сохранить опыт", exact: true })
      .click();
    await expect(
      page.getByText("Опыт сохранён.", { exact: true }),
    ).toBeVisible();
  }
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  const download = await downloadEvent;
  const path = (await download.path())!;
  const { readFile } = await import("node:fs/promises");
  const original = JSON.parse(await readFile(path, "utf8"));
  expect(original.modelExperiments).toHaveLength(5);
  const context = await browser.newContext();
  try {
    const target = await context.newPage();
    await target.goto("/");
    await target
      .getByRole("button", { name: "Настройки", exact: true })
      .click();
    await target.getByLabel("Импорт JSON").setInputFiles(path);
    await expect(
      target.getByText("Проверка пройдена", { exact: true }),
    ).toBeVisible();
    await target.getByLabel("Подтверждаю замену текущих данных").check();
    await target
      .getByRole("button", { name: "Заменить данные", exact: true })
      .click();
    await expect(
      target.getByText("Данные заменены проверенной копией."),
    ).toBeVisible();
    const event = target.waitForEvent("download");
    await target
      .getByRole("button", { name: "Скачать резервную копию", exact: true })
      .click();
    const restored = JSON.parse(
      await readFile((await (await event).path())!, "utf8"),
    );
    delete original.exportedAt;
    delete restored.exportedAt;
    expect(restored).toEqual(original);
  } finally {
    await context.close();
  }
});
