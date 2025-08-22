/**
 * Analytics Middleware - Security, Rate Limiting, and Error Handling
 * 
 * Provides comprehensive middleware for the analytics and engagement system.
 * Includes security measures, rate limiting, request validation, and monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getRedisService } from '../services/RedisService';
import { getEngagementService } from '../services/EngagementService';

const redis = getRedisService();
const engagementService = getEngagementService();

// Constants for rate limiting and security
const RATE_LIMIT_WINDOWS = {
  STRICT: 60 * 1000, // 1 minute
  MODERATE: 5 * 60 * 1000, // 5 minutes
  LENIENT: 15 * 60 * 1000, // 15 minutes
  HOURLY: 60 * 60 * 1000 // 1 hour
};

const RATE_LIMITS = {
  ANALYTICS_READ: { window: RATE_LIMIT_WINDOWS.MODERATE, max: 100 },
  ANALYTICS_WRITE: { window: RATE_LIMIT_WINDOWS.STRICT, max: 50 },
  FAVORITES_MODIFY: { window: RATE_LIMIT_WINDOWS.STRICT, max: 30 },
  RECOMMENDATIONS: { window: RATE_LIMIT_WINDOWS.MODERATE, max: 20 },
  ADMIN_ANALYTICS: { window: RATE_LIMIT_WINDOWS.MODERATE, max: 200 }
};

// Security patterns to detect potential abuse
const SUSPICIOUS_PATTERNS = {
  BOT_USER_AGENTS: [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /automated/i
  ],
  RAPID_REQUESTS: {
    threshold: 10, // requests
    window: 10 * 1000 // 10 seconds
  },
  SUSPICIOUS_IPS: new Set<string>() // Would be populated from threat intelligence
};

interface RateLimitWindow {
  count: number;
  resetTime: number;
  suspicious?: boolean;
}

interface SecurityContext {
  isBot: boolean;
  isSuspicious: boolean;
  requestPattern: 'normal' | 'rapid' | 'burst';
  riskScore: number;
}

/**
 * Advanced Rate Limiting Middleware
 */
