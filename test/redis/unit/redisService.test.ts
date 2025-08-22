import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { RedisService, RedisConfig } from '../../../server/services/RedisService';
import { createClient } from 'redis';

// Mock Redis client
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    mGet: vi.fn(),
    multi: vi.fn(() => ({
      setEx: vi.fn().mockReturnThis(),
      exec: vi.fn()
    })),
    keys: vi.fn(),
    flushAll: vi.fn()
  }))
}));

describe('RedisService Unit Tests', () => {
  let redisService: RedisService;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      get: vi.fn(),
      setEx: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(1),
      mGet: vi.fn(),
      multi: vi.fn(() => ({
        setEx: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(['OK'])
      })),
      keys: vi.fn().mockResolvedValue([]),
      flushAll: vi.fn().mockResolvedValue('OK')
    };

    (createClient as any).mockReturnValue(mockClient);
    
    redisService = new RedisService({
      host: 'localhost',
      port: 6380,
      defaultTTL: 3600
    });
  });

  describe('Connection Management', () => {
    it('should create Redis client with correct configuration', () => {
      const config: RedisConfig = {
        host: 'redis-test',
        port: 6380,
        password: 'testpass',
        database: 1
      };

      new RedisService(config);

      expect(createClient).toHaveBeenCalledWith({
        socket: { host: 'redis-test', port: 6380 },
        password: 'testpass',
        database: 1
      });
    });

    it('should create client with URL when provided', () => {
      const config: RedisConfig = {
        url: 'redis://localhost:6380'
      };

      new RedisService(config);

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6380'
      });
    });

    it('should setup event handlers', () => {
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should connect and disconnect properly', async () => {
      await redisService.connect();
      expect(mockClient.connect).toHaveBeenCalled();

      await redisService.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('Basic Operations', () => {
    beforeEach(async () => {
      await redisService.connect();
    });

    describe('get operation', () => {
      it('should return cached value when key exists', async () => {
        const testValue = { id: '1', name: 'test recipe' };
        mockClient.get.mockResolvedValue(JSON.stringify(testValue));

        const result = await redisService.get('recipe:1');

        expect(mockClient.get).toHaveBeenCalledWith('recipe:1');
        expect(result).toEqual(testValue);
        
        const metrics = redisService.getMetrics();
        expect(metrics.hitCount).toBe(1);
        expect(metrics.missCount).toBe(0);
      });

      it('should return null when key does not exist', async () => {
        mockClient.get.mockResolvedValue(null);

        const result = await redisService.get('recipe:nonexistent');

        expect(result).toBeNull();
        
        const metrics = redisService.getMetrics();
        expect(metrics.missCount).toBe(1);
      });

      it('should handle JSON parse errors gracefully', async () => {
        mockClient.get.mockResolvedValue('invalid-json');
        
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const result = await redisService.get('recipe:1');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse cached value'),
          expect.any(Error)
        );
        
        consoleSpy.mockRestore();
      });
    });

    describe('set operation', () => {
      it('should set value with default TTL', async () => {
        const testValue = { id: '1', name: 'test recipe' };

        await redisService.set('recipe:1', testValue);

        expect(mockClient.setEx).toHaveBeenCalledWith(
          'recipe:1',
          3600,
          JSON.stringify(testValue)
        );
        
        const metrics = redisService.getMetrics();
        expect(metrics.setCount).toBe(1);
      });

      it('should set value with custom TTL', async () => {
        const testValue = { id: '1', name: 'test recipe' };

        await redisService.set('recipe:1', testValue, 1800);

        expect(mockClient.setEx).toHaveBeenCalledWith(
          'recipe:1',
          1800,
          JSON.stringify(testValue)
        );
      });
    });

    describe('del operation', () => {
      it('should delete existing key', async () => {
        mockClient.del.mockResolvedValue(1);

        const result = await redisService.del('recipe:1');

        expect(mockClient.del).toHaveBeenCalledWith('recipe:1');
        expect(result).toBe(1);
        
        const metrics = redisService.getMetrics();
        expect(metrics.deleteCount).toBe(1);
      });

      it('should return 0 for non-existent key', async () => {
        mockClient.del.mockResolvedValue(0);

        const result = await redisService.del('recipe:nonexistent');

        expect(result).toBe(0);
      });
    });

    describe('exists operation', () => {
      it('should return true when key exists', async () => {
        mockClient.exists.mockResolvedValue(1);

        const result = await redisService.exists('recipe:1');

        expect(mockClient.exists).toHaveBeenCalledWith('recipe:1');
        expect(result).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        mockClient.exists.mockResolvedValue(0);

        const result = await redisService.exists('recipe:nonexistent');

        expect(result).toBe(false);
      });
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await redisService.connect();
    });

    describe('mget operation', () => {
      it('should return multiple values', async () => {
        const values = [
          JSON.stringify({ id: '1', name: 'recipe 1' }),
          null,
          JSON.stringify({ id: '3', name: 'recipe 3' })
        ];
        mockClient.mGet.mockResolvedValue(values);

        const result = await redisService.mget(['recipe:1', 'recipe:2', 'recipe:3']);

        expect(mockClient.mGet).toHaveBeenCalledWith(['recipe:1', 'recipe:2', 'recipe:3']);
        expect(result).toEqual([
          { id: '1', name: 'recipe 1' },
          null,
          { id: '3', name: 'recipe 3' }
        ]);
        
        const metrics = redisService.getMetrics();
        expect(metrics.hitCount).toBe(2);
        expect(metrics.missCount).toBe(1);
      });
    });

    describe('mset operation', () => {
      it('should set multiple values with pipeline', async () => {
        const keyValuePairs = [
          { key: 'recipe:1', value: { id: '1', name: 'recipe 1' }, ttl: 1800 },
          { key: 'recipe:2', value: { id: '2', name: 'recipe 2' } }
        ];

        const mockPipeline = {
          setEx: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue(['OK', 'OK'])
        };
        mockClient.multi.mockReturnValue(mockPipeline);

        await redisService.mset(keyValuePairs);

        expect(mockClient.multi).toHaveBeenCalled();
        expect(mockPipeline.setEx).toHaveBeenCalledWith(
          'recipe:1',
          1800,
          JSON.stringify({ id: '1', name: 'recipe 1' })
        );
        expect(mockPipeline.setEx).toHaveBeenCalledWith(
          'recipe:2',
          3600, // default TTL
          JSON.stringify({ id: '2', name: 'recipe 2' })
        );
        expect(mockPipeline.exec).toHaveBeenCalled();
      });
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      await redisService.connect();
    });

    describe('getOrSet operation', () => {
      it('should return cached value when available', async () => {
        const cachedValue = { id: '1', name: 'cached recipe' };
        mockClient.get.mockResolvedValue(JSON.stringify(cachedValue));

        const fetcher = vi.fn();
        const result = await redisService.getOrSet('recipe:1', fetcher);

        expect(result).toEqual(cachedValue);
        expect(fetcher).not.toHaveBeenCalled();
        expect(mockClient.setEx).not.toHaveBeenCalled();
      });

      it('should fetch and cache value when not available', async () => {
        const freshValue = { id: '1', name: 'fresh recipe' };
        mockClient.get.mockResolvedValue(null);

        const fetcher = vi.fn().mockResolvedValue(freshValue);
        const result = await redisService.getOrSet('recipe:1', fetcher, 1800);

        expect(fetcher).toHaveBeenCalled();
        expect(result).toEqual(freshValue);
        expect(mockClient.setEx).toHaveBeenCalledWith(
          'recipe:1',
          1800,
          JSON.stringify(freshValue)
        );
      });
    });

    describe('getOrSetBatch operation', () => {
      it('should handle mixed cache hits and misses', async () => {
        const keys = ['recipe:1', 'recipe:2', 'recipe:3'];
        const cachedValues = [
          JSON.stringify({ id: '1', name: 'cached recipe 1' }),
          null,
          JSON.stringify({ id: '3', name: 'cached recipe 3' })
        ];
        
        mockClient.mGet.mockResolvedValue(cachedValues);

        const batchFetcher = vi.fn().mockResolvedValue(
          new Map([['recipe:2', { id: '2', name: 'fresh recipe 2' }]])
        );

        const mockPipeline = {
          setEx: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue(['OK'])
        };
        mockClient.multi.mockReturnValue(mockPipeline);

        const result = await redisService.getOrSetBatch(keys, batchFetcher);

        expect(batchFetcher).toHaveBeenCalledWith(['recipe:2']);
        expect(result.size).toBe(3);
        expect(result.get('recipe:1')).toEqual({ id: '1', name: 'cached recipe 1' });
        expect(result.get('recipe:2')).toEqual({ id: '2', name: 'fresh recipe 2' });
        expect(result.get('recipe:3')).toEqual({ id: '3', name: 'cached recipe 3' });
        
        // Verify fresh value was cached
        expect(mockPipeline.setEx).toHaveBeenCalledWith(
          'recipe:2',
          3600,
          JSON.stringify({ id: '2', name: 'fresh recipe 2' })
        );
      });
    });

    describe('invalidatePattern operation', () => {
      it('should delete keys matching pattern', async () => {
        const matchingKeys = ['recipe:1', 'recipe:2', 'recipe:3'];
        mockClient.keys.mockResolvedValue(matchingKeys);
        mockClient.del.mockResolvedValue(3);

        const result = await redisService.invalidatePattern('recipe:*');

        expect(mockClient.keys).toHaveBeenCalledWith('recipe:*');
        expect(mockClient.del).toHaveBeenCalledWith(matchingKeys);
        expect(result).toBe(3);
      });

      it('should return 0 when no keys match pattern', async () => {
        mockClient.keys.mockResolvedValue([]);

        const result = await redisService.invalidatePattern('nonexistent:*');

        expect(result).toBe(0);
        expect(mockClient.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should use fallback cache when Redis is unavailable', async () => {
      // Simulate Redis error
      mockClient.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should fallback to in-memory cache
      const result = await redisService.get('recipe:1');
      expect(result).toBeNull();

      // Test fallback set/get
      await redisService.set('recipe:1', { id: '1', name: 'test' });
      const cachedResult = await redisService.get('recipe:1');
      
      expect(cachedResult).toEqual({ id: '1', name: 'test' });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle TTL in fallback cache', async () => {
      // Force fallback mode
      mockClient.get.mockRejectedValue(new Error('Redis unavailable'));
      mockClient.setEx.mockRejectedValue(new Error('Redis unavailable'));

      vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set value with short TTL
      await redisService.set('recipe:1', { id: '1', name: 'test' }, 1);
      
      // Should be available immediately
      let result = await redisService.get('recipe:1');
      expect(result).toEqual({ id: '1', name: 'test' });

      // Wait for expiration (simulate)
      vi.advanceTimersByTime(2000);
      
      result = await redisService.get('recipe:1');
      expect(result).toBeNull();
    });

    it('should track errors in metrics', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));
      
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      await redisService.get('recipe:1');

      const metrics = redisService.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when Redis is working', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify('test'));

      const health = await redisService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Redis is responding normally');
      expect(health.metrics).toBeDefined();
    });

    it('should return unhealthy status when Redis fails', async () => {
      mockClient.setEx.mockRejectedValue(new Error('Connection failed'));

      const health = await redisService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('Connection failed');
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await redisService.connect();
      redisService.clearMetrics();
    });

    it('should track cache hit/miss ratios correctly', async () => {
      // Setup cache hits and misses
      mockClient.get
        .mockResolvedValueOnce(JSON.stringify({ id: '1' })) // hit
        .mockResolvedValueOnce(null) // miss
        .mockResolvedValueOnce(JSON.stringify({ id: '3' })) // hit
        .mockResolvedValueOnce(null); // miss

      await redisService.get('recipe:1');
      await redisService.get('recipe:2');
      await redisService.get('recipe:3');
      await redisService.get('recipe:4');

      const metrics = redisService.getMetrics();
      expect(metrics.hitCount).toBe(2);
      expect(metrics.missCount).toBe(2);
      expect(metrics.hitRatio).toBe(0.5); // 50% hit ratio
    });

    it('should clear metrics when requested', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ id: '1' }));
      
      await redisService.get('recipe:1');
      
      let metrics = redisService.getMetrics();
      expect(metrics.hitCount).toBe(1);

      redisService.clearMetrics();
      
      metrics = redisService.getMetrics();
      expect(metrics.hitCount).toBe(0);
      expect(metrics.missCount).toBe(0);
      expect(metrics.setCount).toBe(0);
      expect(metrics.deleteCount).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should flush all cached data', async () => {
      await redisService.flushAll();
      expect(mockClient.flushAll).toHaveBeenCalled();
    });
  });
});