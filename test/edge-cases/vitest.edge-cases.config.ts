import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'Edge Case Tests',
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    include: [
      'test/edge-cases/edge-cases-simple.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ],
    globals: true,
    setupFiles: [
      'test/edge-cases/setup-edge-cases.ts'
    ],
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json'],
      reportsDirectory: 'test/edge-cases/coverage',
      include: [
        'server/**/*.{ts,js}',
        'client/src/**/*.{ts,tsx}'
      ],
      exclude: [
        'test/**',
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/vite.config.{ts,js}',
        '**/vitest.config.{ts,js}'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    reporter: [
      'verbose',
      'json'
    ],
    outputFile: {
      json: 'test/edge-cases/results.json'
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        minForks: 1,
        maxForks: 4
      }
    },
    sequence: {
      concurrent: false,
      shuffle: false
    },
    retry: 1,
    logHeapUsage: true,
    isolate: true,
    passWithNoTests: false,
    allowOnly: false,
    watch: false,
    ui: false,
    open: false,
    silent: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../client/src'),
      '@server': resolve(__dirname, '../../server'),
      '@test': resolve(__dirname, '../')
    }
  },
  esbuild: {
    target: 'node18'
  },
  optimizeDeps: {
    include: ['supertest', 'express']
  }
});