/**
 * Performance Test Configuration for FitnessMealPlanner
 *
 * This file contains all configuration settings for performance tests
 * including thresholds, test parameters, and environment settings.
 */

export interface PerformanceThresholds {
  API_GET_MAX: number;        // Maximum acceptable GET request time (ms)
  API_POST_MAX: number;       // Maximum acceptable POST request time (ms)
  PAGE_LOAD_MAX: number;      // Maximum acceptable page load time (ms)
  DB_QUERY_MAX: number;       // Maximum acceptable database query time (ms)
  MEMORY_LEAK_MAX: number;    // Maximum acceptable memory increase (MB)
  BUNDLE_SIZE_MAX: number;    // Maximum acceptable bundle size (MB)
  ERROR_RATE_MAX: number;     // Maximum acceptable error rate (%)
}

export interface LoadTestConfiguration {
  USERS_LOW: number;          // Low load concurrent users
  USERS_MEDIUM: number;       // Medium load concurrent users
  USERS_HIGH: number;         // High load concurrent users
  USERS_STRESS: number;       // Stress test concurrent users
  CONCURRENT_REQUESTS: number; // Max concurrent requests per test
  TEST_DURATION: number;      // Load test duration (ms)
  RAMP_UP_TIME: number;       // Time to reach full load (ms)
}

export interface TestEnvironment {
  API_BASE_URL: string;
  FRONTEND_BASE_URL: string;
  DB_URL?: string;
  REDIS_URL?: string;
  CDN_URL?: string;
  NODE_ENV: string;
}

// Default Performance Thresholds
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  API_GET_MAX: 200,           // 200ms for GET requests
  API_POST_MAX: 500,          // 500ms for POST requests
  PAGE_LOAD_MAX: 3000,        // 3 seconds for page loads
  DB_QUERY_MAX: 100,          // 100ms for database queries
  MEMORY_LEAK_MAX: 50,        // 50MB memory increase
  BUNDLE_SIZE_MAX: 2,         // 2MB bundle size
  ERROR_RATE_MAX: 5,          // 5% error rate
};

// Relaxed Thresholds (for CI or slower environments)
export const RELAXED_THRESHOLDS: PerformanceThresholds = {
  API_GET_MAX: 400,           // 400ms for GET requests
  API_POST_MAX: 1000,         // 1000ms for POST requests
  PAGE_LOAD_MAX: 5000,        // 5 seconds for page loads
  DB_QUERY_MAX: 200,          // 200ms for database queries
  MEMORY_LEAK_MAX: 100,       // 100MB memory increase
  BUNDLE_SIZE_MAX: 3,         // 3MB bundle size
  ERROR_RATE_MAX: 10,         // 10% error rate
};

// Strict Thresholds (for production-like environments)
export const STRICT_THRESHOLDS: PerformanceThresholds = {
  API_GET_MAX: 150,           // 150ms for GET requests
  API_POST_MAX: 300,          // 300ms for POST requests
  PAGE_LOAD_MAX: 2000,        // 2 seconds for page loads
  DB_QUERY_MAX: 50,           // 50ms for database queries
  MEMORY_LEAK_MAX: 25,        // 25MB memory increase
  BUNDLE_SIZE_MAX: 1.5,       // 1.5MB bundle size
  ERROR_RATE_MAX: 2,          // 2% error rate
};

// Load Test Configuration
export const LOAD_TEST_CONFIG: LoadTestConfiguration = {
  USERS_LOW: parseInt(process.env.USERS_LOW || '10'),
  USERS_MEDIUM: parseInt(process.env.USERS_MEDIUM || '50'),
  USERS_HIGH: parseInt(process.env.USERS_HIGH || '100'),
  USERS_STRESS: parseInt(process.env.USERS_STRESS || '1000'),
  CONCURRENT_REQUESTS: parseInt(process.env.CONCURRENT_REQUESTS || '25'),
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '30000'), // 30 seconds
  RAMP_UP_TIME: parseInt(process.env.RAMP_UP_TIME || '5000'),    // 5 seconds
};

