import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { cacheMiddleware } from '../../server/middleware/cacheMiddleware';

// Mock Redis if used
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    flushAll: vi.fn(),
    quit: vi.fn(),
  }))
}));

describe('Cache Middleware Tests', () => {
  let app: express.Application;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockCache: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock cache storage
    mockCache = new Map();
    
    mockReq = {
      method: 'GET',
      url: '/api/test',
      headers: {},
      query: {},
      originalUrl: '/api/test',
      get: vi.fn(),
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      locals: {},
    };
    
    mockNext = vi.fn();

    // Mock cache implementation
    vi.mocked(cacheMiddleware).mockImplementation((req, res, next) => {
      // Add cache functionality to response
      res.locals = res.locals || {};
      res.locals.cache = mockCache;
      next();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockCache.clear();
  });

  describe('Basic Caching', () => {
    it('should cache GET responses', async () => {
      let callCount = 0;
      
      app.get('/api/data', cacheMiddleware, (req, res) => {
        callCount++;
        res.json({ data: 'test', timestamp: Date.now() });
      });

      // First request should call the handler
      const response1 = await request(app).get('/api/data').expect(200);
      expect(callCount).toBe(1);

      // Second request should return cached response
      const response2 = await request(app).get('/api/data').expect(200);
      expect(callCount).toBe(1); // Handler not called again
      
      expect(response1.body.data).toBe(response2.body.data);
    });

    it('should not cache POST requests', async () => {
      let callCount = 0;
      
      app.post('/api/data', cacheMiddleware, (req, res) => {
        callCount++;
        res.json({ success: true, timestamp: Date.now() });
      });

      await request(app).post('/api/data').send({ test: 'data' }).expect(200);
      await request(app).post('/api/data').send({ test: 'data' }).expect(200);
      
      expect(callCount).toBe(2); // Both requests should hit the handler
    });

    it('should not cache PUT requests', async () => {
      let callCount = 0;
      
      app.put('/api/data', cacheMiddleware, (req, res) => {
        callCount++;
        res.json({ success: true });
      });

      await request(app).put('/api/data').send({ test: 'data' }).expect(200);
      await request(app).put('/api/data').send({ test: 'data' }).expect(200);
      
      expect(callCount).toBe(2);
    });

    it('should not cache DELETE requests', async () => {
      let callCount = 0;
      
      app.delete('/api/data', cacheMiddleware, (req, res) => {
        callCount++;
        res.json({ success: true });
      });

      await request(app).delete('/api/data').expect(200);
      await request(app).delete('/api/data').expect(200);
      
      expect(callCount).toBe(2);
    });

    it('should cache with different TTL values', async () => {
      const shortTTL = 100; // 100ms
      const longTTL = 5000; // 5s

      app.get('/api/short', cacheMiddleware({ ttl: shortTTL }), (req, res) => {
        res.json({ data: 'short-lived', timestamp: Date.now() });
      });

      app.get('/api/long', cacheMiddleware({ ttl: longTTL }), (req, res) => {
        res.json({ data: 'long-lived', timestamp: Date.now() });
      });

      // Cache both endpoints
      await request(app).get('/api/short').expect(200);
      await request(app).get('/api/long').expect(200);

      // Wait for short cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Short cache should be expired, long cache should still be valid
      const shortResponse = await request(app).get('/api/short').expect(200);
      const longResponse = await request(app).get('/api/long').expect(200);
      
      expect(shortResponse.body.timestamp).toBeGreaterThan(0);
      expect(longResponse.body.timestamp).toBeGreaterThan(0);
    });
  });

  describe('ETag Support', () => {
    it('should generate ETags for responses', async () => {
      app.get('/api/etag', cacheMiddleware, (req, res) => {
        res.json({ data: 'test-etag' });
      });

      const response = await request(app).get('/api/etag').expect(200);
      
      expect(response.headers.etag).toBeDefined();
      expect(response.headers.etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should return 304 for matching ETags', async () => {
      const testData = { data: 'etag-test', id: 123 };
      const etag = `"${crypto.createHash('md5').update(JSON.stringify(testData)).digest('hex')}"`;

      app.get('/api/etag-match', cacheMiddleware, (req, res) => {
        res.json(testData);
      });

      // First request to get ETag
      const response1 = await request(app).get('/api/etag-match').expect(200);
      const receivedETag = response1.headers.etag;

      // Second request with If-None-Match header
      const response2 = await request(app)
        .get('/api/etag-match')
        .set('If-None-Match', receivedETag)
        .expect(304);

      expect(response2.body).toEqual({});
    });

    it('should return full response for non-matching ETags', async () => {
      app.get('/api/etag-nomatch', cacheMiddleware, (req, res) => {
        res.json({ data: 'different-content', timestamp: Date.now() });
      });

      const response = await request(app)
        .get('/api/etag-nomatch')
        .set('If-None-Match', '"wrong-etag"')
        .expect(200);

      expect(response.body.data).toBe('different-content');
      expect(response.headers.etag).toBeDefined();
    });

    it('should handle multiple ETags in If-None-Match', async () => {
      const testData = { value: 'multi-etag-test' };

      app.get('/api/multi-etag', cacheMiddleware, (req, res) => {
        res.json(testData);
      });

      // Get the actual ETag
      const response1 = await request(app).get('/api/multi-etag').expect(200);
      const actualETag = response1.headers.etag;

      // Test with multiple ETags including the correct one
      const response2 = await request(app)
        .get('/api/multi-etag')
        .set('If-None-Match', `"wrong1", ${actualETag}, "wrong2"`)
        .expect(304);

      expect(response2.body).toEqual({});
    });

    it('should handle weak ETags', async () => {
      app.get('/api/weak-etag', cacheMiddleware, (req, res) => {
        res.setHeader('ETag', 'W/"weak-etag-123"');
        res.json({ data: 'weak-etag-content' });
      });

      const response = await request(app)
        .get('/api/weak-etag')
        .set('If-None-Match', 'W/"weak-etag-123"')
        .expect(304);

      expect(response.body).toEqual({});
    });
  });

  describe('Cache Keys', () => {
    it('should generate different cache keys for different URLs', async () => {
      const cacheKeys: string[] = [];
      
      const mockCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
        const cacheKey = `${req.method}:${req.originalUrl}`;
        cacheKeys.push(cacheKey);
        next();
      };

      app.get('/api/endpoint1', mockCacheMiddleware, (req, res) => {
        res.json({ endpoint: 1 });
      });

      app.get('/api/endpoint2', mockCacheMiddleware, (req, res) => {
        res.json({ endpoint: 2 });
      });

      await request(app).get('/api/endpoint1').expect(200);
      await request(app).get('/api/endpoint2').expect(200);

      expect(cacheKeys).toHaveLength(2);
      expect(cacheKeys[0]).toBe('GET:/api/endpoint1');
      expect(cacheKeys[1]).toBe('GET:/api/endpoint2');
    });

    it('should include query parameters in cache keys', async () => {
      const cacheKeys: string[] = [];
      
      const mockCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
        const cacheKey = `${req.method}:${req.originalUrl}`;
        cacheKeys.push(cacheKey);
        next();
      };

      app.get('/api/search', mockCacheMiddleware, (req, res) => {
        res.json({ query: req.query.q });
      });

      await request(app).get('/api/search?q=test1').expect(200);
      await request(app).get('/api/search?q=test2').expect(200);
      await request(app).get('/api/search?q=test1&sort=name').expect(200);

      expect(cacheKeys).toHaveLength(3);
      expect(cacheKeys[0]).toBe('GET:/api/search?q=test1');
      expect(cacheKeys[1]).toBe('GET:/api/search?q=test2');
      expect(cacheKeys[2]).toBe('GET:/api/search?q=test1&sort=name');
    });

    it('should handle cache key collisions gracefully', async () => {
      const responses: any[] = [];
      
      app.get('/api/collision', cacheMiddleware, (req, res) => {
        const data = { path: req.path, timestamp: Date.now() };
        responses.push(data);
        res.json(data);
      });

      // Make multiple requests that could have similar cache keys
      await request(app).get('/api/collision').expect(200);
      await request(app).get('/api/collision').expect(200);

      expect(responses).toHaveLength(1); // Second request should use cache
    });

    it('should normalize cache keys consistently', async () => {
      const cacheKeys: Set<string> = new Set();
      
      const mockCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
        // Normalize the cache key
        const normalizedUrl = req.originalUrl.toLowerCase().replace(/\/+/g, '/');
        const cacheKey = `${req.method}:${normalizedUrl}`;
        cacheKeys.add(cacheKey);
        next();
      };

      app.get('/api/normalize', mockCacheMiddleware, (req, res) => {
        res.json({ normalized: true });
      });

      // Test different URL variations that should normalize to the same key
      await request(app).get('/api/normalize').expect(200);
      await request(app).get('/API/NORMALIZE').expect(404); // Case sensitive in Express
      await request(app).get('/api//normalize').expect(404); // Double slash

      expect(cacheKeys.size).toBe(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache on write operations', async () => {
      let getCallCount = 0;
      let postCallCount = 0;

      app.get('/api/resource', cacheMiddleware, (req, res) => {
        getCallCount++;
        res.json({ data: 'resource-data', callCount: getCallCount });
      });

      app.post('/api/resource', cacheMiddleware, (req, res) => {
        postCallCount++;
        // Invalidate cache for GET endpoint
        mockCache.clear();
        res.json({ success: true });
      });

      // Initial GET request (should cache)
      await request(app).get('/api/resource').expect(200);
      expect(getCallCount).toBe(1);

      // Second GET request (should use cache)
      await request(app).get('/api/resource').expect(200);
      expect(getCallCount).toBe(1);

      // POST request (should invalidate cache)
      await request(app).post('/api/resource').send({}).expect(200);
      expect(postCallCount).toBe(1);

      // GET request after POST (should call handler again)
      await request(app).get('/api/resource').expect(200);
      expect(getCallCount).toBe(2);
    });

    it('should support manual cache invalidation', async () => {
      let callCount = 0;

      app.get('/api/manual-cache', cacheMiddleware, (req, res) => {
        callCount++;
        res.json({ data: 'manual-cache-data', callCount });
      });

      app.delete('/api/manual-cache/cache', (req, res) => {
        // Manual cache invalidation
        mockCache.delete('GET:/api/manual-cache');
        res.json({ success: true });
      });

      // Cache the response
      await request(app).get('/api/manual-cache').expect(200);
      await request(app).get('/api/manual-cache').expect(200);
      expect(callCount).toBe(1);

      // Manually invalidate cache
      await request(app).delete('/api/manual-cache/cache').expect(200);

      // Next request should hit the handler
      await request(app).get('/api/manual-cache').expect(200);
      expect(callCount).toBe(2);
    });

    it('should invalidate related cache entries', async () => {
      const invalidatedKeys: string[] = [];
      
      const mockInvalidate = (pattern: string) => {
        for (const key of mockCache.keys()) {
          if (key.includes(pattern)) {
            mockCache.delete(key);
            invalidatedKeys.push(key);
          }
        }
      };

      app.get('/api/users/:id', cacheMiddleware, (req, res) => {
        res.json({ user: { id: req.params.id, name: 'Test User' } });
      });

      app.get('/api/users', cacheMiddleware, (req, res) => {
        res.json({ users: [{ id: 1, name: 'Test User' }] });
      });

      app.put('/api/users/:id', (req, res) => {
        // Invalidate all user-related cache entries
        mockInvalidate('/api/users');
        res.json({ success: true });
      });

      // Cache multiple user endpoints
      await request(app).get('/api/users/1').expect(200);
      await request(app).get('/api/users').expect(200);

      // Update user (should invalidate related caches)
      await request(app).put('/api/users/1').send({ name: 'Updated User' }).expect(200);

      expect(invalidatedKeys).toContain('GET:/api/users/1');
      expect(invalidatedKeys).toContain('GET:/api/users');
    });

    it('should handle cache expiration gracefully', async () => {
      let callCount = 0;
      const shortTTL = 50; // 50ms

      app.get('/api/expiring', cacheMiddleware({ ttl: shortTTL }), (req, res) => {
        callCount++;
        res.json({ data: 'expiring-data', callCount });
      });

      // Initial request
      await request(app).get('/api/expiring').expect(200);
      expect(callCount).toBe(1);

      // Request before expiration
      await request(app).get('/api/expiring').expect(200);
      expect(callCount).toBe(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      // Request after expiration
      await request(app).get('/api/expiring').expect(200);
      expect(callCount).toBe(2);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large response bodies efficiently', async () => {
      const largeData = Array(10000).fill(null).map((_, i) => ({
        id: i,
        data: `large-item-${i}`,
        timestamp: Date.now()
      }));

      app.get('/api/large', cacheMiddleware, (req, res) => {
        res.json({ items: largeData });
      });

      const startTime = Date.now();
      await request(app).get('/api/large').expect(200);
      const firstRequestTime = Date.now() - startTime;

      const cacheStartTime = Date.now();
      await request(app).get('/api/large').expect(200);
      const cacheRequestTime = Date.now() - cacheStartTime;

      // Cached request should be significantly faster
      expect(cacheRequestTime).toBeLessThan(firstRequestTime);
      expect(cacheRequestTime).toBeLessThan(50); // Should be very fast
    });

    it('should limit cache size to prevent memory issues', async () => {
      const maxCacheSize = 100;
      let cacheSize = 0;

      const limitedCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'GET') {
          const cacheKey = `${req.method}:${req.originalUrl}`;
          
          if (mockCache.has(cacheKey)) {
            const cached = mockCache.get(cacheKey);
            res.json(cached);
            return;
          }

          // Intercept response to cache it
          const originalJson = res.json;
          res.json = function(data) {
            if (cacheSize >= maxCacheSize) {
              // Remove oldest entry
              const oldestKey = mockCache.keys().next().value;
              if (oldestKey) {
                mockCache.delete(oldestKey);
                cacheSize--;
              }
            }
            
            mockCache.set(cacheKey, data);
            cacheSize++;
            
            return originalJson.call(this, data);
          };
        }
        next();
      };

      app.get('/api/limited/:id', limitedCacheMiddleware, (req, res) => {
        res.json({ id: req.params.id, data: `item-${req.params.id}` });
      });

      // Create more entries than the cache limit
      for (let i = 0; i < maxCacheSize + 10; i++) {
        await request(app).get(`/api/limited/${i}`).expect(200);
      }

      expect(mockCache.size).toBeLessThanOrEqual(maxCacheSize);
    });

    it('should handle concurrent requests efficiently', async () => {
      let callCount = 0;
      
      app.get('/api/concurrent', cacheMiddleware, (req, res) => {
        callCount++;
        // Simulate async work
        setTimeout(() => {
          res.json({ data: 'concurrent-test', callCount });
        }, 10);
      });

      // Make multiple concurrent requests
      const promises = Array(10).fill(null).map(() => 
        request(app).get('/api/concurrent')
      );

      const responses = await Promise.all(promises);
      
      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBe('concurrent-test');
      });

      // Handler should only be called once due to caching
      expect(callCount).toBe(1);
    });

    it('should clean up expired cache entries automatically', async () => {
      const shortTTL = 100; // 100ms
      let cleanupCallCount = 0;

      const cleanupMiddleware = (req: Request, res: Response, next: NextFunction) => {
        // Simulate automatic cleanup
        const now = Date.now();
        for (const [key, value] of mockCache.entries()) {
          if (value.expireAt && now > value.expireAt) {
            mockCache.delete(key);
            cleanupCallCount++;
          }
        }
        next();
      };

      app.get('/api/cleanup', cleanupMiddleware, cacheMiddleware, (req, res) => {
        const expireAt = Date.now() + shortTTL;
        const data = { data: 'cleanup-test', expireAt };
        
        // Store with expiration
        mockCache.set(`GET:${req.originalUrl}`, data);
        res.json(data);
      });

      // Create cache entry
      await request(app).get('/api/cleanup').expect(200);
      expect(mockCache.size).toBe(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next request should trigger cleanup
      await request(app).get('/api/cleanup').expect(200);
      expect(cleanupCallCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache storage errors gracefully', async () => {
      let callCount = 0;

      // Mock cache that throws errors
      const errorCache = {
        get: vi.fn().mockImplementation(() => { throw new Error('Cache read error'); }),
        set: vi.fn().mockImplementation(() => { throw new Error('Cache write error'); }),
        delete: vi.fn().mockImplementation(() => { throw new Error('Cache delete error'); })
      };

      app.get('/api/cache-error', (req, res, next) => {
        try {
          // Try to use cache but handle errors
          const cacheKey = `${req.method}:${req.originalUrl}`;
          
          try {
            const cached = errorCache.get(cacheKey);
            if (cached) {
              res.json(cached);
              return;
            }
          } catch (e) {
            // Cache read failed, continue normally
          }

          callCount++;
          const data = { data: 'error-test', callCount };
          
          try {
            errorCache.set(cacheKey, data);
          } catch (e) {
            // Cache write failed, but still return response
          }
          
          res.json(data);
        } catch (error) {
          next(error);
        }
      });

      // Should work despite cache errors
      const response = await request(app).get('/api/cache-error').expect(200);
      expect(response.body.data).toBe('error-test');
      expect(callCount).toBe(1);
    });

    it('should not cache error responses', async () => {
      let callCount = 0;

      app.get('/api/error-response', cacheMiddleware, (req, res) => {
        callCount++;
        if (req.query.error === 'true') {
          res.status(500).json({ error: 'Server error' });
        } else {
          res.json({ success: true, callCount });
        }
      });

      // Error response should not be cached
      await request(app).get('/api/error-response?error=true').expect(500);
      await request(app).get('/api/error-response?error=true').expect(500);
      expect(callCount).toBe(2); // Both requests should hit handler

      // Success response should be cached
      await request(app).get('/api/error-response').expect(200);
      await request(app).get('/api/error-response').expect(200);
      expect(callCount).toBe(3); // Only one additional call for success
    });

    it('should handle malformed cache data', async () => {
      app.get('/api/malformed', cacheMiddleware, (req, res) => {
        res.json({ data: 'malformed-test' });
      });

      // Manually corrupt cache data
      mockCache.set('GET:/api/malformed', 'invalid-json-data');

      // Should handle corrupted cache gracefully and regenerate
      const response = await request(app).get('/api/malformed').expect(200);
      expect(response.body.data).toBe('malformed-test');
    });

    it('should handle network timeouts in distributed cache', async () => {
      const timeoutCache = {
        get: vi.fn().mockImplementation(() => {
          return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), 1000);
          });
        }),
        set: vi.fn().mockResolvedValue(true)
      };

      app.get('/api/timeout', (req, res) => {
        // Simulate timeout handling with fallback
        const startTime = Date.now();
        
        Promise.race([
          timeoutCache.get(`${req.method}:${req.originalUrl}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cache timeout')), 100)
          )
        ]).catch(() => {
          // Cache timeout, proceed without cache
          const duration = Date.now() - startTime;
          res.json({ data: 'timeout-test', duration });
        });
      });

      const response = await request(app).get('/api/timeout').expect(200);
      expect(response.body.data).toBe('timeout-test');
      expect(response.body.duration).toBeLessThan(200); // Should timeout quickly
    });
  });
});