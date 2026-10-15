import { defineConfig } from "vitest/config";
import { aiMiddleware } from "./server/api.ts";
import react from "@vitejs/plugin-react";
import { codexClient } from "./server/codex.ts";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-ai",
      configureServer(server) {
        server.middlewares.use(aiMiddleware());
        server.httpServer?.once("close", () => {
          void codexClient.dispose();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use(aiMiddleware());
        server.httpServer.once("close", () => {
          void codexClient.dispose();
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    fs: {
      deny: [
        ".env",
        ".env.*",
        "**/.git/**",
        "**/.physics-lab/**",
        "**/.lms-source/**",
      ],
    },
  },
  preview: { host: "127.0.0.1" },
  optimizeDeps: { include: ["mammoth/mammoth.browser", "pdfjs-dist"] },
  test: { include: ["tests/**/*.test.ts"] },
});