export function createAdvancedRateLimit(limitType: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[limitType];
  const windows = new Map<string, RateLimitWindow>();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = getRequestIdentifier(req);
      const now = Date.now();
      const window = windows.get(identifier);

      // Clean expired windows periodically
      if (Math.random() < 0.01) { // 1% chance to clean
        cleanExpiredWindows(windows, now);
      }

      if (!window || now > window.resetTime) {
        windows.set(identifier, { 
          count: 1, 
          resetTime: now + config.window,
          suspicious: false
        });
        return next();
      }

      // Check for suspicious patterns
      const securityContext = await analyzeSecurityContext(req, window);
      
      if (securityContext.isSuspicious) {
        await logSuspiciousActivity(req, securityContext);
        
        return res.status(429).json({
          status: 'error',
          code: 'SUSPICIOUS_ACTIVITY_DETECTED',
          message: 'Request blocked due to suspicious activity',
          retryAfter: Math.ceil((window.resetTime - now) / 1000)
        });
      }

      if (window.count >= config.max) {
        // Implement exponential backoff for repeated violations
        const backoffMultiplier = Math.min(Math.floor(window.count / config.max), 5);
        const retryAfter = Math.ceil((window.resetTime - now) / 1000) * (1 + backoffMultiplier);

        return res.status(429).json({
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for ${limitType}. Please try again later.`,
          retryAfter,
          limit: config.max,
          window: config.window / 1000,
          remaining: 0
        });
      }

      window.count++;
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - window.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(window.resetTime / 1000));

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Don't block requests due to rate limiting errors
    }
  };
}

/**
 * Security Analysis Middleware
 */
export async function securityAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    const securityContext = await analyzeSecurityContext(req);
    
    // Add security context to request
    (req as any).securityContext = securityContext;

    // Block high-risk requests
    if (securityContext.riskScore > 80) {
      await logSecurityEvent(req, 'HIGH_RISK_REQUEST_BLOCKED', securityContext);
      
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Request denied due to security policy'
      });
    }

    // Flag medium-risk requests for monitoring
    if (securityContext.riskScore > 50) {
      await logSecurityEvent(req, 'MEDIUM_RISK_REQUEST_FLAGGED', securityContext);
    }

    next();
  } catch (error) {
    console.error('Security analysis error:', error);
    next(); // Don't block requests due to security analysis errors
  }
}

/**
 * Request Validation Middleware
 */
export function validateAnalyticsRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (req.method !== 'GET' && Object.keys(req.body).length > 0) {
        const bodyValidation = schema.safeParse(req.body);
        if (!bodyValidation.success) {
          return res.status(400).json({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            errors: bodyValidation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              received: err.input
            }))
          });
        }
        req.body = bodyValidation.data;
      }

      // Validate common query parameters
      const querySchema = z.object({
        page: z.string().optional().transform(val => {
          if (!val) return 1;
          const parsed = parseInt(val);
          return isNaN(parsed) ? 1 : Math.max(1, Math.min(parsed, 1000));
        }),
        limit: z.string().optional().transform(val => {
          if (!val) return 20;
          const parsed = parseInt(val);
          return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 100));
        }),
        sort: z.string().optional(),
        order: z.enum(['asc', 'desc']).optional().default('desc')
      });

      const queryValidation = querySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters',
          errors: queryValidation.error.errors
        });
      }

      // Merge validated query params
      req.query = { ...req.query, ...queryValidation.data };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Request Monitoring Middleware
 */
export function requestMonitoring(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response data
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Log analytics request
    logAnalyticsRequest({
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      responseTime,
      statusCode: res.statusCode,
      responseSize: Buffer.byteLength(data || '', 'utf8'),
      timestamp: new Date()
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Data Sanitization Middleware
 */
export function sanitizeAnalyticsData(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Privacy Protection Middleware
 */
export function privacyProtection(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;

  res.json = function(data: any) {
    // Remove sensitive information from responses
    const sanitizedData = removeSensitiveData(data);
    return originalJson.call(this, sanitizedData);
  };

  next();
}

/**
 * Error Handling Middleware for Analytics APIs
 */
export function analyticsErrorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Analytics API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Log error for monitoring
  logAnalyticsError(error, req);

  // Handle specific error types
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      status: 'error',
      code: 'DUPLICATE_ENTRY',
      message: 'A duplicate entry was detected'
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_REFERENCE',
      message: 'Referenced resource does not exist'
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Access denied'
    });
  }

  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      status: 'error',
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database service temporarily unavailable'
    });
  }

  // Redis connection errors
  if (error.message?.includes('Redis') || error.message?.includes('ECONNRESET')) {
    return res.status(503).json({
      status: 'error',
      code: 'CACHE_SERVICE_UNAVAILABLE',
      message: 'Cache service temporarily unavailable'
    });
  }

  // Default error response
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
}

/**
 * Helper Functions
 */
function getRequestIdentifier(req: Request): string {
  // Use user ID if authenticated, otherwise use IP + User-Agent hash
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  const userAgent = req.get('User-Agent') || '';
  const fingerprint = Buffer.from(`${req.ip}:${userAgent}`).toString('base64').slice(0, 16);
  return `anon:${fingerprint}`;
}

async function analyzeSecurityContext(req: Request, window?: RateLimitWindow): Promise<SecurityContext> {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip;
  
  let riskScore = 0;
  let requestPattern: 'normal' | 'rapid' | 'burst' = 'normal';

  // Check for bot user agents
  const isBot = SUSPICIOUS_PATTERNS.BOT_USER_AGENTS.some(pattern => pattern.test(userAgent));
  if (isBot) riskScore += 30;

  // Check for suspicious IPs
  if (SUSPICIOUS_IPS.has(ip)) riskScore += 50;

  // Analyze request patterns
  if (window) {
    if (window.count > SUSPICIOUS_PATTERNS.RAPID_REQUESTS.threshold) {
      requestPattern = 'rapid';
      riskScore += 25;
    }
  }

  // Check for missing or suspicious headers
  if (!userAgent) riskScore += 20;
  if (!req.get('Accept')) riskScore += 15;

  const isSuspicious = riskScore > 70 || (isBot && requestPattern === 'rapid');

  return {
    isBot,
    isSuspicious,
    requestPattern,
    riskScore
  };
}

function cleanExpiredWindows(windows: Map<string, RateLimitWindow>, now: number) {
  for (const [key, window] of windows.entries()) {
    if (now > window.resetTime) {
      windows.delete(key);
    }
  }
}

async function logSuspiciousActivity(req: Request, securityContext: SecurityContext) {
  try {
    await engagementService.trackInteraction(
      'suspicious_activity',
      req.user?.id,
      req.sessionID,
      'security',
      undefined,
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        riskScore: securityContext.riskScore,
        isBot: securityContext.isBot,
        requestPattern: securityContext.requestPattern
      }
    );
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
}

async function logSecurityEvent(req: Request, eventType: string, securityContext: SecurityContext) {
  try {
    await engagementService.trackInteraction(
      'security_event',
      req.user?.id,
      req.sessionID,
      'security',
      undefined,
      {
        eventType,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        securityContext
      }
    );
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function logAnalyticsRequest(data: any) {
  try {
    // Store request metrics in Redis for monitoring
    const key = `analytics:requests:${new Date().toISOString().split('T')[0]}`;
    await redis.set(key, JSON.stringify(data), 86400); // 24 hours TTL
  } catch (error) {
    console.error('Failed to log analytics request:', error);
  }
}

async function logAnalyticsError(error: any, req: Request) {
  try {
    await engagementService.trackInteraction(
      'api_error',
      req.user?.id,
      req.sessionID,
      'system',
      undefined,
      {
        errorType: error.name,
        errorMessage: error.message,
        path: req.path,
        method: req.method,
        stack: error.stack?.slice(0, 500) // Truncate stack trace
      }
    );
  } catch (logError) {
    console.error('Failed to log analytics error:', logError);
  }
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof key === 'string' && !isSensitiveField(key)) {
      sanitized[sanitizeValue(key)] = sanitizeObject(value);
    }
  }

  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove potential XSS and injection patterns
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .slice(0, 1000); // Limit string length
  }
  
  return value;
}

function isSensitiveField(field: string): boolean {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth',
    'ssn', 'social', 'credit', 'card', 'cvv'
  ];
  
  return sensitiveFields.some(sensitive => 
    field.toLowerCase().includes(sensitive)
  );
}

function removeSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(removeSensitiveData);
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isSensitiveField(key)) {
      cleaned[key] = removeSensitiveData(value);
    } else {
      cleaned[key] = '[REDACTED]';
    }
  }

  return cleaned;
}

// Export all middleware functions
export {
  securityAnalysis,
  validateAnalyticsRequest,
  requestMonitoring,
  sanitizeAnalyticsData,
  privacyProtection,
  analyticsErrorHandler
};