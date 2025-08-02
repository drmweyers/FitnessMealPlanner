import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/unit/**/*.test.{ts,tsx}', 'test/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git', 'test/e2e/**'],
    typecheck: {
      enabled: false
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.{ts,js}'],
      exclude: [
        'node_modules/**',
        'test/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'client/src/main.tsx',
        'server/index.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});