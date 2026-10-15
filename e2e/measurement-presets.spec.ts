import { test, expect } from "@playwright/test";

test("пресеты разброса сравнивают одинаковые условия и воспроизводят серию", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("measurements");
  await page
    .getByRole("button", { name: "Смещённый прибор", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Малый разброс", exact: true })
    .click();
  const number = async (key: string) =>
    Number(
      (await page.getByTestId(`metric-${key}`).innerText())
        .split(" ")[0]
        .replace(",", "."),
    );
  const smallS = await number("s"),
    smallWidth = await number("halfWidth");
  const rows = page
    .getByRole("region", { name: "Таблица данных", exact: true })
    .locator("tbody");
  const originalRows = await rows.innerText();
  await page
    .getByRole("button", { name: "Большой разброс", exact: true })
    .click();
  expect(await number("s")).toBeCloseTo(smallS * 5, 5);
  expect(await number("halfWidth")).toBeCloseTo(smallWidth * 5, 5);
  await page
    .getByRole("button", { name: "Малый разброс", exact: true })
    .click();
  expect(await number("s")).toBe(smallS);
  await expect(rows).toHaveText(originalRows, { useInnerText: true });
  await expect(
    page.getByRole("textbox", { name: "Постоянное смещение, м", exact: true }),
  ).toHaveValue("0");
  for (const [name, value] of [
    ["Истинная длина, м", "1"],
    ["Число измерений", "5"],
    ["Номер серии (seed)", "42"],
  ]) {
    await expect(page.getByRole("textbox", { name, exact: true })).toHaveValue(
      value,
    );
  }
  await page.getByRole("button", { name: "Курс", exact: true }).click();
  await page.getByRole("button", { name: "Открыть M1" }).click();
  await page.getByRole("tab", { name: "Эксперимент" }).click();
  await expect(page.getByTestId("metric-s")).toBeHidden();
  await page
    .getByLabel("Мой прогноз")
    .fill("При большем разбросе интервал шире.");
  await page
    .getByRole("button", { name: "Получить измерения", exact: true })
    .click();
  await expect(page.getByTestId("metric-s")).toBeVisible();
  await page
    .getByRole("button", { name: "Большой разброс", exact: true })
    .click();
  await expect(page.getByLabel("Мой прогноз")).toBeEmpty();
  await expect(page.getByTestId("metric-s")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Получить измерения", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
