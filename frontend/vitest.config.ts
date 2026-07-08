import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/app/components/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**"],
      exclude: [
        "src/**/*.test.*",
        "src/**/setup.ts",
        "src/**/*.d.ts",
        "src/app/lib/i18n.ts",
        "src/app/lib/api.ts",
        "src/messages/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
