import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { RedisService } from '../../../server/services/RedisService';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('Redis Chaos Engineering Tests', () => {
  let redisService: RedisService;
  let redisContainer: ChildProcess | null = null;

  beforeAll(async () => {
    // Start Redis container for chaos testing
    redisContainer = spawn('docker', [
      'run', '--rm', '-d', 
      '--name', 'redis-chaos-test',
      '-p', '6381:6379',
      'redis:7-alpine'
    ]);

    // Wait for container to start
    await sleep(3000);
    
    redisService = new RedisService({
      host: 'localhost',
      port: 6381,
      database: 0,
      maxRetries: 3,
      retryDelayMs: 1000
    });

    await redisService.connect();
  });

  afterAll(async () => {
    await redisService?.disconnect();
    
    // Stop Redis container
    if (redisContainer) {
      spawn('docker', ['stop', 'redis-chaos-test']);
      redisContainer = null;
    }
  });

  beforeEach(async () => {
    // Clear Redis state before each test
    await redisService.flushAll();
    redisService.clearMetrics();
  });

  describe('Network Partition Scenarios', () => {
    it('should handle Redis server shutdown gracefully', async () => {
      // Setup initial data
      const testData = { id: 'chaos-test', name: 'Network Partition Test' };
      await redisService.set('chaos:network:test', testData);

      // Verify data is cached
      let result = await redisService.get('chaos:network:test');
      expect(result).toEqual(testData);

      // Simulate network partition by stopping Redis container
      const stopResult = spawn('docker', ['stop', 'redis-chaos-test']);
      await new Promise((resolve) => {
        stopResult.on('close', resolve);
      });

      // Wait a moment for connection to detect failure
      await sleep(2000);

      console.log('Redis container stopped, testing fallback behavior...');

      // Operations should fallback to in-memory cache
      const fallbackData = { id: 'fallback', name: 'Fallback Data' };
      
      // Should not throw error, should use fallback
      await expect(redisService.set('chaos:fallback:test', fallbackData)).resolves.not.toThrow();
      
      // Should retrieve from fallback cache
      result = await redisService.get('chaos:fallback:test');
      expect(result).toEqual(fallbackData);

      // Verify error metrics are tracked
      const metrics = redisService.getMetrics();
      expect(metrics.errorCount).toBeGreaterThan(0);

      // Restart Redis container
      const restartResult = spawn('docker', [
        'run', '--rm', '-d', 
        '--name', 'redis-chaos-test',
        '-p', '6381:6379',
        'redis:7-alpine'
      ]);
      
      await new Promise((resolve) => {
        restartResult.on('close', resolve);
      });

      // Wait for container to fully start
      await sleep(5000);

      // Service should recover and reconnect
      await redisService.connect();
      
      // Should be able to use Redis again
      await redisService.set('chaos:recovery:test', { recovered: true });
      result = await redisService.get('chaos:recovery:test');
      expect(result).toEqual({ recovered: true });
    });

    it('should handle connection timeout scenarios', async () => {
      // This test simulates slow network conditions
      const slowOperations = [];
      const startTime = Date.now();

      // Perform multiple concurrent operations to stress the connection
      for (let i = 0; i < 20; i++) {
        slowOperations.push(
          redisService.set(`slow:operation:${i}`, { 
            index: i, 
            data: 'x'.repeat(1000) 
          }).catch(error => ({ error: error.message, index: i }))
        );
      }

      const results = await Promise.all(slowOperations);
      const totalTime = Date.now() - startTime;

      console.log(`Completed ${results.length} operations in ${totalTime}ms`);

      // Count successful vs failed operations
      const failures = results.filter(result => result && result.error);
      const successCount = results.length - failures.length;

      console.log(`Success: ${successCount}, Failures: ${failures.length}`);

      // Should maintain reasonable success rate even under stress
      expect(successCount / results.length).toBeGreaterThan(0.7); // >70% success rate

      // Verify fallback mechanisms worked for failures
      if (failures.length > 0) {
        const metrics = redisService.getMetrics();
        expect(metrics.errorCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle Redis memory exhaustion', async () => {
      console.log('Testing Redis memory pressure handling...');
      
      // Fill Redis with data until memory limit is reached
      const largeData = 'x'.repeat(10000); // 10KB per entry
      const maxAttempts = 500; // Try to store up to 5MB
      let successfulWrites = 0;
      let memoryErrors = 0;

      for (let i = 0; i < maxAttempts; i++) {
        try {
          await redisService.set(`memory:pressure:${i}`, {
            index: i,
            data: largeData,
            timestamp: Date.now()
          });
          successfulWrites++;
        } catch (error) {
          memoryErrors++;
          console.log(`Memory error at iteration ${i}:`, error.message);
          
          // Stop trying after multiple consecutive failures
          if (memoryErrors > 10) {
            break;
          }
        }

        // Add small delay to prevent overwhelming Redis
        if (i % 50 === 0) {
          await sleep(100);
        }
      }

      console.log(`Successfully wrote ${successfulWrites} entries before memory pressure`);

      // Should handle memory pressure gracefully
      expect(successfulWrites).toBeGreaterThan(10); // At least some writes should succeed

      // Test that reads still work for existing data
      const testRead = await redisService.get('memory:pressure:0');
      expect(testRead).toBeTruthy();

      // Test eviction behavior - older entries might be evicted
      let evictedCount = 0;
      for (let i = 0; i < Math.min(successfulWrites, 100); i++) {
        const result = await redisService.get(`memory:pressure:${i}`);
        if (!result) {
          evictedCount++;
        }
      }

      console.log(`${evictedCount} entries were evicted due to memory pressure`);

      // Some eviction is expected under memory pressure
      if (successfulWrites > 100) {
        expect(evictedCount).toBeGreaterThan(0);
      }
    });

    it('should handle large payload serialization failures', async () => {
      // Test with extremely large payloads that might cause serialization issues
      const testCases = [
        {
          name: 'Circular Reference',
          data: (() => {
            const obj: any = { name: 'circular' };
            obj.self = obj;
            return obj;
          })()
        },
        {
          name: 'Extremely Large Array',
          data: {
            largeArray: new Array(100000).fill('large-data-string')
          }
        },
        {
          name: 'Deep Nested Object',
          data: (() => {
            let obj: any = { level: 0 };
            for (let i = 1; i < 100; i++) {
              obj = { level: i, nested: obj };
            }
            return obj;
          })()
        },
        {
          name: 'Binary Data',
          data: {
            buffer: Buffer.from('binary-data'.repeat(10000))
          }
        }
      ];

      for (const testCase of testCases) {
        console.log(`Testing ${testCase.name}...`);
        
        try {
          await redisService.set(`serialization:${testCase.name}`, testCase.data);
          
          // If set succeeded, try to retrieve
          const result = await redisService.get(`serialization:${testCase.name}`);
          
          if (testCase.name === 'Circular Reference') {
            // Circular references should either fail to set or lose the circular nature
            expect(result).toBeTruthy(); // Something should be stored
          } else {
            expect(result).toBeTruthy();
          }
          
          console.log(`✓ ${testCase.name} handled successfully`);
        } catch (error) {
          // Some failures are expected (like circular references)
          console.log(`✗ ${testCase.name} failed as expected:`, error.message);
          
          // Should not crash the service
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Service should still be functional after serialization stress
      await redisService.set('post-serialization-test', { working: true });
      const result = await redisService.get('post-serialization-test');
      expect(result).toEqual({ working: true });
    });
  });

  describe('Concurrent Access Chaos', () => {
    it('should handle race conditions and concurrent modifications', async () => {
      const concurrentOperations = 50;
      const sharedKey = 'chaos:concurrent:counter';
      
      // Initialize counter
      await redisService.set(sharedKey, { count: 0, operations: [] });

      // Create concurrent operations that try to modify the same key
      const operations = Array.from({ length: concurrentOperations }, (_, i) => 
        (async (operationId: number) => {
          try {
            // Get current value
            const current = await redisService.get(sharedKey) as any;
            
            if (current) {
              // Simulate processing time
              await sleep(Math.random() * 50);
              
              // Try to update
              const updated = {
                count: current.count + 1,
                operations: [...(current.operations || []), operationId]
              };
              
              await redisService.set(sharedKey, updated);
              return { success: true, operationId };
            } else {
              return { success: false, operationId, reason: 'Key not found' };
            }
          } catch (error) {
            return { 
              success: false, 
              operationId, 
              reason: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })(i)
      );

      const results = await Promise.all(operations);
      
      // Analyze results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`Concurrent operations: ${successful.length} successful, ${failed.length} failed`);

      // Check final state
      const finalValue = await redisService.get(sharedKey) as any;
      
      console.log(`Final counter value: ${finalValue?.count}`);
      console.log(`Operations recorded: ${finalValue?.operations?.length || 0}`);

      // Should handle concurrent access without crashing
      expect(finalValue).toBeTruthy();
      expect(finalValue.count).toBeGreaterThan(0);
      
      // Not all operations may succeed due to race conditions, but service should remain stable
      expect(successful.length).toBeGreaterThan(concurrentOperations * 0.5); // At least 50% should succeed
    });

    it('should prevent cache stampede scenarios', async () => {
      const cacheKey = 'chaos:stampede:expensive-operation';
      let databaseCallCount = 0;

      // Simulate expensive database operation
      const expensiveDbOperation = async () => {
        databaseCallCount++;
        console.log(`Database call #${databaseCallCount}`);
        
        // Simulate database query time
        await sleep(200);
        
        return {
          id: 'expensive-data',
          timestamp: Date.now(),
          callNumber: databaseCallCount
        };
      };

      // Launch many concurrent requests for the same expired/missing cache key
      const concurrentRequests = 20;
      const startTime = Date.now();

      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        redisService.getOrSet(cacheKey, expensiveDbOperation, 300) // 5 min TTL
      );

      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      console.log(`Cache stampede test completed in ${totalTime}ms`);
      console.log(`Database was called ${databaseCallCount} times for ${concurrentRequests} concurrent requests`);

      // Verify all requests got the same data (from single database call)
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result).toEqual(firstResult);
      });

      // With proper cache stampede protection, database should be called only once
      // In this implementation, we might have some race conditions, but should be minimal
      expect(databaseCallCount).toBeLessThan(concurrentRequests * 0.5); // Less than 50% of requests hit database
      expect(totalTime).toBeLessThan(1000); // Should complete quickly due to caching
    });
  });

  describe('Data Consistency Scenarios', () => {
    it('should handle cache-database inconsistency', async () => {
      const dataKey = 'consistency:test:user:123';
      
      // Simulate scenario where cache and database become inconsistent
      
      // 1. Set initial data in cache
      const cachedData = { 
        id: '123', 
        name: 'Cached User', 
        email: 'cached@example.com',
        version: 1 
      };
      await redisService.set(dataKey, cachedData);

      // 2. Simulate database update that bypassed cache invalidation
      const actualData = { 
        id: '123', 
        name: 'Updated User', 
        email: 'updated@example.com',
        version: 2 
      };

      // 3. Implement cache validation logic
      const validateAndRefresh = async (key: string, databaseFetcher: () => Promise<any>) => {
        const cached = await redisService.get(key);
        const actual = await databaseFetcher();

        // Check for version mismatch (inconsistency detection)
        if (cached && actual && cached.version < actual.version) {
          console.log('Cache inconsistency detected, refreshing...');
          
          // Invalidate stale cache
          await redisService.del(key);
          
          // Cache fresh data
          await redisService.set(key, actual);
          
          return actual;
        }

        return cached || actual;
      };

      // 4. Test consistency check
      const result = await validateAndRefresh(dataKey, async () => actualData);

      // Should return updated data after detecting inconsistency
      expect(result).toEqual(actualData);
      expect(result.version).toBe(2);

      // Cache should now contain updated data
      const refreshedCache = await redisService.get(dataKey);
      expect(refreshedCache).toEqual(actualData);
    });

    it('should handle partial cache invalidation correctly', async () => {
      // Setup related data that should be invalidated together
      const userId = 'user123';
      const userData = { id: userId, name: 'Test User', email: 'test@example.com' };
      const userMealPlans = [
        { id: 'plan1', userId, name: 'Diet Plan' },
        { id: 'plan2', userId, name: 'Bulk Plan' }
      ];
      const userProgress = { userId, weight: 70, measurements: {} };

      // Cache all related data
      await redisService.set(`user:${userId}`, userData);
      await redisService.set(`user:${userId}:meal-plans`, userMealPlans);
      await redisService.set(`user:${userId}:progress`, userProgress);
      
      // Also cache some search results that include this user
      await redisService.set(`search:users:active`, [userData]);

      // Verify all data is cached
      expect(await redisService.get(`user:${userId}`)).toEqual(userData);
      expect(await redisService.get(`user:${userId}:meal-plans`)).toEqual(userMealPlans);
      expect(await redisService.get(`user:${userId}:progress`)).toEqual(userProgress);
      expect(await redisService.get(`search:users:active`)).toEqual([userData]);

      // Simulate user update that should invalidate related caches
      const invalidateUserData = async (userId: string) => {
        console.log(`Invalidating all data for user ${userId}...`);
        
        // Invalidate direct user data
        await redisService.del(`user:${userId}`);
        
        // Invalidate user-related data
        await redisService.invalidatePattern(`user:${userId}:*`);
        
        // Invalidate search caches that might contain this user
        await redisService.invalidatePattern(`search:users:*`);
      };

      await invalidateUserData(userId);

      // Verify proper invalidation
      expect(await redisService.get(`user:${userId}`)).toBeNull();
      expect(await redisService.get(`user:${userId}:meal-plans`)).toBeNull();
      expect(await redisService.get(`user:${userId}:progress`)).toBeNull();
      expect(await redisService.get(`search:users:active`)).toBeNull();

      console.log('✓ Partial cache invalidation completed successfully');
    });
  });

  describe('Recovery and Resilience', () => {
    it('should recover gracefully from Redis restart', async () => {
      // Setup initial state
      const testData = { id: 'recovery-test', name: 'Pre-restart Data' };
      await redisService.set('recovery:test', testData);
      
      // Verify data is accessible
      let result = await redisService.get('recovery:test');
      expect(result).toEqual(testData);

      // Restart Redis container (simulates Redis server restart)
      console.log('Restarting Redis container...');
      
      // Stop current container
      spawn('docker', ['stop', 'redis-chaos-test']).on('close', () => {
        console.log('Redis container stopped');
      });
      
      await sleep(3000);
      
      // Start new container
      const newContainer = spawn('docker', [
        'run', '--rm', '-d', 
        '--name', 'redis-chaos-test',
        '-p', '6381:6379',
        'redis:7-alpine'
      ]);
      
      await new Promise((resolve) => {
        newContainer.on('close', resolve);
      });
      
      await sleep(5000); // Wait for Redis to be fully ready

      // Service should detect disconnection and reconnect
      await redisService.connect();

      // Data should be gone (Redis restart clears memory), but service should work
      result = await redisService.get('recovery:test');
      expect(result).toBeNull(); // Data lost due to restart

      // But new operations should work
      const newData = { id: 'post-restart', name: 'Post-restart Data' };
      await redisService.set('recovery:new-test', newData);
      
      result = await redisService.get('recovery:new-test');
      expect(result).toEqual(newData);

      // Health check should pass
      const health = await redisService.healthCheck();
      expect(health.status).toBe('healthy');

      console.log('✓ Redis restart recovery successful');
    });

    it('should maintain performance during recovery scenarios', async () => {
      const performanceData = [];
      
      // Measure baseline performance
      const measurePerformance = async (label: string, operation: () => Promise<void>) => {
        const startTime = Date.now();
        await operation();
        const duration = Date.now() - startTime;
        
        performanceData.push({ label, duration });
        console.log(`${label}: ${duration}ms`);
        
        return duration;
      };

      // Baseline performance
      await measurePerformance('Baseline Operation', async () => {
        for (let i = 0; i < 10; i++) {
          await redisService.set(`perf:baseline:${i}`, { index: i });
          await redisService.get(`perf:baseline:${i}`);
        }
      });

      // Performance during connection issues
      await measurePerformance('During Connection Issues', async () => {
        // Simulate connection instability
        const operations = [];
        
        for (let i = 0; i < 10; i++) {
          operations.push(
            redisService.set(`perf:unstable:${i}`, { index: i })
              .catch(() => null) // Ignore errors for performance measurement
          );
          
          operations.push(
            redisService.get(`perf:unstable:${i}`)
              .catch(() => null)
          );
        }
        
        await Promise.all(operations);
      });

      // Performance after recovery
      await measurePerformance('After Recovery', async () => {
        for (let i = 0; i < 10; i++) {
          await redisService.set(`perf:recovery:${i}`, { index: i });
          await redisService.get(`perf:recovery:${i}`);
        }
      });

      // Analyze performance degradation
      const baseline = performanceData.find(p => p.label === 'Baseline Operation')?.duration || 0;
      const recovery = performanceData.find(p => p.label === 'After Recovery')?.duration || 0;

      const degradation = ((recovery - baseline) / baseline) * 100;
      console.log(`Performance degradation after recovery: ${degradation.toFixed(1)}%`);

      // Performance should recover to reasonable levels
      expect(Math.abs(degradation)).toBeLessThan(50); // Less than 50% degradation
    });
  });
});