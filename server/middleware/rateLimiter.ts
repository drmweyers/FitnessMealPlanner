import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Create rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit?.resetTime
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting in test environment or for Playwright tests
    return process.env.NODE_ENV === 'test' || 
           process.env.PLAYWRIGHT_TEST === 'true' ||
           req.headers['x-playwright-test'] === 'true' ||
           req.headers['user-agent']?.includes('Playwright');
  }
});

// Create a lighter rate limiter for general auth operations
export const generalAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // More lenient for general operations
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting in test environment or for Playwright tests
    return process.env.NODE_ENV === 'test' || 
           process.env.PLAYWRIGHT_TEST === 'true' ||
           req.headers['x-playwright-test'] === 'true' ||
           req.headers['user-agent']?.includes('Playwright');
  }
});

// Password reset specific rate limiter (stricter)
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting in test environment or for Playwright tests
    return process.env.NODE_ENV === 'test' || 
           process.env.PLAYWRIGHT_TEST === 'true' ||
           req.headers['x-playwright-test'] === 'true' ||
           req.headers['user-agent']?.includes('Playwright');
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many password reset attempts. Please try again in an hour.',
      code: 'PASSWORD_RESET_RATE_LIMIT',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});