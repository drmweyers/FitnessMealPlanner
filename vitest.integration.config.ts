import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node', // Use node environment for database tests
    setupFiles: ['./test/integration-setup.ts'],
    include: ['test/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git', 'test/e2e/**', 'test/unit/**'],
    testTimeout: 30000, // 30 seconds for database operations
    hookTimeout: 10000, // 10 seconds for setup/teardown hooks
    teardownTimeout: 10000, // 10 seconds for cleanup
    typecheck: {
      enabled: false
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});