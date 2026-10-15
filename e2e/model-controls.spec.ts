import { test, expect } from "@playwright/test";

test("сброс серии возвращает начальный виртуальный прибор из ручного и изменённого режима", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("measurements");
  await page.getByLabel("Источник измерений").selectOption("manual");
  await page.getByLabel("Серия измерений, м").fill("2; 3; 4");
  await page.getByLabel("Мой прогноз").fill("Прежний прогноз");
  await page
    .getByRole("button", { name: "Рассчитать серию", exact: true })
    .click();
  await expect(page.getByTestId("metric-mean")).toHaveText("3 м");
  await page.getByLabel("Мои наблюдения").fill("Среднее равно 3 м.");
  await page
    .getByLabel("Мой вывод")
    .fill("Серия симметрична относительно 3 м.");
  await page
    .getByRole("button", { name: "Сохранить опыт", exact: true })
    .click();
  await expect(page.getByText("Опыт сохранён.", { exact: true })).toBeVisible();
  const reset = page.getByRole("button", {
    name: "Сбросить серию",
    exact: true,
  });
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(page.getByLabel("Источник измерений")).toHaveValue("virtual");
  await expect(page.getByLabel("Мой прогноз")).toBeEmpty();
  await expect(page.getByTestId("metric-mean")).not.toHaveText("3 м");
  await page
    .getByRole("button", { name: "Большой разброс", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Число измерений", exact: true })
    .fill("12");
  await reset.click();
  for (const [name, value] of [
    ["Истинная длина, м", "1"],
    ["Стандартное отклонение шума, м", "0.01"],
    ["Число измерений", "5"],
    ["Постоянное смещение, м", "0"],
    ["Номер серии (seed)", "42"],
  ]) {
    await expect(page.getByRole("textbox", { name, exact: true })).toHaveValue(
      value,
    );
  }
  await page.getByLabel("Источник измерений").selectOption("manual");
  await expect(page.getByLabel("Серия измерений, м")).toHaveValue(
    "0,99; 1,00; 1,01",
  );
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  const { readFile } = await import("node:fs/promises");
  const workspace = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  expect(workspace.modelExperiments).toHaveLength(1);
  expect(workspace.modelExperiments[0]).toMatchObject({
    manualValues: [2, 3, 4],
    prediction: "Прежний прогноз",
    conclusion: "Серия симметрична относительно 3 м.",
  });
});

test("световые часы поддерживают темп 0,5× без изменения показаний", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("lightClock");
  await page.getByRole("button", { name: "Шаг модели", exact: true }).click();
  const time = await page.getByTestId("metric-labTime").innerText();
  const tempo = page.getByRole("combobox", { name: /Темп/ });
  await expect(tempo.locator('option[value="0.5"]')).toBeAttached();
  await tempo.selectOption("0.5");
  await expect(page.getByTestId("metric-labTime")).toHaveText(time);
  await expect(page.getByTestId("metric-gamma")).toHaveText("1,25");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(page.getByTestId("metric-labTime")).not.toHaveText(time);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
});

test("цепь поддерживает темп 0,5× и продолжает счёт энергии без смены условий", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("circuit");
  await page.getByRole("button", { name: "Шаг модели", exact: true }).click();
  const energy = page.getByTestId("metric-energy");
  const before = await energy.innerText();
  const tempo = page.getByRole("combobox", { name: /Темп/ });
  await expect(tempo.locator('option[value="0.5"]')).toBeAttached();
  await tempo.selectOption("0.5");
  await expect(energy).toHaveText(before);
  await expect(page.getByTestId("metric-current")).toHaveText("0,06 А");
  await expect(page.getByTestId("metric-power")).toHaveText("0,36 Вт");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(energy).not.toHaveText(before);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect(page.getByTestId("metric-current")).toHaveText("0,06 А");
  await expect(page.getByTestId("metric-power")).toHaveText("0,36 Вт");
});
