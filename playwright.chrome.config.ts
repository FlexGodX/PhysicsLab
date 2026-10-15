import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  projects: [
    { name: "chrome", use: { browserName: "chromium", channel: "chrome" } },
  ],
});
