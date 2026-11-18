import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    alias: {
      // Fonts are compiled by Next at build time; tests get plain class names.
      "next/font/local": fileURLToPath(new URL("./src/test/next-font-local.ts", import.meta.url)),
      // Next resolves this marker itself; in tests it is a no-op.
      "server-only": "next/dist/compiled/server-only/empty",
    },
  },
});
