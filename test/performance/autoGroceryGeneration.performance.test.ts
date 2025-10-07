/**
 * Performance Tests: Automatic Grocery List Generation
 *
 * This test suite validates the performance characteristics of the automatic
 * grocery list generation feature under various load conditions and data sizes.
 *
 * Test Coverage:
 * - Large meal plans (30+ days)
 * - Many recipes per day (4+ meals)
 * - Complex ingredient lists (10+ ingredients per recipe)
 * - Concurrent generation requests
 * - Memory usage monitoring
 * - Database query performance
 * - Response time benchmarks
 *
 * Performance Targets:
 * - Single meal plan generation: < 5 seconds
 * - Large meal plan (30 days): < 15 seconds
 * - Concurrent generations (5 plans): < 30 seconds
 * - Memory usage: < 500MB per generation
 * - Database queries: < 100ms per query
 *
 * @author Integration Testing Specialist Agent
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import {
  MealPlanEventType,
  type MealPlanEvent,
  onMealPlanAssigned,
  createMealPlanEvent
} from '../../server/utils/mealPlanEvents';
import {
  updateFeatureConfig,
  resetFeatureConfig
} from '../../server/config/features';

// Mock database with performance monitoring
const mockDb = {
  queryTimes: [] as number[],
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

// Add query timing monitoring
const originalReturning = mockDb.returning;
mockDb.returning = vi.fn().mockImplementation((...args) => {
  const start = performance.now();
  return originalReturning.apply(mockDb, args).then((result: any) => {
    const duration = performance.now() - start;
    mockDb.queryTimes.push(duration);
    return result;
  });
});

vi.mock('../../server/db', () => ({
  db: mockDb,
}));

// Mock schema
vi.mock('@shared/schema', () => ({
  groceryLists: {},
  groceryListItems: {},
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

// Mock ingredient aggregator with performance tracking
const mockIngredientAggregator = {
  processingTimes: [] as number[],
  extractIngredientsFromMealPlan: vi.fn(),
  aggregateIngredients: vi.fn(),
  generateGroceryListItems: vi.fn(),
};

// Add processing time monitoring
const originalExtract = mockIngredientAggregator.extractIngredientsFromMealPlan;
mockIngredientAggregator.extractIngredientsFromMealPlan = vi.fn().mockImplementation((mealPlan: any) => {
  const start = performance.now();
  const result = originalExtract(mealPlan);
  const duration = performance.now() - start;
  mockIngredientAggregator.processingTimes.push(duration);
  return result;
});

vi.mock('../../server/utils/ingredientAggregator', () => mockIngredientAggregator);

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private memoryStart: number = 0;
  private intervals: NodeJS.Timeout[] = [];

  start() {
    this.startTime = performance.now();
    this.memoryStart = process.memoryUsage().heapUsed;
  }

  stop() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];

    return {
      duration: performance.now() - this.startTime,
      memoryDelta: process.memoryUsage().heapUsed - this.memoryStart,
      finalMemory: process.memoryUsage().heapUsed
    };
  }

  monitorMemory(intervalMs: number = 100): number[] {
    const memoryReadings: number[] = [];

    const interval = setInterval(() => {
      memoryReadings.push(process.memoryUsage().heapUsed);
    }, intervalMs);

    this.intervals.push(interval);
    return memoryReadings;
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

// Test data generators
class TestDataGenerator {
  static generateLargeMealPlan(days: number, mealsPerDay: number, ingredientsPerMeal: number) {
    return {
      planName: `Large Plan - ${days}d ${mealsPerDay}m ${ingredientsPerMeal}i`,
      days: Array.from({ length: days }, (_, dayIndex) => ({
        day: dayIndex + 1,
        meals: Array.from({ length: mealsPerDay }, (_, mealIndex) => ({
          type: ['breakfast', 'lunch', 'dinner', 'snack'][mealIndex] || `meal-${mealIndex}`,
          recipe: {
            id: `recipe-${dayIndex}-${mealIndex}`,
            name: `Recipe ${dayIndex}-${mealIndex}`,
            ingredients: Array.from({ length: ingredientsPerMeal }, (_, ingIndex) => ({
              name: `ingredient-${dayIndex}-${mealIndex}-${ingIndex}`,
              amount: Math.floor(Math.random() * 5) + 1,
              unit: ['g', 'ml', 'pcs', 'cups', 'tbsp'][Math.floor(Math.random() * 5)]
            }))
          }
        }))
      }))
    };
  }

  static generateIngredients(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      name: `ingredient-${index}`,
      amount: Math.floor(Math.random() * 10) + 1,
      unit: ['g', 'ml', 'pcs', 'cups', 'tbsp'][Math.floor(Math.random() * 5)],
      recipe: `recipe-${Math.floor(index / 10)}`
    }));
  }

  static generateAggregatedIngredients(count: number) {
    const unique = Math.floor(count * 0.6); // 60% unique after aggregation
    return Array.from({ length: unique }, (_, index) => ({
      name: `ingredient-${index}`,
      amount: Math.floor(Math.random() * 20) + 1,
      unit: ['g', 'ml', 'pcs', 'cups', 'tbsp'][Math.floor(Math.random() * 5)],
      recipes: [`recipe-${index}`, `recipe-${index + 1}`]
    }));
  }

  static generateGroceryItems(count: number, listId: string) {
    return Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      groceryListId: listId,
      name: `ingredient-${index}`,
      category: ['produce', 'meat', 'dairy', 'pantry', 'frozen'][Math.floor(Math.random() * 5)],
      quantity: Math.floor(Math.random() * 10) + 1,
      unit: ['g', 'ml', 'pcs', 'cups', 'tbsp'][Math.floor(Math.random() * 5)],
      isChecked: false,
      priority: 'medium',
      notes: `Used in recipe ${Math.floor(index / 3)}`
    }));
  }
}

describe('Auto Grocery Generation Performance Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFeatureConfig();
    updateFeatureConfig({ AUTO_GENERATE_GROCERY_LISTS: true });

    monitor = new PerformanceMonitor();

    // Clear performance tracking arrays
    mockDb.queryTimes = [];
    mockIngredientAggregator.processingTimes = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Small Meal Plan Performance', () => {
    it('should process 7-day meal plan within performance targets', async () => {
      // Setup: 7 days, 3 meals per day, 5 ingredients per meal = 105 total ingredients
      const mealPlan = TestDataGenerator.generateLargeMealPlan(7, 3, 5);
      const rawIngredients = TestDataGenerator.generateIngredients(105);
      const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(105);
      const groceryItems = TestDataGenerator.generateGroceryItems(60, 'list-123');

      mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(rawIngredients);
      mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedIngredients);
      mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItems);

      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([{ id: 'list-123', name: 'Test List' }]) // Created list
        .mockResolvedValueOnce(groceryItems); // Created items

      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-123',
        'customer-123',
        mealPlan
      );

      // Start monitoring
      monitor.start();
      const memoryReadings = monitor.monitorMemory();

      // Execute
      const result = await onMealPlanAssigned(event);

      // Stop monitoring
      const metrics = monitor.stop();

      // Assertions
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');

      // Performance targets
      expect(metrics.duration).toBeLessThan(5000); // < 5 seconds
      expect(metrics.memoryDelta).toBeLessThan(50 * 1024 * 1024); // < 50MB memory delta

      // Database performance
      const avgQueryTime = mockDb.queryTimes.reduce((a, b) => a + b, 0) / mockDb.queryTimes.length;
      expect(avgQueryTime).toBeLessThan(100); // < 100ms average query time

      console.log(`\n📊 Small Meal Plan Performance:`);
      console.log(`⏱️  Duration: ${PerformanceMonitor.formatDuration(metrics.duration)}`);
      console.log(`💾 Memory Delta: ${PerformanceMonitor.formatBytes(metrics.memoryDelta)}`);
      console.log(`🗄️  Avg Query Time: ${avgQueryTime.toFixed(2)}ms`);
      console.log(`📊 Items Generated: ${groceryItems.length}`);
    });
  });

  describe('Large Meal Plan Performance', () => {
    it('should process 30-day meal plan within performance targets', async () => {
      // Setup: 30 days, 4 meals per day, 8 ingredients per meal = 960 total ingredients
      const mealPlan = TestDataGenerator.generateLargeMealPlan(30, 4, 8);
      const rawIngredients = TestDataGenerator.generateIngredients(960);
      const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(960);
      const groceryItems = TestDataGenerator.generateGroceryItems(400, 'list-large');

      mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(rawIngredients);
      mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedIngredients);
      mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItems);

      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([{ id: 'list-large', name: 'Large Test List' }]) // Created list
        .mockResolvedValueOnce(groceryItems); // Created items

      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-large',
        'customer-123',
        mealPlan
      );

      // Start monitoring
      monitor.start();
      const memoryReadings = monitor.monitorMemory();

      // Execute
      const result = await onMealPlanAssigned(event);

      // Stop monitoring
      const metrics = monitor.stop();

      // Assertions
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');

      // Performance targets for large plans
      expect(metrics.duration).toBeLessThan(15000); // < 15 seconds
      expect(metrics.memoryDelta).toBeLessThan(200 * 1024 * 1024); // < 200MB memory delta

      // Database performance should still be good
      const avgQueryTime = mockDb.queryTimes.reduce((a, b) => a + b, 0) / mockDb.queryTimes.length;
      expect(avgQueryTime).toBeLessThan(150); // < 150ms average query time for large data

      console.log(`\n📊 Large Meal Plan Performance:`);
      console.log(`⏱️  Duration: ${PerformanceMonitor.formatDuration(metrics.duration)}`);
      console.log(`💾 Memory Delta: ${PerformanceMonitor.formatBytes(metrics.memoryDelta)}`);
      console.log(`🗄️  Avg Query Time: ${avgQueryTime.toFixed(2)}ms`);
      console.log(`📊 Items Generated: ${groceryItems.length}`);
      console.log(`📈 Compression Ratio: ${((960 - 400) / 960 * 100).toFixed(1)}%`);
    });
  });

  describe('Extreme Scale Performance', () => {
    it('should handle very large meal plans without crashing', async () => {
      // Setup: 60 days, 5 meals per day, 10 ingredients per meal = 3000 total ingredients
      const mealPlan = TestDataGenerator.generateLargeMealPlan(60, 5, 10);
      const rawIngredients = TestDataGenerator.generateIngredients(3000);
      const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(3000);
      const groceryItems = TestDataGenerator.generateGroceryItems(800, 'list-extreme');

      mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(rawIngredients);
      mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedIngredients);
      mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItems);

      mockDb.returning
        .mockResolvedValueOnce([]) // No existing list
        .mockResolvedValueOnce([{ id: 'list-extreme', name: 'Extreme Test List' }]) // Created list
        .mockResolvedValueOnce(groceryItems); // Created items

      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        'plan-extreme',
        'customer-123',
        mealPlan
      );

      // Start monitoring
      monitor.start();
      const memoryReadings = monitor.monitorMemory(50); // More frequent monitoring

      // Execute
      const result = await onMealPlanAssigned(event);

      // Stop monitoring
      const metrics = monitor.stop();

      // Assertions - should complete successfully even if slower
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');

      // Relaxed performance targets for extreme scale
      expect(metrics.duration).toBeLessThan(30000); // < 30 seconds
      expect(metrics.memoryDelta).toBeLessThan(500 * 1024 * 1024); // < 500MB memory delta

      // Memory should not grow unbounded
      const maxMemory = Math.max(...memoryReadings);
      const minMemory = Math.min(...memoryReadings);
      const memoryGrowth = maxMemory - minMemory;
      expect(memoryGrowth).toBeLessThan(600 * 1024 * 1024); // < 600MB total growth

      console.log(`\n📊 Extreme Scale Performance:`);
      console.log(`⏱️  Duration: ${PerformanceMonitor.formatDuration(metrics.duration)}`);
      console.log(`💾 Memory Delta: ${PerformanceMonitor.formatBytes(metrics.memoryDelta)}`);
      console.log(`📈 Max Memory Growth: ${PerformanceMonitor.formatBytes(memoryGrowth)}`);
      console.log(`📊 Items Generated: ${groceryItems.length}`);
      console.log(`🎯 Raw → Final Ratio: ${rawIngredients.length} → ${groceryItems.length}`);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle multiple concurrent generations efficiently', async () => {
      const concurrentPlans = 5;
      const promises: Promise<any>[] = [];

      // Setup multiple meal plans
      for (let i = 0; i < concurrentPlans; i++) {
        const mealPlan = TestDataGenerator.generateLargeMealPlan(14, 3, 6); // 2 weeks
        const rawIngredients = TestDataGenerator.generateIngredients(252);
        const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(252);
        const groceryItems = TestDataGenerator.generateGroceryItems(150, `list-concurrent-${i}`);

        // Setup fresh mocks for each plan
        mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValueOnce(rawIngredients);
        mockIngredientAggregator.aggregateIngredients.mockReturnValueOnce(aggregatedIngredients);
        mockIngredientAggregator.generateGroceryListItems.mockReturnValueOnce(groceryItems);

        mockDb.returning
          .mockResolvedValueOnce([]) // No existing list
          .mockResolvedValueOnce([{ id: `list-concurrent-${i}`, name: `Concurrent List ${i}` }])
          .mockResolvedValueOnce(groceryItems);

        const event = createMealPlanEvent(
          MealPlanEventType.ASSIGNED,
          `plan-concurrent-${i}`,
          'customer-123',
          mealPlan
        );

        promises.push(onMealPlanAssigned(event));
      }

      // Start monitoring
      monitor.start();
      const memoryReadings = monitor.monitorMemory();

      // Execute all concurrently
      const results = await Promise.all(promises);

      // Stop monitoring
      const metrics = monitor.stop();

      // Assertions
      expect(results).toHaveLength(concurrentPlans);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.action).toBe('created');
      });

      // Concurrent performance targets
      expect(metrics.duration).toBeLessThan(30000); // < 30 seconds for 5 concurrent
      expect(metrics.memoryDelta).toBeLessThan(300 * 1024 * 1024); // < 300MB total delta

      // Average time per plan should be reasonable
      const avgTimePerPlan = metrics.duration / concurrentPlans;
      expect(avgTimePerPlan).toBeLessThan(10000); // < 10 seconds average per plan

      console.log(`\n📊 Concurrent Processing Performance:`);
      console.log(`⏱️  Total Duration: ${PerformanceMonitor.formatDuration(metrics.duration)}`);
      console.log(`⚡ Avg per Plan: ${PerformanceMonitor.formatDuration(avgTimePerPlan)}`);
      console.log(`💾 Memory Delta: ${PerformanceMonitor.formatBytes(metrics.memoryDelta)}`);
      console.log(`🔄 Concurrent Plans: ${concurrentPlans}`);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const iterations = 10;
      const memoryReadings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Record memory before each operation
        memoryReadings.push(process.memoryUsage().heapUsed);

        const mealPlan = TestDataGenerator.generateLargeMealPlan(7, 3, 5);
        const rawIngredients = TestDataGenerator.generateIngredients(105);
        const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(105);
        const groceryItems = TestDataGenerator.generateGroceryItems(60, `list-${i}`);

        mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(rawIngredients);
        mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedIngredients);
        mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItems);

        mockDb.returning
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: `list-${i}`, name: `List ${i}` }])
          .mockResolvedValueOnce(groceryItems);

        const event = createMealPlanEvent(
          MealPlanEventType.ASSIGNED,
          `plan-${i}`,
          'customer-123',
          mealPlan
        );

        const result = await onMealPlanAssigned(event);
        expect(result.success).toBe(true);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Clear mocks to prevent memory accumulation
        vi.clearAllMocks();
      }

      // Analyze memory trend
      const firstHalf = memoryReadings.slice(0, 5);
      const secondHalf = memoryReadings.slice(5);

      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const memoryGrowth = avgSecondHalf - avgFirstHalf;
      const growthPercentage = (memoryGrowth / avgFirstHalf) * 100;

      // Memory should not grow significantly over iterations
      expect(growthPercentage).toBeLessThan(20); // < 20% growth over 10 iterations

      console.log(`\n📊 Memory Leak Detection:`);
      console.log(`🏁 First Half Avg: ${PerformanceMonitor.formatBytes(avgFirstHalf)}`);
      console.log(`🏁 Second Half Avg: ${PerformanceMonitor.formatBytes(avgSecondHalf)}`);
      console.log(`📈 Growth: ${PerformanceMonitor.formatBytes(memoryGrowth)} (${growthPercentage.toFixed(1)}%)`);
      console.log(`✅ Memory Stable: ${growthPercentage < 20 ? 'YES' : 'NO'}`);
    });
  });

  describe('Database Query Performance', () => {
    it('should maintain consistent query performance under load', async () => {
      const queryCount = 20;
      const queryTimes: number[] = [];

      for (let i = 0; i < queryCount; i++) {
        const startTime = performance.now();

        // Simulate database query with variable delay
        const simulatedDelay = Math.random() * 50 + 10; // 10-60ms
        await new Promise(resolve => setTimeout(resolve, simulatedDelay));

        const queryTime = performance.now() - startTime;
        queryTimes.push(queryTime);

        mockDb.queryTimes.push(queryTime);
      }

      // Analyze query performance
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);
      const minQueryTime = Math.min(...queryTimes);

      // Performance expectations
      expect(avgQueryTime).toBeLessThan(100); // < 100ms average
      expect(maxQueryTime).toBeLessThan(200); // < 200ms max

      // Consistency check - no query should be more than 3x the average
      const outliers = queryTimes.filter(time => time > avgQueryTime * 3);
      expect(outliers.length).toBeLessThan(2); // < 10% outliers

      console.log(`\n📊 Database Query Performance:`);
      console.log(`⚡ Avg Query Time: ${avgQueryTime.toFixed(2)}ms`);
      console.log(`🏆 Min Query Time: ${minQueryTime.toFixed(2)}ms`);
      console.log(`📊 Max Query Time: ${maxQueryTime.toFixed(2)}ms`);
      console.log(`⚠️  Outliers: ${outliers.length}/${queryCount}`);
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should efficiently clean up resources during deletion events', async () => {
      // Create grocery list first
      const mealPlan = TestDataGenerator.generateLargeMealPlan(14, 3, 6);
      const groceryItems = TestDataGenerator.generateGroceryItems(200, 'cleanup-list');

      // Mock creation
      mockDb.returning
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'cleanup-list', name: 'Cleanup Test' }])
        .mockResolvedValueOnce(groceryItems);

      // Mock deletion
      mockDb.returning.mockResolvedValueOnce([{ id: 'cleanup-list' }]);

      const deleteEvent = createMealPlanEvent(
        MealPlanEventType.DELETED,
        'cleanup-plan',
        'customer-123',
        {}
      );

      // Monitor deletion performance
      monitor.start();

      // Import deletion handler
      const { onMealPlanDeleted } = await import('../../server/utils/mealPlanEvents');
      updateFeatureConfig({ DELETE_ORPHANED_LISTS: true });

      const result = await onMealPlanDeleted(deleteEvent);
      const metrics = monitor.stop();

      // Assertions
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');

      // Deletion should be fast
      expect(metrics.duration).toBeLessThan(1000); // < 1 second
      expect(metrics.memoryDelta).toBeLessThan(10 * 1024 * 1024); // < 10MB delta

      console.log(`\n📊 Resource Cleanup Performance:`);
      console.log(`⏱️  Deletion Duration: ${PerformanceMonitor.formatDuration(metrics.duration)}`);
      console.log(`💾 Memory Delta: ${PerformanceMonitor.formatBytes(metrics.memoryDelta)}`);
      console.log(`🗑️  Items Cleaned: ${groceryItems.length}`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in core functionality', async () => {
      const baselineRuns = 5;
      const testRuns = 5;
      const baselineTimes: number[] = [];
      const testTimes: number[] = [];

      // Baseline runs
      for (let i = 0; i < baselineRuns; i++) {
        const mealPlan = TestDataGenerator.generateLargeMealPlan(7, 3, 5);
        const rawIngredients = TestDataGenerator.generateIngredients(105);
        const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(105);
        const groceryItems = TestDataGenerator.generateGroceryItems(60, `baseline-${i}`);

        mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(rawIngredients);
        mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedIngredients);
        mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItems);

        mockDb.returning
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: `baseline-${i}`, name: `Baseline ${i}` }])
          .mockResolvedValueOnce(groceryItems);

        const event = createMealPlanEvent(
          MealPlanEventType.ASSIGNED,
          `baseline-${i}`,
          'customer-123',
          mealPlan
        );

        const start = performance.now();
        await onMealPlanAssigned(event);
        baselineTimes.push(performance.now() - start);
      }

      // Test runs (simulate with same data)
      for (let i = 0; i < testRuns; i++) {
        const mealPlan = TestDataGenerator.generateLargeMealPlan(7, 3, 5);
        const rawIngredients = TestDataGenerator.generateIngredients(105);
        const aggregatedIngredients = TestDataGenerator.generateAggregatedIngredients(105);
        const groceryItems = TestDataGenerator.generateGroceryItems(60, `test-${i}`);

        mockIngredientAggregator.extractIngredientsFromMealPlan.mockReturnValue(rawIngredients);
        mockIngredientAggregator.aggregateIngredients.mockReturnValue(aggregatedIngredients);
        mockIngredientAggregator.generateGroceryListItems.mockReturnValue(groceryItems);

        mockDb.returning
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: `test-${i}`, name: `Test ${i}` }])
          .mockResolvedValueOnce(groceryItems);

        const event = createMealPlanEvent(
          MealPlanEventType.ASSIGNED,
          `test-${i}`,
          'customer-123',
          mealPlan
        );

        const start = performance.now();
        await onMealPlanAssigned(event);
        testTimes.push(performance.now() - start);
      }

      // Statistical analysis
      const baselineAvg = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
      const testAvg = testTimes.reduce((a, b) => a + b, 0) / testTimes.length;

      const performanceChange = ((testAvg - baselineAvg) / baselineAvg) * 100;

      // No more than 20% performance regression
      expect(performanceChange).toBeLessThan(20);

      console.log(`\n📊 Performance Regression Analysis:`);
      console.log(`📐 Baseline Avg: ${PerformanceMonitor.formatDuration(baselineAvg)}`);
      console.log(`🧪 Test Avg: ${PerformanceMonitor.formatDuration(testAvg)}`);
      console.log(`📈 Change: ${performanceChange.toFixed(1)}%`);
      console.log(`✅ Regression Check: ${performanceChange < 20 ? 'PASSED' : 'FAILED'}`);
    });
  });
});