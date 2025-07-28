import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // GUI tests run in Node environment with Puppeteer
    setupFiles: ['./test/gui/setup.ts'],
    testTimeout: 60000, // 60 seconds for GUI tests
    hookTimeout: 30000,
    typecheck: {
      enabled: false
    },
    include: ['test/gui/specs/**/*.test.ts'],
    reporters: ['verbose', 'json'],
    outputFile: './test/gui/reports/vitest-results.json'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../client/src'),
      '@shared': path.resolve(__dirname, '../../shared'),
    },
  },
});