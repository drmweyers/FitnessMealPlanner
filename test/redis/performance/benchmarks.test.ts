import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisService } from '../../../server/services/RedisService';
import { RecipeCache } from '../../../server/services/utils/RecipeCache';
import { performance } from 'perf_hooks';

describe('Redis Performance Benchmarks', () => {
  let redisService: RedisService;
  let inMemoryCache: RecipeCache;

  beforeAll(async () => {
    redisService = new RedisService({
      host: 'localhost',
      port: 6380,
      database: 2 // Use separate database for benchmarks
    });
    
    await redisService.connect();
    await redisService.flushAll();

    inMemoryCache = new RecipeCache();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  describe('Single Operation Performance', () => {
    it('should benchmark GET operations: InMemory vs Redis vs Database simulation', async () => {
      const testData = { id: 'perf-test', name: 'Performance Test Recipe', data: 'x'.repeat(1000) };
      const key = 'performance:get-test';
      
      // Setup data in both caches
      await redisService.set(key, testData);
      await inMemoryCache.getOrSet(key, async () => testData);

      const iterations = 1000;

      // Benchmark Redis GET
      const redisStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await redisService.get(key);
      }
      const redisTime = performance.now() - redisStart;

      // Benchmark In-Memory GET
      const inMemoryStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await inMemoryCache.getOrSet(key, async () => testData);
      }
      const inMemoryTime = performance.now() - inMemoryStart;

      // Benchmark Database simulation (without cache)
      const dbSimulation = async () => {
        // Simulate database query delay
        await new Promise(resolve => setTimeout(resolve, 1));
        return testData;
      };

      const dbStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await dbSimulation();
      }
      const dbTime = performance.now() - dbStart;

      console.log('GET Performance Results:');
      console.log(`Redis: ${redisTime.toFixed(2)}ms (${(redisTime / iterations).toFixed(3)}ms per op)`);
      console.log(`In-Memory: ${inMemoryTime.toFixed(2)}ms (${(inMemoryTime / iterations).toFixed(3)}ms per op)`);
      console.log(`Database: ${dbTime.toFixed(2)}ms (${(dbTime / iterations).toFixed(3)}ms per op)`);

      // Assertions
      expect(redisTime).toBeLessThan(dbTime);
      expect(inMemoryTime).toBeLessThan(dbTime);
      
      // Redis should provide significant improvement over database
      const redisImprovement = ((dbTime - redisTime) / dbTime) * 100;
      expect(redisImprovement).toBeGreaterThan(50); // At least 50% improvement
    });

    it('should benchmark SET operations', async () => {
      const testData = { id: 'set-test', name: 'Set Performance Test', data: 'x'.repeat(1000) };
      const iterations = 500;

      // Benchmark Redis SET
      const redisStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await redisService.set(`redis:set-test:${i}`, testData);
      }
      const redisTime = performance.now() - redisStart;

      // Benchmark In-Memory SET (using getOrSet to ensure it's cached)
      const inMemoryStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await inMemoryCache.getOrSet(`memory:set-test:${i}`, async () => testData);
      }
      const inMemoryTime = performance.now() - inMemoryStart;

      console.log('SET Performance Results:');
      console.log(`Redis: ${redisTime.toFixed(2)}ms (${(redisTime / iterations).toFixed(3)}ms per op)`);
      console.log(`In-Memory: ${inMemoryTime.toFixed(2)}ms (${(inMemoryTime / iterations).toFixed(3)}ms per op)`);

      // Both should be fast, but we're testing they complete in reasonable time
      expect(redisTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(inMemoryTime).toBeLessThan(1000); // In-memory should be very fast
    });
  });

  describe('Batch Operations Performance', () => {
    it('should benchmark batch GET operations', async () => {
      const batchSize = 100;
      const keys: string[] = [];
      const testData = { id: 'batch-test', name: 'Batch Test Data' };

      // Setup test data
      for (let i = 0; i < batchSize; i++) {
        const key = `batch:test:${i}`;
        keys.push(key);
        await redisService.set(key, { ...testData, index: i });
        await inMemoryCache.getOrSet(key, async () => ({ ...testData, index: i }));
      }

      // Benchmark Redis batch GET
      const redisStart = performance.now();
      const redisResults = await redisService.mget(keys);
      const redisTime = performance.now() - redisStart;

      // Benchmark In-Memory batch GET
      const inMemoryStart = performance.now();
      const inMemoryResults = await inMemoryCache.getOrSetBatch(
        keys,
        async (missingKeys) => {
          const result = new Map();
          missingKeys.forEach((key, index) => {
            result.set(key, { ...testData, index });
          });
          return result;
        }
      );
      const inMemoryTime = performance.now() - inMemoryStart;

      // Benchmark individual GET operations
      const individualStart = performance.now();
      const individualResults = [];
      for (const key of keys) {
        individualResults.push(await redisService.get(key));
      }
      const individualTime = performance.now() - individualStart;

      console.log('Batch GET Performance Results:');
      console.log(`Redis Batch: ${redisTime.toFixed(2)}ms`);
      console.log(`In-Memory Batch: ${inMemoryTime.toFixed(2)}ms`);
      console.log(`Redis Individual: ${individualTime.toFixed(2)}ms`);

      // Verify data integrity
      expect(redisResults.length).toBe(batchSize);
      expect(Array.from(inMemoryResults.values()).length).toBe(batchSize);

      // Batch operations should be more efficient than individual
      expect(redisTime).toBeLessThan(individualTime * 0.8); // At least 20% improvement
    });

    it('should benchmark batch SET operations', async () => {
      const batchSize = 100;
      const batchData = Array.from({ length: batchSize }, (_, i) => ({
        key: `batch:set:${i}`,
        value: { id: `set-${i}`, name: `Batch Set Test ${i}`, data: 'x'.repeat(100) }
      }));

      // Benchmark Redis batch SET
      const redisStart = performance.now();
      await redisService.mset(batchData);
      const redisTime = performance.now() - redisStart;

      // Benchmark individual SET operations
      const individualStart = performance.now();
      for (const { key, value } of batchData) {
        await redisService.set(`individual:${key}`, value);
      }
      const individualTime = performance.now() - individualStart;

      console.log('Batch SET Performance Results:');
      console.log(`Redis Batch: ${redisTime.toFixed(2)}ms`);
      console.log(`Redis Individual: ${individualTime.toFixed(2)}ms`);

      // Batch operations should be more efficient
      const improvement = ((individualTime - redisTime) / individualTime) * 100;
      console.log(`Batch improvement: ${improvement.toFixed(1)}%`);

      expect(redisTime).toBeLessThan(individualTime);
      expect(improvement).toBeGreaterThan(10); // At least 10% improvement
    });
  });

  describe('Memory Usage Performance', () => {
    it('should measure memory efficiency of different data sizes', async () => {
      const dataSizes = [100, 1000, 10000, 100000]; // bytes
      const results: Array<{ size: number; redisTime: number; memoryTime: number }> = [];

      for (const size of dataSizes) {
        const testData = { id: 'memory-test', data: 'x'.repeat(size) };
        const key = `memory:size:${size}`;

        // Test Redis
        const redisStart = performance.now();
        await redisService.set(key, testData);
        const retrievedData = await redisService.get(key);
        const redisTime = performance.now() - redisStart;

        // Test In-Memory
        const memoryStart = performance.now();
        await inMemoryCache.getOrSet(key, async () => testData);
        const memoryTime = performance.now() - memoryStart;

        expect(retrievedData).toEqual(testData);

        results.push({ size, redisTime, memoryTime });

        console.log(`Data size: ${size} bytes - Redis: ${redisTime.toFixed(2)}ms, Memory: ${memoryTime.toFixed(2)}ms`);
      }

      // Analyze performance scaling
      const firstResult = results[0];
      const lastResult = results[results.length - 1];

      const redisScaling = lastResult.redisTime / firstResult.redisTime;
      const memoryScaling = lastResult.memoryTime / firstResult.memoryTime;

      console.log(`Performance scaling (${dataSizes[0]} to ${dataSizes[dataSizes.length - 1]} bytes):`);
      console.log(`Redis: ${redisScaling.toFixed(2)}x`);
      console.log(`Memory: ${memoryScaling.toFixed(2)}x`);

      // Performance should scale reasonably with data size
      expect(redisScaling).toBeLessThan(10); // Should not degrade more than 10x
      expect(memoryScaling).toBeLessThan(5);  // Memory should scale better
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should benchmark performance under concurrent load', async () => {
      const concurrentUsers = [1, 5, 10, 25, 50];
      const operationsPerUser = 50;

      for (const userCount of concurrentUsers) {
        // Setup test data
        const testKey = `concurrent:test:${userCount}`;
        const testData = { id: testKey, users: userCount, data: 'x'.repeat(500) };
        await redisService.set(testKey, testData);

        // Create concurrent operations
        const createUserOperations = (userId: number) => async () => {
          const userStart = performance.now();
          
          for (let i = 0; i < operationsPerUser; i++) {
            // Mix of reads and writes (80% read, 20% write)
            if (i % 5 === 0) {
              await redisService.set(`${testKey}:user:${userId}:${i}`, { ...testData, operation: i });
            } else {
              await redisService.get(testKey);
            }
          }
          
          return performance.now() - userStart;
        };

        // Run concurrent operations
        const start = performance.now();
        const userPromises = Array.from({ length: userCount }, (_, i) => createUserOperations(i)());
        const userTimes = await Promise.all(userPromises);
        const totalTime = performance.now() - start;

        const avgUserTime = userTimes.reduce((sum, time) => sum + time, 0) / userTimes.length;
        const throughput = (userCount * operationsPerUser) / (totalTime / 1000); // ops per second

        console.log(`Concurrent Users: ${userCount}`);
        console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
        console.log(`  Avg User Time: ${avgUserTime.toFixed(2)}ms`);
        console.log(`  Throughput: ${throughput.toFixed(0)} ops/sec`);

        // Verify reasonable performance under load
        expect(avgUserTime).toBeLessThan(30000); // Should complete within 30 seconds
        expect(throughput).toBeGreaterThan(10);   // At least 10 operations per second
      }
    });
  });

  describe('Cache Hit Ratio Performance', () => {
    it('should measure and optimize cache hit ratios', async () => {
      const scenarios = [
        { name: 'Random Access', pattern: 'random' },
        { name: 'Sequential Access', pattern: 'sequential' },
        { name: 'Hot Data (80/20 rule)', pattern: 'hotdata' }
      ];

      for (const scenario of scenarios) {
        await redisService.flushAll();
        redisService.clearMetrics();

        // Setup data
        const dataSize = 100;
        const accessCount = 500;

        // Populate some initial data
        for (let i = 0; i < dataSize; i++) {
          await redisService.set(`scenario:${scenario.pattern}:${i}`, { 
            id: i, 
            name: `Item ${i}`, 
            pattern: scenario.pattern 
          });
        }

        // Simulate access patterns
        const start = performance.now();
        
        for (let i = 0; i < accessCount; i++) {
          let key: string;
          
          switch (scenario.pattern) {
            case 'random':
              key = `scenario:${scenario.pattern}:${Math.floor(Math.random() * dataSize)}`;
              break;
            case 'sequential':
              key = `scenario:${scenario.pattern}:${i % dataSize}`;
              break;
            case 'hotdata':
              // 80% of accesses go to 20% of data
              const isHot = Math.random() < 0.8;
              const keyIndex = isHot 
                ? Math.floor(Math.random() * (dataSize * 0.2))
                : Math.floor(Math.random() * dataSize);
              key = `scenario:${scenario.pattern}:${keyIndex}`;
              break;
            default:
              key = `scenario:${scenario.pattern}:0`;
          }

          await redisService.get(key);
        }
        
        const accessTime = performance.now() - start;
        const metrics = redisService.getMetrics();
        const hitRatio = metrics.hitCount / (metrics.hitCount + metrics.missCount);

        console.log(`${scenario.name}:`);
        console.log(`  Hit Ratio: ${(hitRatio * 100).toFixed(1)}%`);
        console.log(`  Total Time: ${accessTime.toFixed(2)}ms`);
        console.log(`  Avg Time per Access: ${(accessTime / accessCount).toFixed(3)}ms`);
        console.log(`  Cache Hits: ${metrics.hitCount}, Misses: ${metrics.missCount}`);

        // Hot data should have the highest hit ratio
        if (scenario.pattern === 'hotdata') {
          expect(hitRatio).toBeGreaterThan(0.7); // >70% hit ratio for hot data
        } else {
          expect(hitRatio).toBeGreaterThan(0.5); // >50% hit ratio for other patterns
        }
      }
    });
  });

  describe('Real-world Scenario Benchmarks', () => {
    it('should benchmark meal plan generation with cached recipes', async () => {
      // Setup: Create a variety of cached recipes
      const recipeCount = 200;
      const recipes = [];

      for (let i = 0; i < recipeCount; i++) {
        const recipe = {
          id: `recipe-${i}`,
          name: `Recipe ${i}`,
          calories: 200 + Math.random() * 400,
          prepTime: 5 + Math.random() * 25,
          cookTime: 10 + Math.random() * 40,
          mealType: ['breakfast', 'lunch', 'dinner'][i % 3],
          mainIngredients: [`ingredient-${i % 20}`],
          nutrition: {
            protein: 10 + Math.random() * 30,
            carbs: 5 + Math.random() * 50,
            fat: 2 + Math.random() * 20
          }
        };

        recipes.push(recipe);
        await redisService.set(`recipe:${recipe.id}`, recipe);
      }

      // Benchmark: Generate multiple meal plans
      const mealPlanCount = 10;
      const recipesPerPlan = 21; // 7 days × 3 meals

      const start = performance.now();

      for (let planIndex = 0; planIndex < mealPlanCount; planIndex++) {
        // Simulate meal plan generation by accessing random recipes
        const selectedRecipeIds = [];
        
        for (let mealIndex = 0; mealIndex < recipesPerPlan; mealIndex++) {
          const randomRecipeId = `recipe-${Math.floor(Math.random() * recipeCount)}`;
          selectedRecipeIds.push(randomRecipeId);
        }

        // Batch fetch recipes for the meal plan
        const mealPlanRecipes = await redisService.mget(selectedRecipeIds);
        
        // Verify we got valid recipes
        const validRecipes = mealPlanRecipes.filter(recipe => recipe !== null);
        expect(validRecipes.length).toBeGreaterThan(recipesPerPlan * 0.9); // At least 90% hit rate
      }

      const totalTime = performance.now() - start;
      const metrics = redisService.getMetrics();
      const hitRatio = metrics.hitCount / (metrics.hitCount + metrics.missCount);

      console.log('Meal Plan Generation Benchmark:');
      console.log(`  Generated ${mealPlanCount} meal plans in ${totalTime.toFixed(2)}ms`);
      console.log(`  Avg time per meal plan: ${(totalTime / mealPlanCount).toFixed(2)}ms`);
      console.log(`  Cache hit ratio: ${(hitRatio * 100).toFixed(1)}%`);
      console.log(`  Total recipe fetches: ${metrics.hitCount + metrics.missCount}`);

      // Performance targets
      expect(totalTime / mealPlanCount).toBeLessThan(100); // <100ms per meal plan
      expect(hitRatio).toBeGreaterThan(0.95); // >95% hit ratio (all recipes pre-cached)
    });
  });
});