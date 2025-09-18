/**
 * Feature Configuration
 *
 * Centralized configuration for application features and toggles.
 * Allows runtime control over feature behavior without code changes.
 *
 * Features:
 * - Environment-based configuration
 * - Runtime feature toggles
 * - Default values for all features
 * - Type-safe configuration access
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

/**
 * Feature configuration interface
 */
export interface FeatureConfig {
  // Grocery List Auto-Generation Features
  AUTO_GENERATE_GROCERY_LISTS: boolean;
  UPDATE_EXISTING_LISTS: boolean;
  DELETE_ORPHANED_LISTS: boolean;

  // Grocery List Generation Options
  AGGREGATE_INGREDIENTS: boolean;
  ROUND_UP_QUANTITIES: boolean;
  INCLUDE_ALL_INGREDIENTS: boolean;

  // Notification Features
  NOTIFY_GROCERY_LIST_CREATED: boolean;
  NOTIFY_MEAL_PLAN_ASSIGNED: boolean;

  // Performance Features
  BATCH_GROCERY_LIST_GENERATION: boolean;
  CACHE_INGREDIENT_AGGREGATION: boolean;

  // Development Features
  ENABLE_GROCERY_LIST_DEBUGGING: boolean;
  LOG_MEAL_PLAN_EVENTS: boolean;
}

/**
 * Default feature configuration
 */
const DEFAULT_CONFIG: FeatureConfig = {
  // Grocery List Auto-Generation Features
  AUTO_GENERATE_GROCERY_LISTS: true,
  UPDATE_EXISTING_LISTS: true,
  DELETE_ORPHANED_LISTS: false, // Conservative default

  // Grocery List Generation Options
  AGGREGATE_INGREDIENTS: true,
  ROUND_UP_QUANTITIES: true,
  INCLUDE_ALL_INGREDIENTS: true,

  // Notification Features
  NOTIFY_GROCERY_LIST_CREATED: true,
  NOTIFY_MEAL_PLAN_ASSIGNED: true,

  // Performance Features
  BATCH_GROCERY_LIST_GENERATION: false, // May implement later
  CACHE_INGREDIENT_AGGREGATION: false, // May implement later

  // Development Features
  ENABLE_GROCERY_LIST_DEBUGGING: process.env.NODE_ENV === 'development',
  LOG_MEAL_PLAN_EVENTS: process.env.NODE_ENV === 'development',
};

/**
 * Environment variable mapping
 * Maps environment variables to feature configuration keys
 */
const ENV_MAPPING: Record<string, keyof FeatureConfig> = {
  'AUTO_GENERATE_GROCERY_LISTS': 'AUTO_GENERATE_GROCERY_LISTS',
  'UPDATE_EXISTING_LISTS': 'UPDATE_EXISTING_LISTS',
  'DELETE_ORPHANED_LISTS': 'DELETE_ORPHANED_LISTS',
  'AGGREGATE_INGREDIENTS': 'AGGREGATE_INGREDIENTS',
  'ROUND_UP_QUANTITIES': 'ROUND_UP_QUANTITIES',
  'INCLUDE_ALL_INGREDIENTS': 'INCLUDE_ALL_INGREDIENTS',
  'NOTIFY_GROCERY_LIST_CREATED': 'NOTIFY_GROCERY_LIST_CREATED',
  'NOTIFY_MEAL_PLAN_ASSIGNED': 'NOTIFY_MEAL_PLAN_ASSIGNED',
  'BATCH_GROCERY_LIST_GENERATION': 'BATCH_GROCERY_LIST_GENERATION',
  'CACHE_INGREDIENT_AGGREGATION': 'CACHE_INGREDIENT_AGGREGATION',
  'ENABLE_GROCERY_LIST_DEBUGGING': 'ENABLE_GROCERY_LIST_DEBUGGING',
  'LOG_MEAL_PLAN_EVENTS': 'LOG_MEAL_PLAN_EVENTS',
};

/**
 * Parse boolean value from environment variable
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): FeatureConfig {
  const config = { ...DEFAULT_CONFIG };

  for (const [envKey, configKey] of Object.entries(ENV_MAPPING)) {
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      config[configKey] = parseBooleanEnv(envValue, DEFAULT_CONFIG[configKey]);
    }
  }

  return config;
}

/**
 * Current feature configuration
 */
let currentConfig: FeatureConfig = loadConfigFromEnv();

/**
 * Get current feature configuration
 */
export function getFeatureConfig(): FeatureConfig {
  return { ...currentConfig };
}

/**
 * Update feature configuration (for testing or runtime changes)
 */
export function updateFeatureConfig(updates: Partial<FeatureConfig>): void {
  currentConfig = { ...currentConfig, ...updates };

  if (currentConfig.LOG_MEAL_PLAN_EVENTS) {
    console.log('[FeatureConfig] Configuration updated:', updates);
  }
}

/**
 * Reset feature configuration to defaults
 */
export function resetFeatureConfig(): void {
  currentConfig = loadConfigFromEnv();

  if (currentConfig.LOG_MEAL_PLAN_EVENTS) {
    console.log('[FeatureConfig] Configuration reset to defaults');
  }
}

/**
 * Get feature flag value by name
 */
export function isFeatureEnabled(featureName: keyof FeatureConfig): boolean {
  return currentConfig[featureName];
}

/**
 * Disable feature by name
 */
export function disableFeature(featureName: keyof FeatureConfig): void {
  updateFeatureConfig({ [featureName]: false });
}

/**
 * Enable feature by name
 */
export function enableFeature(featureName: keyof FeatureConfig): void {
  updateFeatureConfig({ [featureName]: true });
}

/**
 * Get debug information about current configuration
 */
export function getConfigDebugInfo(): {
  current: FeatureConfig;
  defaults: FeatureConfig;
  environment: Record<string, string | undefined>;
} {
  const environment: Record<string, string | undefined> = {};

  for (const envKey of Object.keys(ENV_MAPPING)) {
    environment[envKey] = process.env[envKey];
  }

  return {
    current: getFeatureConfig(),
    defaults: DEFAULT_CONFIG,
    environment,
  };
}

/**
 * Log current configuration (useful for debugging)
 */
export function logCurrentConfig(): void {
  console.log('[FeatureConfig] Current configuration:');
  console.table(getFeatureConfig());
}

// Log configuration on startup in development
if (process.env.NODE_ENV === 'development' && currentConfig.LOG_MEAL_PLAN_EVENTS) {
  console.log('[FeatureConfig] Feature configuration loaded:');
  Object.entries(currentConfig).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}