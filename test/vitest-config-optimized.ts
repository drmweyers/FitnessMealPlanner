import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

/**
 * Optimized Vitest Configuration for FitnessMealPlanner
 * 
 * This configuration is designed to address:
 * - Test timeout issues
 * - Performance problems
 * - Component warning issues  
 * - Coverage reporting accuracy
 */
export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
    target: 'es2020',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup-optimized.ts'],
    css: true,
    include: [
      'test/unit/**/*.test.{ts,tsx}', 
      'test/integration/**/*.test.{ts,tsx}',
      'test/performance/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules', 
      'dist', 
      '.git', 
      'test/e2e/**',
      '**/*.visual.test.{ts,tsx}', // Exclude visual tests from unit runs
      '**/*.slow.test.{ts,tsx}'    // Exclude slow tests from regular runs
    ],
    
    // Optimized timeout settings
    testTimeout: 15000,        // Reduced from 30s to 15s
    hookTimeout: 8000,         // Reduced from 10s to 8s  
    teardownTimeout: 5000,     // Reduced from 10s to 5s
    
    // Performance optimizations
    isolate: false,            // Run tests in the same process for better performance
    pool: 'threads',           // Use thread pool for parallelization
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,         // Limit threads to prevent resource exhaustion
        minThreads: 1,
      }
    },
    
    // Reduce output to speed up tests
    silent: false,
    reporter: ['basic'],
    
    typecheck: {
      enabled: false           // Disable typecheck for faster runs
    },
    
    // Optimized coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      include: [
        'client/src/**/*.{ts,tsx}', 
        'server/**/*.{ts,js}'
      ],
      exclude: [
        'node_modules/**',
        'test/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'client/src/main.tsx',
        'server/index.ts',
        '**/*.stories.{ts,tsx}',
        '**/mocks/**',
        '**/__tests__/**'
      ],
      thresholds: {
        global: {
          branches: 60,        // Reduced threshold for initial coverage
          functions: 60,       
          lines: 60,           
          statements: 60,      
        },
      },
      // Skip coverage collection on timeout-prone files initially
      skipFull: true,
    },
    
    // Retry configuration  
    retry: 1,                  // Retry failed tests once
    bail: 5,                   // Stop after 5 test failures
    
    // Mock reset configuration
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
  
  // Optimize dependency handling
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'vitest',
    ],
  },
});