// Test Environment Configuration
export const TEST_ENVIRONMENT: TestEnvironment = {
  API_BASE_URL: process.env.TEST_API_URL || process.env.API_URL || 'http://localhost:4000/api',
  FRONTEND_BASE_URL: process.env.TEST_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:4000',
  DB_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  REDIS_URL: process.env.TEST_REDIS_URL || process.env.REDIS_URL,
  CDN_URL: process.env.CDN_URL,
  NODE_ENV: process.env.NODE_ENV || 'test',
};

// Performance Test Categories Configuration
export const TEST_CATEGORIES = {
  API: {
    name: 'API Performance Tests',
    description: 'Tests for API endpoint performance and reliability',
    testCount: 60,
    estimatedDuration: '5-8 minutes',
    thresholds: {
      responseTime: DEFAULT_THRESHOLDS.API_GET_MAX,
      errorRate: DEFAULT_THRESHOLDS.ERROR_RATE_MAX,
      throughput: 100, // requests per second
    }
  },
  FRONTEND: {
    name: 'Frontend Performance Tests',
    description: 'Tests for frontend loading and rendering performance',
    testCount: 50,
    estimatedDuration: '8-12 minutes',
    thresholds: {
      pageLoad: DEFAULT_THRESHOLDS.PAGE_LOAD_MAX,
      bundleSize: DEFAULT_THRESHOLDS.BUNDLE_SIZE_MAX,
      memoryLeak: DEFAULT_THRESHOLDS.MEMORY_LEAK_MAX,
    }
  },
  DATABASE: {
    name: 'Database Performance Tests',
    description: 'Tests for database query performance and optimization',
    testCount: 50,
    estimatedDuration: '3-5 minutes',
    thresholds: {
      queryTime: DEFAULT_THRESHOLDS.DB_QUERY_MAX,
      connectionTime: 1000, // 1 second
      transactionTime: 500,  // 500ms
    }
  },
  SCALABILITY: {
    name: 'Scalability Tests',
    description: 'Tests for application scalability under load',
    testCount: 40,
    estimatedDuration: '10-15 minutes',
    thresholds: {
      concurrentUsers: LOAD_TEST_CONFIG.USERS_HIGH,
      responseTimeUnderLoad: DEFAULT_THRESHOLDS.API_GET_MAX * 2,
      errorRateUnderLoad: DEFAULT_THRESHOLDS.ERROR_RATE_MAX * 2,
    }
  }
};

// Browser Configuration for Frontend Tests
export const BROWSER_CONFIG = {
  headless: true,
  timeout: 30000,           // 30 second timeout
  viewports: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
  },
  slowMo: 0,               // No artificial delay
  devtools: false,
};

// Database Test Configuration
export const DATABASE_CONFIG = {
  maxConnections: 20,
  connectionTimeout: 2000,  // 2 seconds
  queryTimeout: 10000,      // 10 seconds
  idleTimeout: 30000,       // 30 seconds
  testDataSize: {
    small: 100,             // 100 records
    medium: 1000,           // 1,000 records
    large: 10000,           // 10,000 records
  }
};

// Monitoring and Reporting Configuration
export const MONITORING_CONFIG = {
  enableMetricsCollection: true,
  metricsInterval: 1000,    // 1 second
  enableContinuousMonitoring: false,
  reportFormats: ['json', 'html', 'csv'],
  alertThresholds: {
    responseTimeIncrease: 50,   // 50% increase
        errorRateIncrease: 100,     // 100% increase
    memoryLeakThreshold: 100,   // 100MB
  }
};

// CI/CD Configuration
export const CI_CONFIG = {
  runInCI: process.env.CI === 'true',
  useRelaxedThresholds: process.env.CI === 'true',
  parallelExecution: true,
  maxRetries: 2,
  timeoutMultiplier: process.env.CI === 'true' ? 2 : 1,
};

/**
 * Get performance thresholds based on environment
 */
