/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress", "json"],
  testRunner: "vitest",
  testRunnerNodeArgs: [],
  coverageAnalysis: "off",

  // Vitest configuration
  vitest: {
    configFile: './vitest.config.stryker.ts',
    dir: '.'
  },

  // Target critical paths first for mutation testing
  mutate: [
    // Authentication (Critical)
    "server/auth.ts",
    "server/authRoutes.ts",
    "server/middleware/auth.ts",
    "client/src/contexts/AuthContext.tsx",

    // Security (Critical)
    "server/middleware/rateLimiter.ts",
    "server/middleware/security.ts",

    // Core Business Logic (High Priority)
    "server/services/recipeGenerator.ts",
    "server/services/mealPlanGenerator.ts",
    "server/routes/recipes.ts",
    "server/routes/mealPlan.ts",
    "server/routes/trainerRoutes.ts",
    "server/routes/customerRoutes.ts",

    // API Layer (High Priority)
    "client/src/utils/api.ts",
    "server/db.ts",
    "shared/schema.ts",

    // Utilities (Medium Priority)
    "client/src/utils/mealPlanHelpers.ts",
    "server/utils/ingredientAggregator.ts",
    "server/validation/schemas.ts"
  ],

  // Files to ignore for mutation testing
  ignorePatterns: [
    "**/*.d.ts",
    "**/*.config.*",
    "**/node_modules/**",
    "**/test/**",
    "**/dist/**",
    "**/coverage/**",
    "client/src/main.tsx",
    "server/index.ts",
    "client/src/components/ui/**", // ShadCN components - low risk
  ],

  // Quality thresholds
  thresholds: {
    high: 90, // ≥90% mutation score required
    low: 80,  // Warning threshold
    break: 75 // Fail threshold
  },

  // Performance settings
  concurrency: 2,
  timeoutMS: 60000, // 1 minute timeout per test
  timeoutFactor: 1.5,
  dryRunTimeoutMinutes: 5,

  // Mutation types to apply
  mutator: {
    excludedMutations: [
      'StringLiteral', // Avoid mutating error messages
      'BooleanSubstitution' // Avoid simple boolean flips in logging
    ]
  },

  // Incremental mutation testing
  incremental: true,

  // HTML report configuration
  htmlReporter: {
    fileName: 'reports/mutation/mutation-report.html'
  },

  // JSON report for CI integration
  jsonReporter: {
    fileName: 'reports/mutation/mutation-report.json'
  },

  // Dashboard integration (optional)
  dashboard: {
    project: 'github.com/your-org/FitnessMealPlanner',
    version: 'main'
  }
};