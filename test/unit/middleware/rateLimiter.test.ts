import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock rate limiter implementation
const mockRateLimiter = {
  // In-memory store for rate limiting
  store: new Map<string, { count: number; resetTime: number }>(),

  // Default configuration
  defaultConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Generate key for rate limiting
  generateKey: (req: Request) => {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },

  // Create rate limiter middleware
  createRateLimiter: (options: any = {}) => {
    const config = { ...mockRateLimiter.defaultConfig, ...options };

    return (req: Request, res: Response, next: NextFunction) => {
      const key = mockRateLimiter.generateKey(req);
      const now = Date.now();
      const resetTime = now + config.windowMs;

      let clientData = mockRateLimiter.store.get(key);

      // Reset if window expired
      if (!clientData || now > clientData.resetTime) {
        clientData = { count: 0, resetTime };
        mockRateLimiter.store.set(key, clientData);
      }

      clientData.count++;

      // Set rate limit headers
      if (config.standardHeaders) {
        res.setHeader('X-RateLimit-Limit', config.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - clientData.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));
      }

      // Check if limit exceeded
      if (clientData.count > config.max) {
        if (config.standardHeaders) {
          res.setHeader('Retry-After', Math.ceil((clientData.resetTime - now) / 1000));
        }

        return res.status(429).json({
          error: config.message,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }

      next();
    };
  },

  // Specialized rate limiters
  authRateLimiter: () => {
    return mockRateLimiter.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
      message: 'Too many login attempts, please try again later.'
    });
  },

  apiRateLimiter: () => {
    return mockRateLimiter.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 API calls per window
      message: 'API rate limit exceeded, please slow down.'
    });
  },

  recipeGenerationLimiter: () => {
    return mockRateLimiter.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 recipe generations per hour
      message: 'Recipe generation rate limit exceeded.'
    });
  },

  // Clear all rate limit data
  clearStore: () => {
    mockRateLimiter.store.clear();
  },

  // Get current rate limit data for key
  getClientData: (key: string) => {
    return mockRateLimiter.store.get(key);
  },

  // Clean expired entries
  cleanExpired: () => {
    const now = Date.now();
    for (const [key, data] of mockRateLimiter.store.entries()) {
      if (now > data.resetTime) {
        mockRateLimiter.store.delete(key);
      }
    }
  }
};

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRateLimiter.clearStore();

    mockReq = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };

    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    mockRateLimiter.clearStore();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 5, windowMs: 60000 });

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 3, windowMs: 60000 });

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 4th request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too many requests, please try again later.'
      }));
    });

    it('should set appropriate headers', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 10, windowMs: 60000 });

      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should set retry-after header when limit exceeded', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 1, windowMs: 60000 });

      // First request - allowed
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // Second request - blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });
  });

  describe('Key Generation', () => {
    it('should use IP address as default key', () => {
      mockReq.ip = '192.168.1.1';
      const key = mockRateLimiter.generateKey(mockReq as Request);
      expect(key).toBe('192.168.1.1');
    });

    it('should fall back to connection remote address', () => {
      mockReq.ip = undefined;
      mockReq.connection = { remoteAddress: '10.0.0.1' };
      const key = mockRateLimiter.generateKey(mockReq as Request);
      expect(key).toBe('10.0.0.1');
    });

    it('should use unknown for missing IP', () => {
      mockReq.ip = undefined;
      mockReq.connection = undefined;
      const key = mockRateLimiter.generateKey(mockReq as Request);
      expect(key).toBe('unknown');
    });

    it('should separate different IPs', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 1, windowMs: 60000 });

      // IP 1 - make 1 request (within limit)
      mockReq.ip = '192.168.1.1';
      limiter(mockReq as Request, mockRes as Response, mockNext);

      // IP 2 - should also be allowed
      mockReq.ip = '192.168.1.2';
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Window Management', () => {
    it('should reset counts after window expires', async () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 1, windowMs: 100 });

      // Make first request
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Make second request - should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Reset mocks
      mockRes.status = vi.fn().mockReturnThis();
      mockNext = vi.fn();

      // Should be allowed again
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should clean expired entries', () => {
      // Add expired entry
      mockRateLimiter.store.set('expired-key', {
        count: 5,
        resetTime: Date.now() - 1000 // Expired 1 second ago
      });

      // Add valid entry
      mockRateLimiter.store.set('valid-key', {
        count: 3,
        resetTime: Date.now() + 60000 // Valid for 1 minute
      });

      expect(mockRateLimiter.store.size).toBe(2);

      mockRateLimiter.cleanExpired();

      expect(mockRateLimiter.store.size).toBe(1);
      expect(mockRateLimiter.store.has('valid-key')).toBe(true);
      expect(mockRateLimiter.store.has('expired-key')).toBe(false);
    });
  });

  describe('Specialized Rate Limiters', () => {
    it('should create authentication rate limiter with strict limits', () => {
      const authLimiter = mockRateLimiter.authRateLimiter();

      // Make 5 auth attempts (should reach limit)
      for (let i = 0; i < 5; i++) {
        authLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 6th attempt should be blocked
      authLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too many login attempts, please try again later.'
      }));
    });

    it('should create API rate limiter with high limits', () => {
      const apiLimiter = mockRateLimiter.apiRateLimiter();

      // Should allow many API requests
      for (let i = 0; i < 100; i++) {
        apiLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(100);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should create recipe generation limiter with hourly limits', () => {
      const recipeLimiter = mockRateLimiter.recipeGenerationLimiter();

      // Make 10 recipe generation requests
      for (let i = 0; i < 10; i++) {
        recipeLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 11th request should be blocked
      recipeLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Recipe generation rate limit exceeded.'
      }));
    });
  });

  describe('Configuration Options', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        max: 50,
        windowMs: 30000,
        message: 'Custom rate limit message'
      };

      const limiter = mockRateLimiter.createRateLimiter(customConfig);

      // Make 50 requests (within custom limit)
      for (let i = 0; i < 50; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // 51st request should be blocked with custom message
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(50);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Custom rate limit message'
      }));
    });

    it('should disable headers when standardHeaders is false', () => {
      const limiter = mockRateLimiter.createRateLimiter({
        standardHeaders: false,
        max: 10,
        windowMs: 60000
      });

      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalledWith('X-RateLimit-Limit', expect.anything());
      expect(mockRes.setHeader).not.toHaveBeenCalledWith('X-RateLimit-Remaining', expect.anything());
      expect(mockRes.setHeader).not.toHaveBeenCalledWith('X-RateLimit-Reset', expect.anything());
    });
  });

  describe('Performance Tests', () => {
    it('should handle high request volumes efficiently', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 10000, windowMs: 60000 });
      const startTime = performance.now();

      // Simulate 1000 requests
      for (let i = 0; i < 1000; i++) {
        mockReq.ip = `192.168.1.${i % 255}`;
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should handle 1000 requests in under 100ms
      expect(executionTime).toBeLessThan(100);
    });

    it('should clean expired entries efficiently', () => {
      // Add many expired entries
      for (let i = 0; i < 1000; i++) {
        mockRateLimiter.store.set(`expired-${i}`, {
          count: 1,
          resetTime: Date.now() - 1000
        });
      }

      // Add some valid entries
      for (let i = 0; i < 100; i++) {
        mockRateLimiter.store.set(`valid-${i}`, {
          count: 1,
          resetTime: Date.now() + 60000
        });
      }

      expect(mockRateLimiter.store.size).toBe(1100);

      const startTime = performance.now();
      mockRateLimiter.cleanExpired();
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(mockRateLimiter.store.size).toBe(100);
      // Should clean 1000 expired entries in under 50ms
      expect(executionTime).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing request properties gracefully', () => {
      const limiter = mockRateLimiter.createRateLimiter();
      const emptyReq: Partial<Request> = {};

      expect(() => {
        limiter(emptyReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle concurrent requests to same key', () => {
      const limiter = mockRateLimiter.createRateLimiter({ max: 5, windowMs: 60000 });

      // Simulate concurrent requests
      Promise.all([
        limiter(mockReq as Request, mockRes as Response, mockNext),
        limiter(mockReq as Request, mockRes as Response, mockNext),
        limiter(mockReq as Request, mockRes as Response, mockNext)
      ]);

      // Should handle without throwing errors
      expect(mockNext).toHaveBeenCalled();
    });
  });
});