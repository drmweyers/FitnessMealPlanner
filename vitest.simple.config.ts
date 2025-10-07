import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup-simple.ts'],
    include: ['test/unit/**/*.test.{ts,tsx}', 'test/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git', 'test/e2e/**', 'test/gui/**'],
    typecheck: {
      enabled: false
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.{ts,js}'],
      exclude: [
        'node_modules/**',
        'test/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'server/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});