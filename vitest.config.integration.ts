import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/integration/setup-test-env.ts'],
    include: ['test/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'test',
        '*.config.{js,ts}',
        'dist',
        'coverage'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@test': path.resolve(__dirname, './test')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.JWT_SECRET': '"test-jwt-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements"',
    'process.env.JWT_REFRESH_SECRET': '"test-refresh-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements"'
  }
});