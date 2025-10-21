import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'test/unit/**/*.test.{ts,tsx}',
      'test/100-percent-test-suite/**/*.test.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**',
      'test/gui/**',
      'test/e2e/**',
      'test/integration/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'test/',
        '*.config.*',
        'server/db/migrations/',
        'client/src/components/ui/**'
      ]
    },
    testTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@server': path.resolve(__dirname, 'server'),
      '@shared': path.resolve(__dirname, 'shared')
    }
  },
  server: {
    port: 4000
  }
});