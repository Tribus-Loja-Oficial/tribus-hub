import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/types/**",
        "src/app/**",
        "src/lib/db/**",
        "src/lib/auth/**",
        // Layers requiring DB/network — exercised via integration/manual QA
        "src/lib/repositories/**",
        "src/lib/services/**",
        "src/lib/integrations/**",
        "src/lib/observability/**",
        "src/components/**",
        "src/features/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      thresholds: {
        statements: 30,
        lines: 30,
        branches: 30,
        functions: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
