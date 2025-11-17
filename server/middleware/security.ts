/**
 * Enhanced Security Middleware
 * 
 * Comprehensive security enhancements including headers,
 * content security policy, rate limiting, and input validation.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';
import crypto from 'crypto';

/**
 * Enhanced security headers middleware
 * Implements comprehensive security headers based on OWASP recommendations
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "frame-src 'self' https://accounts.google.com",
    "connect-src 'self' https://api.openai.com https://accounts.google.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : [])
  ];

  // Generate nonce for inline scripts (if needed)
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  // Security Headers
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'magnetometer=()',
    'gyroscope=()',
    'payment=()',
    'usb=()'
  ].join(', '));

  // Production-only headers
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }

  // Remove server identifying headers
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'FitMeal-Server');

  next();
};

/**
 * Input validation and sanitization middleware
 */
export const inputValidation = (req: Request, res: Response, next: NextFunction) => {
  const suspicious: string[] = [];

  // Check for potentially dangerous patterns
  const checkForSuspiciousContent = (obj: any, path = ''): void => {
    if (typeof obj === 'string') {
      // SQL injection patterns
      if (/(\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/i.test(obj)) {
        suspicious.push(`Potential SQL injection in ${path}: ${obj.substring(0, 100)}`);
      }
      
      // XSS patterns
      if (/<script|javascript:|on\w+\s*=|<iframe|<object/i.test(obj)) {
        suspicious.push(`Potential XSS in ${path}: ${obj.substring(0, 100)}`);
      }
      
      // Path traversal
      if (/\.\.[\/\\]|\.\.%2f|\.\.%5c/i.test(obj)) {
        suspicious.push(`Potential path traversal in ${path}: ${obj.substring(0, 100)}`);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        checkForSuspiciousContent(obj[key], `${path}.${key}`);
      });
    }
  };

  // Validate request body
  if (req.body && typeof req.body === 'object') {
    checkForSuspiciousContent(req.body, 'body');
  }

  // Validate query parameters
  if (req.query && typeof req.query === 'object') {
    checkForSuspiciousContent(req.query, 'query');
  }

  // Log and block suspicious requests
  if (suspicious.length > 0) {
    logger.warn('Suspicious request detected', {
      userId: (req as any).user?.id,
      feature: 'security',
      action: 'suspicious_input',
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        suspicious,
      },
    });

    return res.status(400).json({
      status: 'error',
      message: 'Invalid input detected',
      code: 'INVALID_INPUT',
    });
  }

  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimiter = (maxSizeMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (contentLength > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        feature: 'security',
        action: 'size_limit_exceeded',
        metadata: {
          contentLength,
          maxSizeBytes,
          path: req.path,
          ip: req.ip,
        },
      });

      return res.status(413).json({
        status: 'error',
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
      });
    }

    next();
  };
};

/**
 * API key validation middleware for external integrations
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (req.path.startsWith('/api/webhook') || req.path.startsWith('/api/external')) {
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      logger.warn('Invalid API key used', {
        feature: 'security',
        action: 'invalid_api_key',
        metadata: {
          path: req.path,
          ip: req.ip,
          providedKey: apiKey ? 'provided' : 'missing',
        },
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid or missing API key',
        code: 'INVALID_API_KEY',
      });
    }
  }

  next();
};

/**
 * Middleware to prevent common attacks
 */
export const attackPrevention = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious user agents
  const userAgent = req.get('User-Agent') || '';
  const suspiciousAgents = [
    'sqlmap',
    'nmap',
    'nikto',
    'masscan',
    'zgrab',
    'curl', // Be careful with curl in production
  ];

  if (process.env.NODE_ENV === 'production') {
    for (const agent of suspiciousAgents) {
      if (userAgent.toLowerCase().includes(agent)) {
        logger.warn('Suspicious user agent detected', {
          feature: 'security',
          action: 'suspicious_user_agent',
          metadata: {
            userAgent,
            ip: req.ip,
            path: req.path,
          },
        });

        return res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'FORBIDDEN',
        });
      }
    }
  }

  // Check for HTTP method override attacks
  const method = req.method.toUpperCase();
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  
  if (!allowedMethods.includes(method)) {
    logger.warn('Unsupported HTTP method', {
      feature: 'security',
      action: 'invalid_method',
      metadata: {
        method,
        path: req.path,
        ip: req.ip,
      },
    });

    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  next();
};

/**
 * Comprehensive security middleware stack
 */
export const securityMiddleware = [
  securityHeaders,
  requestSizeLimiter(10), // 10MB limit
  inputValidation,
  validateApiKey,
  attackPrevention,
];