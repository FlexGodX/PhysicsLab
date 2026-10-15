import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: [
    "lms-course.spec.ts",
    "day-plan.spec.ts",
    "modules.spec.ts",
    "studio.spec.ts",
    "hosted-settings.spec.ts",
  ],
  fullyParallel: true,
  use: {
    baseURL: process.env.PHYSICS_SITE_BASE_URL || "http://127.0.0.1:5180",
    headless: true,
    extraHTTPHeaders: { "oai-authenticated-user-id": "e2e-owner" },
    screenshot: "only-on-failure",
    storageState: {
      cookies: [
        {
          name: "__sites_local_auth",
          value: "1",
          domain: "127.0.0.1",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: "hosted-chrome",
      use: { browserName: "chromium", channel: "chrome" },
    },
  ],
});
