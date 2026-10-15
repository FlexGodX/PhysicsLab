import { test, expect } from "@playwright/test";
for (const unavailable of [false, true])
  test(`неверный снимок не заменяет данные при ${unavailable ? "отказе IndexedDB" : "доступном IndexedDB"}`, async ({
    page,
  }) => {
    if (unavailable)
      await page.addInitScript(() =>
        Object.defineProperty(window, "indexedDB", {
          get() {
            throw new Error("Storage unavailable");
          },
        }),
      );
    await page.goto("/e2e/fixtures/workspace-harness.html");
    await page
      .getByRole("button", { name: "Передать неверный снимок", exact: true })
      .click();
    await expect(page.getByTestId("result")).toHaveText("false");
    await expect(page.getByTestId("version")).toHaveText("1");
    await expect(page.getByTestId("memory")).toHaveText(String(unavailable));
    await expect(page.getByRole("status")).toContainText(
      "Данные не прошли проверку",
    );
  });
