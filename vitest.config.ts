import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".next", "e2e/**"],

    // Coverage configuration
    // Using istanbul instead of v8 for Node 18 compatibility
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "tests/**",
        "e2e/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
      thresholds: {
        // Global thresholds
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },

    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
