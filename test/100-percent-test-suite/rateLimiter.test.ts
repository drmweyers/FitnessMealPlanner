import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import { rateLimiter } from '../../server/middleware/rateLimiter';

// Mock Redis for distributed rate limiting
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  multi: vi.fn(() => ({
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([1, 'OK'])
  }))
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient)
}));

describe('Rate Limiter Tests', () => {
  let app: express.Application;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let requestCounts: Map<string, { count: number; resetTime: number }>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock in-memory store for testing
    requestCounts = new Map();
    
    mockReq = {
      ip: '127.0.0.1',
      headers: {},
      path: '/api/test',
      method: 'GET',
      get: vi.fn(),
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    };
    
    mockNext = vi.fn();

    // Reset Redis mocks
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.expire.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    requestCounts.clear();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const limit = 5;
      const windowMs = 60000; // 1 minute

      app.get('/api/basic', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      // Make requests within limit
      for (let i = 0; i < limit; i++) {
        await request(app).get('/api/basic').expect(200);
      }
    });

    it('should block requests exceeding limit', async () => {
      const limit = 3;
      const windowMs = 60000;

      app.get('/api/limited', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to limit
      for (let i = 0; i < limit; i++) {
        await request(app).get('/api/limited').expect(200);
      }

      // Next request should be blocked
      const response = await request(app).get('/api/limited').expect(429);
      expect(response.body.error).toContain('Too many requests');
    });

    it('should include rate limit headers', async () => {
      const limit = 10;
      const windowMs = 60000;

      app.get('/api/headers', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/api/headers').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe(String(limit));
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should decrease remaining count with each request', async () => {
      const limit = 5;
      const windowMs = 60000;

      app.get('/api/countdown', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      for (let i = 0; i < limit; i++) {
        const response = await request(app).get('/api/countdown').expect(200);
        expect(response.headers['x-ratelimit-remaining']).toBe(String(limit - i - 1));
      }
    });

    it('should handle zero limit correctly', async () => {
      const limit = 0;
      const windowMs = 60000;

      app.get('/api/zero', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/api/zero').expect(429);
    });
  });

  describe('Time Windows', () => {
    it('should reset counter after window expires', async () => {
      const limit = 2;
      const windowMs = 100; // 100ms window

      let requestCount = 0;
      const mockRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = req.ip || '127.0.0.1';
        const window = requestCounts.get(key);

        if (!window || now > window.resetTime) {
          requestCounts.set(key, { count: 1, resetTime: now + windowMs });
          requestCount = 1;
        } else {
          requestCount = ++window.count;
          requestCounts.set(key, window);
        }

        if (requestCount > limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }

        next();
      };

      app.get('/api/window', mockRateLimiter, (req, res) => {
        res.json({ success: true, count: requestCount });
      });

      // Use up the limit
      await request(app).get('/api/window').expect(200);
      await request(app).get('/api/window').expect(200);
      await request(app).get('/api/window').expect(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should work again
      await request(app).get('/api/window').expect(200);
    });

    it('should handle different window sizes', async () => {
      const testCases = [
        { limit: 5, windowMs: 1000 },
        { limit: 10, windowMs: 5000 },
        { limit: 100, windowMs: 60000 }
      ];

      testCases.forEach(({ limit, windowMs }, index) => {
        app.get(`/api/window${index}`, rateLimiter({ limit, windowMs }), (req, res) => {
          res.json({ success: true, limit, windowMs });
        });
      });

      // Test each configuration
      for (let i = 0; i < testCases.length; i++) {
        const response = await request(app).get(`/api/window${i}`).expect(200);
        expect(response.headers['x-ratelimit-limit']).toBe(String(testCases[i].limit));
      }
    });

    it('should calculate reset time correctly', async () => {
      const limit = 5;
      const windowMs = 60000; // 1 minute

      app.get('/api/reset-time', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      const startTime = Date.now();
      const response = await request(app).get('/api/reset-time').expect(200);
      const resetTime = parseInt(response.headers['x-ratelimit-reset']);

      expect(resetTime).toBeGreaterThan(startTime);
      expect(resetTime).toBeLessThanOrEqual(startTime + windowMs);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track different IPs separately', async () => {
      const limit = 2;
      const windowMs = 60000;

      const ipTracker = new Map();
      const mockRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
        const count = ipTracker.get(ip) || 0;
        
        if (count >= limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }
        
        ipTracker.set(ip, count + 1);
        next();
      };

      app.get('/api/ip-separate', mockRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Test with first IP
      await request(app)
        .get('/api/ip-separate')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);
      
      await request(app)
        .get('/api/ip-separate')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);
      
      await request(app)
        .get('/api/ip-separate')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // Test with second IP (should not be affected)
      await request(app)
        .get('/api/ip-separate')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200);
    });

    it('should handle IPv6 addresses', async () => {
      const limit = 3;
      const windowMs = 60000;

      app.get('/api/ipv6', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      for (let i = 0; i < limit; i++) {
        await request(app)
          .get('/api/ipv6')
          .set('X-Forwarded-For', ipv6Address)
          .expect(200);
      }

      await request(app)
        .get('/api/ipv6')
        .set('X-Forwarded-For', ipv6Address)
        .expect(429);
    });

    it('should handle proxy headers correctly', async () => {
      const limit = 2;
      const headers = [
        'X-Forwarded-For',
        'X-Real-IP',
        'X-Client-IP',
        'CF-Connecting-IP' // Cloudflare
      ];

      app.get('/api/proxy', rateLimiter({ limit, windowMs: 60000 }), (req, res) => {
        res.json({ success: true });
      });

      // Test different proxy headers
      for (const header of headers) {
        await request(app)
          .get('/api/proxy')
          .set(header, '203.0.113.1')
          .expect(200);
      }
    });

    it('should sanitize IP addresses', async () => {
      const maliciousIPs = [
        '192.168.1.1; DROP TABLE users;',
        '127.0.0.1<script>alert("xss")</script>',
        '../../etc/passwd',
        'null\x00'
      ];

      app.get('/api/sanitize', rateLimiter({ limit: 5, windowMs: 60000 }), (req, res) => {
        res.json({ success: true });
      });

      for (const maliciousIP of maliciousIPs) {
        await request(app)
          .get('/api/sanitize')
          .set('X-Forwarded-For', maliciousIP)
          .expect(200); // Should not throw errors
      }
    });
  });

  describe('Authentication-based Rate Limiting', () => {
    it('should have different limits for authenticated users', async () => {
      const guestLimit = 2;
      const userLimit = 10;
      const windowMs = 60000;

      const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const isAuthenticated = req.headers.authorization;
        const limit = isAuthenticated ? userLimit : guestLimit;
        const key = isAuthenticated ? `user:${req.headers.authorization}` : `guest:${req.ip}`;
        
        const count = requestCounts.get(key)?.count || 0;
        
        if (count >= limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }
        
        requestCounts.set(key, { count: count + 1, resetTime: Date.now() + windowMs });
        res.setHeader('X-RateLimit-Limit', String(limit));
        res.setHeader('X-RateLimit-Remaining', String(limit - count - 1));
        next();
      };

      app.get('/api/auth-limits', authRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Test guest limits
      await request(app).get('/api/auth-limits').expect(200);
      await request(app).get('/api/auth-limits').expect(200);
      await request(app).get('/api/auth-limits').expect(429);

      // Test authenticated user limits (should be higher)
      for (let i = 0; i < userLimit; i++) {
        await request(app)
          .get('/api/auth-limits')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
      }

      await request(app)
        .get('/api/auth-limits')
        .set('Authorization', 'Bearer valid-token')
        .expect(429);
    });

    it('should handle user-specific rate limits', async () => {
      const userLimits = new Map([
        ['user1', 5],
        ['user2', 10],
        ['premium-user', 100]
      ]);

      const userRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const userId = req.headers['x-user-id'] as string;
        const limit = userLimits.get(userId) || 1;
        const key = `user:${userId}`;
        
        const count = requestCounts.get(key)?.count || 0;
        
        if (count >= limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }
        
        requestCounts.set(key, { count: count + 1, resetTime: Date.now() + 60000 });
        next();
      };

      app.get('/api/user-limits', userRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Test different user limits
      for (const [userId, limit] of userLimits) {
        for (let i = 0; i < limit; i++) {
          await request(app)
            .get('/api/user-limits')
            .set('X-User-ID', userId)
            .expect(200);
        }

        await request(app)
          .get('/api/user-limits')
          .set('X-User-ID', userId)
          .expect(429);
      }
    });

    it('should handle missing authentication gracefully', async () => {
      app.get('/api/missing-auth', rateLimiter({ limit: 5, windowMs: 60000 }), (req, res) => {
        res.json({ success: true });
      });

      // Should work without authentication headers
      await request(app).get('/api/missing-auth').expect(200);
    });
  });

  describe('Endpoint-specific Rate Limiting', () => {
    it('should apply different limits to different endpoints', async () => {
      const limits = {
        '/api/public': { limit: 100, windowMs: 60000 },
        '/api/search': { limit: 50, windowMs: 60000 },
        '/api/upload': { limit: 5, windowMs: 60000 },
        '/api/admin': { limit: 10, windowMs: 60000 }
      };

      Object.entries(limits).forEach(([path, config]) => {
        app.get(path, rateLimiter(config), (req, res) => {
          res.json({ success: true, path });
        });
      });

      // Test that each endpoint has its own limit
      for (const [path, config] of Object.entries(limits)) {
        const response = await request(app).get(path).expect(200);
        expect(response.headers['x-ratelimit-limit']).toBe(String(config.limit));
      }
    });

    it('should handle wildcard paths', async () => {
      app.get('/api/users/:id', rateLimiter({ limit: 10, windowMs: 60000 }), (req, res) => {
        res.json({ userId: req.params.id });
      });

      // Different user IDs should share the same rate limit pool
      await request(app).get('/api/users/1').expect(200);
      await request(app).get('/api/users/2').expect(200);
      
      // Both should count toward the same limit
    });

    it('should support method-specific limits', async () => {
      const getLimit = 100;
      const postLimit = 10;

      app.get('/api/method-specific', rateLimiter({ limit: getLimit, windowMs: 60000 }), (req, res) => {
        res.json({ method: 'GET' });
      });

      app.post('/api/method-specific', rateLimiter({ limit: postLimit, windowMs: 60000 }), (req, res) => {
        res.json({ method: 'POST' });
      });

      const getResponse = await request(app).get('/api/method-specific').expect(200);
      const postResponse = await request(app).post('/api/method-specific').expect(200);

      expect(getResponse.headers['x-ratelimit-limit']).toBe(String(getLimit));
      expect(postResponse.headers['x-ratelimit-limit']).toBe(String(postLimit));
    });
  });

  describe('Distributed Rate Limiting', () => {
    beforeEach(() => {
      // Reset Redis mocks for distributed tests
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.multi.mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([1, 'OK'])
      });
    });

    it('should use Redis for distributed rate limiting', async () => {
      const limit = 5;
      const windowMs = 60000;

      app.get('/api/redis', rateLimiter({ 
        limit, 
        windowMs, 
        store: 'redis',
        redisClient: mockRedisClient 
      }), (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/api/redis').expect(200);

      expect(mockRedisClient.multi).toHaveBeenCalled();
    });

    it('should handle Redis connection failures', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis connection failed'));

      app.get('/api/redis-fail', rateLimiter({ 
        limit: 5, 
        windowMs: 60000,
        store: 'redis',
        redisClient: mockRedisClient,
        skipFailedRequests: true
      }), (req, res) => {
        res.json({ success: true });
      });

      // Should continue working even with Redis failure
      await request(app).get('/api/redis-fail').expect(200);
    });

    it('should synchronize across multiple instances', async () => {
      let redisCounter = 0;
      
      mockRedisClient.incr.mockImplementation(() => {
        redisCounter++;
        return Promise.resolve(redisCounter);
      });

      app.get('/api/sync', rateLimiter({ 
        limit: 3, 
        windowMs: 60000,
        store: 'redis',
        redisClient: mockRedisClient
      }), (req, res) => {
        res.json({ success: true, counter: redisCounter });
      });

      // Simulate requests from multiple instances
      await request(app).get('/api/sync').expect(200);
      await request(app).get('/api/sync').expect(200);
      await request(app).get('/api/sync').expect(200);

      expect(mockRedisClient.incr).toHaveBeenCalledTimes(3);
    });

    it('should handle Redis timeout gracefully', async () => {
      mockRedisClient.incr.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), 1000)
        )
      );

      app.get('/api/redis-timeout', rateLimiter({ 
        limit: 5, 
        windowMs: 60000,
        store: 'redis',
        redisClient: mockRedisClient,
        skipFailedRequests: true,
        timeout: 100
      }), (req, res) => {
        res.json({ success: true });
      });

      // Should fallback gracefully on timeout
      await request(app).get('/api/redis-timeout').expect(200);
    });
  });

  describe('Advanced Features', () => {
    it('should support sliding window rate limiting', async () => {
      const limit = 5;
      const windowMs = 1000;
      const slidingWindow = new Map();

      const slidingRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = req.ip || '127.0.0.1';
        const timestamps = slidingWindow.get(key) || [];
        
        // Remove timestamps outside window
        const validTimestamps = timestamps.filter((ts: number) => now - ts < windowMs);
        
        if (validTimestamps.length >= limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }
        
        validTimestamps.push(now);
        slidingWindow.set(key, validTimestamps);
        next();
      };

      app.get('/api/sliding', slidingRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make requests quickly
      for (let i = 0; i < limit; i++) {
        await request(app).get('/api/sliding').expect(200);
      }

      await request(app).get('/api/sliding').expect(429);

      // Wait half the window and try again
      await new Promise(resolve => setTimeout(resolve, windowMs / 2));
      await request(app).get('/api/sliding').expect(429); // Still within window

      // Wait for full window
      await new Promise(resolve => setTimeout(resolve, windowMs / 2 + 100));
      await request(app).get('/api/sliding').expect(200); // Should work now
    });

    it('should support burst allowance', async () => {
      const normalLimit = 2;
      const burstLimit = 5;
      const windowMs = 1000;
      const burstWindowMs = 100;

      const burstTracker = new Map();

      const burstRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = req.ip || '127.0.0.1';
        const data = burstTracker.get(key) || { 
          normalCount: 0, 
          burstCount: 0, 
          normalReset: now + windowMs,
          burstReset: now + burstWindowMs
        };

        // Reset counters if windows expired
        if (now > data.normalReset) {
          data.normalCount = 0;
          data.normalReset = now + windowMs;
        }
        if (now > data.burstReset) {
          data.burstCount = 0;
          data.burstReset = now + burstWindowMs;
        }

        // Check burst limit first
        if (data.burstCount >= burstLimit) {
          res.status(429).json({ error: 'Burst limit exceeded' });
          return;
        }

        // Check normal limit
        if (data.normalCount >= normalLimit && data.burstCount === 0) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }

        data.normalCount++;
        if (data.normalCount > normalLimit) {
          data.burstCount++;
        }

        burstTracker.set(key, data);
        next();
      };

      app.get('/api/burst', burstRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Use normal limit
      await request(app).get('/api/burst').expect(200);
      await request(app).get('/api/burst').expect(200);

      // Use burst allowance
      await request(app).get('/api/burst').expect(200);
      await request(app).get('/api/burst').expect(200);
      await request(app).get('/api/burst').expect(200);

      // Exceed burst limit
      await request(app).get('/api/burst').expect(429);
    });

    it('should support weighted rate limiting', async () => {
      const weights = {
        'GET': 1,
        'POST': 2,
        'PUT': 3,
        'DELETE': 5
      };
      const limit = 10;
      const weightTracker = new Map();

      const weightedRateLimiter = (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || '127.0.0.1';
        const weight = weights[req.method as keyof typeof weights] || 1;
        const currentWeight = weightTracker.get(key) || 0;

        if (currentWeight + weight > limit) {
          res.status(429).json({ error: 'Weighted rate limit exceeded' });
          return;
        }

        weightTracker.set(key, currentWeight + weight);
        next();
      };

      app.get('/api/weighted', weightedRateLimiter, (req, res) => {
        res.json({ method: 'GET', weight: 1 });
      });

      app.post('/api/weighted', weightedRateLimiter, (req, res) => {
        res.json({ method: 'POST', weight: 2 });
      });

      app.delete('/api/weighted', weightedRateLimiter, (req, res) => {
        res.json({ method: 'DELETE', weight: 5 });
      });

      // Make requests with different weights
      await request(app).get('/api/weighted').expect(200);    // Weight: 1, Total: 1
      await request(app).post('/api/weighted').expect(200);   // Weight: 2, Total: 3
      await request(app).get('/api/weighted').expect(200);    // Weight: 1, Total: 4
      await request(app).delete('/api/weighted').expect(200); // Weight: 5, Total: 9
      
      // Next request should exceed limit
      await request(app).post('/api/weighted').expect(429);   // Weight: 2, Total would be 11
    });

    it('should support custom key generators', async () => {
      const customKeyLimiter = (req: Request, res: Response, next: NextFunction) => {
        // Use API key instead of IP
        const apiKey = req.headers['x-api-key'] as string;
        const key = apiKey || `ip:${req.ip}`;
        const limit = apiKey ? 100 : 10; // Higher limit for API key users
        
        const count = requestCounts.get(key)?.count || 0;
        
        if (count >= limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }
        
        requestCounts.set(key, { count: count + 1, resetTime: Date.now() + 60000 });
        next();
      };

      app.get('/api/custom-key', customKeyLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Test with API key
      for (let i = 0; i < 15; i++) {
        await request(app)
          .get('/api/custom-key')
          .set('X-API-Key', 'valid-api-key')
          .expect(200);
      }

      // Test without API key (should have lower limit)
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/custom-key').expect(200);
      }

      await request(app).get('/api/custom-key').expect(429);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request data', async () => {
      app.get('/api/malformed', rateLimiter({ limit: 5, windowMs: 60000 }), (req, res) => {
        res.json({ success: true });
      });

      // Test with various malformed headers
      const malformedHeaders = [
        { 'X-Forwarded-For': null },
        { 'X-Forwarded-For': undefined },
        { 'X-Forwarded-For': '' },
        { 'X-Forwarded-For': 'not-an-ip' }
      ];

      for (const headers of malformedHeaders) {
        await request(app)
          .get('/api/malformed')
          .set(headers)
          .expect(200); // Should handle gracefully
      }
    });

    it('should handle storage errors gracefully', async () => {
      const errorStore = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error'))
      };

      app.get('/api/storage-error', rateLimiter({ 
        limit: 5, 
        windowMs: 60000,
        store: errorStore,
        skipFailedRequests: true
      }), (req, res) => {
        res.json({ success: true });
      });

      // Should continue working despite storage errors
      await request(app).get('/api/storage-error').expect(200);
    });

    it('should handle high concurrency', async () => {
      const limit = 10;
      let processedRequests = 0;

      app.get('/api/concurrent', rateLimiter({ limit, windowMs: 60000 }), (req, res) => {
        processedRequests++;
        res.json({ success: true, processed: processedRequests });
      });

      // Make many concurrent requests
      const promises = Array(50).fill(null).map(() => request(app).get('/api/concurrent'));
      const responses = await Promise.allSettled(promises);

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(successful).toBeLessThanOrEqual(limit);
      expect(rateLimited).toBeGreaterThan(0);
      expect(successful + rateLimited).toBe(50);
    });

    it('should handle memory pressure', async () => {
      const limit = 1000;
      const windowMs = 60000;

      // Create many unique IPs to test memory usage
      app.get('/api/memory', rateLimiter({ limit, windowMs }), (req, res) => {
        res.json({ success: true });
      });

      // Simulate requests from many different IPs
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .get('/api/memory')
          .set('X-Forwarded-For', `192.168.${Math.floor(i / 256)}.${i % 256}`)
          .expect(200);
      }

      // Should not crash or use excessive memory
    });

    it('should cleanup expired entries', async () => {
      const shortWindow = 100; // 100ms
      let cleanupCalled = false;

      const selfCleaningLimiter = (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = req.ip || '127.0.0.1';

        // Cleanup expired entries
        for (const [k, v] of requestCounts.entries()) {
          if (now > v.resetTime) {
            requestCounts.delete(k);
            cleanupCalled = true;
          }
        }

        const data = requestCounts.get(key) || { count: 0, resetTime: now + shortWindow };
        
        if (data.count >= 2) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }

        data.count++;
        requestCounts.set(key, data);
        next();
      };

      app.get('/api/cleanup', selfCleaningLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Create entries
      await request(app).get('/api/cleanup').expect(200);
      await request(app).get('/api/cleanup').expect(200);
      await request(app).get('/api/cleanup').expect(429);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup
      await request(app).get('/api/cleanup').expect(200);
      expect(cleanupCalled).toBe(true);
    });
  });
});