export function getPerformanceThresholds(): PerformanceThresholds {
  const environment = process.env.PERFORMANCE_MODE || process.env.NODE_ENV;

  switch (environment) {
    case 'strict':
    case 'production':
      return STRICT_THRESHOLDS;
    case 'relaxed':
    case 'ci':
      return RELAXED_THRESHOLDS;
    default:
      return DEFAULT_THRESHOLDS;
  }
}

/**
 * Get test configuration based on suite type
 */
export function getTestConfig(suite: string) {
  const baseConfig = {
    environment: TEST_ENVIRONMENT,
    thresholds: getPerformanceThresholds(),
    loadTest: LOAD_TEST_CONFIG,
    browser: BROWSER_CONFIG,
    database: DATABASE_CONFIG,
    monitoring: MONITORING_CONFIG,
    ci: CI_CONFIG,
  };

  // Suite-specific overrides
  switch (suite) {
    case 'api':
      return {
        ...baseConfig,
        category: TEST_CATEGORIES.API,
      };
    case 'frontend':
      return {
        ...baseConfig,
        category: TEST_CATEGORIES.FRONTEND,
        browser: {
          ...BROWSER_CONFIG,
          headless: !process.env.DEBUG_FRONTEND,
        }
      };
    case 'database':
      return {
        ...baseConfig,
        category: TEST_CATEGORIES.DATABASE,
        database: {
          ...DATABASE_CONFIG,
          maxConnections: 10, // Reduced for database tests
        }
      };
    case 'scalability':
      return {
        ...baseConfig,
        category: TEST_CATEGORIES.SCALABILITY,
        thresholds: {
          ...getPerformanceThresholds(),
          // Relaxed thresholds for scalability tests
          API_GET_MAX: getPerformanceThresholds().API_GET_MAX * 2,
          API_POST_MAX: getPerformanceThresholds().API_POST_MAX * 2,
          ERROR_RATE_MAX: getPerformanceThresholds().ERROR_RATE_MAX * 2,
        }
      };
    default:
      return baseConfig;
  }
}

/**
 * Validate test environment setup
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required URLs
  if (!TEST_ENVIRONMENT.API_BASE_URL) {
    errors.push('API_BASE_URL is not configured');
  }

  if (!TEST_ENVIRONMENT.FRONTEND_BASE_URL) {
    errors.push('FRONTEND_BASE_URL is not configured');
  }

  // Check for localhost URLs in CI
  if (CI_CONFIG.runInCI) {
    if (TEST_ENVIRONMENT.API_BASE_URL.includes('localhost')) {
      errors.push('localhost URLs not supported in CI environment');
    }
  }

  // Validate threshold values
  const thresholds = getPerformanceThresholds();
  if (thresholds.API_GET_MAX < 50 || thresholds.API_GET_MAX > 5000) {
    errors.push('API_GET_MAX threshold is outside reasonable range (50-5000ms)');
  }

  if (thresholds.PAGE_LOAD_MAX < 500 || thresholds.PAGE_LOAD_MAX > 30000) {
    errors.push('PAGE_LOAD_MAX threshold is outside reasonable range (500-30000ms)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get test timeout based on category and environment
 */
export function getTestTimeout(category: string): number {
  const baseTimeouts = {
    api: 30000,        // 30 seconds
    frontend: 60000,   // 60 seconds
    database: 20000,   // 20 seconds
    scalability: 120000, // 2 minutes
  };

  const timeout = baseTimeouts[category as keyof typeof baseTimeouts] || 30000;
  return timeout * CI_CONFIG.timeoutMultiplier;
}

/**
 * Export configuration for external use
 */
export const PERFORMANCE_CONFIG = {
  thresholds: getPerformanceThresholds(),
  environment: TEST_ENVIRONMENT,
  loadTest: LOAD_TEST_CONFIG,
  categories: TEST_CATEGORIES,
  browser: BROWSER_CONFIG,
  database: DATABASE_CONFIG,
  monitoring: MONITORING_CONFIG,
  ci: CI_CONFIG,
  getTestConfig,
  validateEnvironment,
  getTestTimeout,
};