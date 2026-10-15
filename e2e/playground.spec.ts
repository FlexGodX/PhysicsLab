import { test, expect } from "@playwright/test";
test("условие опыта показывает исходные данные и обновляется вместе с параметрами", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Эксперимент" }).click();
  const condition = page.getByTestId("experiment-condition");
  await expect(condition).toContainText("начальная скорость 0 м/с");
  await expect(condition).toContainText("ускорение 2 м/с²");
  await expect(condition).toContainText("4 с");
  await page.getByLabel("Сценарий", { exact: true }).selectOption("Торможение");
  await expect(condition).toContainText("начальная скорость 8 м/с");
  await expect(condition).toContainText("ускорение −2 м/с²");
  await expect(
    page.getByText(
      "Какой путь пройдёт тележка за 4 с и какой будет её скорость в конце?",
      { exact: true },
    ),
  ).toBeVisible();
});
test("игровая площадка запускает свободный опыт и даёт совет по текущим условиям", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Игровая площадка", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Сценарий", { exact: true }).selectOption("Разворот");
  await expect(page.getByTestId("contextual-theory")).toContainText("разворот");
  await page.getByRole("button", { name: "К концу опыта" }).click();
  await expect(page.getByTestId("distance-value")).toHaveText("4 м");
  await page.getByLabel("Сценарий", { exact: true }).selectOption("Равномерно");
  await expect(page.getByTestId("contextual-theory")).toContainText(
    "не меняется",
  );
});
