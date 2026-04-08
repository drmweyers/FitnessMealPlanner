import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: true,
    include: [
      "test/unit/**/*.test.{ts,tsx}",
      "test/integration/**/*.test.{ts,tsx}",
      "test/real-api/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", ".git", "test/e2e/**"],
    testTimeout: 30000, // 30s default; real API tests should set per-test timeouts
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
      },
    },
    fileParallelism: false,
    typecheck: {
      enabled: false,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["server/**/*.{ts,js}", "client/src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        "test/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "client/src/main.tsx",
        "server/index.ts",
        ".claude/**",
        ".worktrees/**",
      ],
      all: true,
      thresholds: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
