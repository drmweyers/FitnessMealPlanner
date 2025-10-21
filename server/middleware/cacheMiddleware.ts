/**
 * Cache Middleware
 * 
 * Express middleware for automatic request/response caching with Redis.
 * Provides intelligent caching strategies for different types of requests.
 * 
 * Features:
 * - Automatic response caching based on HTTP methods and headers
 * - User-specific and role-based cache segregation
 * - Intelligent cache key generation
 * - Cache invalidation on mutations
 * - Rate limiting with Redis
 * - Cache-Control header respect
 * - ETag support for client-side caching
 * - Compression for large responses
 * - Performance monitoring and metrics
 */

import { Request, Response, NextFunction } from 'express';
import { CacheService, CacheOptions } from '../services/cacheService';
import { createHash } from 'crypto';
import { promisify } from 'util';
import zlib from 'zlib';

const gzip = promisify(zlib.gzip);

export interface CacheMiddlewareOptions {
  ttl?: number; // Cache TTL in seconds
  namespace?: string; // Cache namespace
  userSpecific?: boolean; // Include user ID in cache key
  roleSpecific?: boolean; // Include user role in cache key
  skipCache?: (req: Request) => boolean; // Function to skip caching
  keyGenerator?: (req: Request) => string; // Custom cache key generator
  shouldCache?: (req: Request, res: Response) => boolean; // Whether to cache response
  tags?: string[] | ((req: Request) => string[]); // Cache tags
  vary?: string[]; // Vary headers to include in cache key
  compress?: boolean; // Compress cached responses
  debug?: boolean; // Enable debug logging
}

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator for rate limiting
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  onLimitReached?: (req: Request, res: Response) => void; // Callback when limit reached
}

/**
 * Generate a cache key from request
 */
function generateCacheKey(req: Request, options: CacheMiddlewareOptions): string {
  // Use custom key generator if provided
  if (options.keyGenerator) {
    return options.keyGenerator(req);
  }

  const parts: string[] = [];
  
  // Base path and method
  parts.push(req.method);
  parts.push(req.path);
  
  // Query parameters (sorted for consistency)
  if (Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&');
    parts.push(`query:${sortedQuery}`);
  }
  
  // User-specific caching
  if (options.userSpecific && req.user?.id) {
    parts.push(`user:${req.user.id}`);
  }
  
  // Role-specific caching
  if (options.roleSpecific && req.user?.role) {
    parts.push(`role:${req.user.role}`);
  }
  
  // Include Vary headers in cache key
  if (options.vary) {
    for (const header of options.vary) {
      const value = req.get(header);
      if (value) {
        parts.push(`${header.toLowerCase()}:${value}`);
      }
    }
  }
  
  // Create hash of the key parts for consistent length
  const keyString = parts.join('|');
  const hash = createHash('sha256').update(keyString).digest('hex').substring(0, 16);
  
  return `${options.namespace || 'api'}:${hash}`;
}

/**
 * Check if request should be cached
 */
function shouldCacheRequest(req: Request, options: CacheMiddlewareOptions): boolean {
  // Skip caching function provided
  if (options.skipCache && options.skipCache(req)) {
    return false;
  }
  
  // Only cache GET requests by default
  if (req.method !== 'GET') {
    return false;
  }
  
  // Don't cache if no-cache header present
  if (req.get('Cache-Control')?.includes('no-cache')) {
    return false;
  }
  
  // Don't cache if private data (authentication required but no user-specific caching)
  if (req.user && !options.userSpecific && !options.roleSpecific) {
    return false;
  }
  
  return true;
}

/**
 * Check if response should be cached
 */
function shouldCacheResponse(req: Request, res: Response, options: CacheMiddlewareOptions): boolean {
  // Custom shouldCache function
  if (options.shouldCache) {
    return options.shouldCache(req, res);
  }
  
  // Only cache successful responses
  if (res.statusCode < 200 || res.statusCode >= 300) {
    return false;
  }
  
  // Don't cache if response has Cache-Control: no-cache or private
  const cacheControl = res.get('Cache-Control');
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('private'))) {
    return false;
  }
  
  return true;
}

/**
 * Calculate ETag for response data
 */
function calculateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return `"${createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Cache middleware factory
 */
export function createCacheMiddleware(
  cacheService: CacheService,
  options: CacheMiddlewareOptions = {}
) {
  const defaultOptions: CacheMiddlewareOptions = {
    ttl: 300, // 5 minutes default
    namespace: 'api',
    userSpecific: false,
    roleSpecific: false,
    compress: true,
    debug: false,
    ...options,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Skip caching for non-cacheable requests
    if (!shouldCacheRequest(req, defaultOptions)) {
      if (defaultOptions.debug) {
        console.log(`[CacheMiddleware] Skipping cache for ${req.method} ${req.path}`);
      }
      return next();
    }

    const cacheKey = generateCacheKey(req, defaultOptions);
    
    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey, {
        namespace: defaultOptions.namespace,
        tags: Array.isArray(defaultOptions.tags) 
          ? defaultOptions.tags 
          : typeof defaultOptions.tags === 'function' 
            ? defaultOptions.tags(req) 
            : undefined,
      });

      if (cachedResponse) {
        if (defaultOptions.debug) {
          console.log(`[CacheMiddleware] Cache HIT for ${cacheKey} (${Date.now() - startTime}ms)`);
        }

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        // Handle ETag
        if (cachedResponse.etag) {
          res.set('ETag', cachedResponse.etag);
          
          // Check if client has current version
          if (req.get('If-None-Match') === cachedResponse.etag) {
            return res.status(304).end();
          }
        }
        
        // Set content type
        if (cachedResponse.contentType) {
          res.set('Content-Type', cachedResponse.contentType);
        }
        
        // Handle compression
        if (cachedResponse.compressed && req.get('Accept-Encoding')?.includes('gzip')) {
          res.set('Content-Encoding', 'gzip');
          return res.status(cachedResponse.statusCode || 200).send(cachedResponse.data);
        } else if (cachedResponse.compressed) {
          // Client doesn't accept gzip, decompress
          try {
            const decompressed = await promisify(zlib.gunzip)(cachedResponse.data);
            return res.status(cachedResponse.statusCode || 200).send(decompressed);
          } catch (error) {
            console.error('[CacheMiddleware] Decompression error:', error);
            return res.status(cachedResponse.statusCode || 200).json(cachedResponse.data);
          }
        }
        
        return res.status(cachedResponse.statusCode || 200).json(cachedResponse.data);
      }

      // Cache miss - continue with request processing
      if (defaultOptions.debug) {
        console.log(`[CacheMiddleware] Cache MISS for ${cacheKey}`);
      }
      
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Intercept response to cache it
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Flag to prevent double caching
      let responseCached = false;
      
      const cacheResponse = async (data: any, isJson: boolean = false) => {
        if (responseCached) return;
        responseCached = true;
        
        try {
          // Check if we should cache this response
          if (!shouldCacheResponse(req, res, defaultOptions)) {
            return;
          }

          const responseData = isJson ? data : data?.toString();
          const contentType = res.get('Content-Type') || (isJson ? 'application/json' : 'text/html');
          
          // Calculate ETag
          const etag = calculateETag(responseData);
          res.set('ETag', etag);
          
          // Prepare cache entry
          const cacheData: any = {
            data: responseData,
            statusCode: res.statusCode,
            contentType,
            etag,
            compressed: false,
          };
          
          // Compress large responses
          if (defaultOptions.compress && JSON.stringify(responseData).length > 1024) {
            try {
              const compressed = await gzip(JSON.stringify(responseData));
              cacheData.data = compressed;
              cacheData.compressed = true;
            } catch (error) {
              console.warn('[CacheMiddleware] Compression failed, storing uncompressed:', error);
            }
          }
          
          // Cache the response
          const cacheOptions: CacheOptions = {
            ttl: defaultOptions.ttl,
            namespace: defaultOptions.namespace,
            tags: Array.isArray(defaultOptions.tags) 
              ? defaultOptions.tags 
              : typeof defaultOptions.tags === 'function' 
                ? defaultOptions.tags(req) 
                : undefined,
          };
          
          await cacheService.set(cacheKey, cacheData, cacheOptions);
          
          if (defaultOptions.debug) {
            console.log(`[CacheMiddleware] Cached response for ${cacheKey} (${Date.now() - startTime}ms)`);
          }
          
        } catch (error) {
          console.error('[CacheMiddleware] Error caching response:', error);
        }
      };
      
      // Override res.json
      res.json = function(data: any) {
        cacheResponse(data, true).finally(() => {
          originalJson.call(this, data);
        });
        return this;
      };
      
      // Override res.send
      res.send = function(data: any) {
        cacheResponse(data, false).finally(() => {
          originalSend.call(this, data);
        });
        return this;
      };
      
      next();
      
    } catch (error) {
      console.error('[CacheMiddleware] Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Rate limiting middleware using Redis
 */
export function createRateLimitMiddleware(
  cacheService: CacheService,
  options: RateLimitOptions = {}
) {
  const defaultOptions: RateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    ...options,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : `ratelimit:${req.ip}:${req.path}`;

      const windowStart = Math.floor(Date.now() / defaultOptions.windowMs!) * defaultOptions.windowMs!;
      const rateLimitKey = `${key}:${windowStart}`;

      // Get current request count
      const currentCount = await cacheService.get(rateLimitKey) || 0;
      const count = typeof currentCount === 'number' ? currentCount : parseInt(currentCount) || 0;

      // Check if limit exceeded
      if (count >= defaultOptions.maxRequests!) {
        // Call limit reached callback
        if (defaultOptions.onLimitReached) {
          defaultOptions.onLimitReached(req, res);
        }

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': defaultOptions.maxRequests!.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (windowStart + defaultOptions.windowMs!).toString(),
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(defaultOptions.windowMs! / 1000),
        });
      }

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': defaultOptions.maxRequests!.toString(),
        'X-RateLimit-Remaining': (defaultOptions.maxRequests! - count - 1).toString(),
        'X-RateLimit-Reset': (windowStart + defaultOptions.windowMs!).toString(),
      });

      // Increment counter
      const newCount = count + 1;
      await cacheService.set(rateLimitKey, newCount, {
        ttl: Math.ceil(defaultOptions.windowMs! / 1000),
        namespace: 'ratelimit',
      });

      next();

    } catch (error) {
      console.error('[RateLimitMiddleware] Rate limit middleware error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

/**
 * Cache invalidation middleware for mutation operations
 */
export function createCacheInvalidationMiddleware(
  cacheService: CacheService,
  options: {
    patterns?: string[];
    tags?: string[];
    namespace?: string;
  } = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only invalidate on successful mutations
    const originalSend = res.send;
    const originalJson = res.json;
    
    const invalidateCache = async () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return; // Don't invalidate on failed requests
      }

      try {
        // Invalidate by patterns
        if (options.patterns) {
          for (const pattern of options.patterns) {
            await cacheService.invalidateByPattern(pattern, options.namespace);
          }
        }

        // Invalidate by tags
        if (options.tags) {
          for (const tag of options.tags) {
            await cacheService.invalidateByTag(tag);
          }
        }

      } catch (error) {
        console.error('[CacheInvalidationMiddleware] Cache invalidation error:', error);
      }
    };

    // Override response methods
    res.json = function(data: any) {
      invalidateCache().finally(() => {
        originalJson.call(this, data);
      });
      return this;
    };

    res.send = function(data: any) {
      invalidateCache().finally(() => {
        originalSend.call(this, data);
      });
      return this;
    };

    next();
  };
}

/**
 * Conditional caching middleware that enables/disables based on feature flags
 */
export function createConditionalCacheMiddleware(
  cacheService: CacheService,
  options: CacheMiddlewareOptions & {
    isEnabled?: (req: Request) => boolean | Promise<boolean>;
    fallbackToNoCache?: boolean;
  }
) {
  const cacheMiddleware = createCacheMiddleware(cacheService, options);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if caching is enabled
      const enabled = options.isEnabled ? await options.isEnabled(req) : true;
      
      if (!enabled) {
        if (options.fallbackToNoCache) {
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return next();
      }

      return cacheMiddleware(req, res, next);
    } catch (error) {
      console.error('[ConditionalCacheMiddleware] Error checking cache enabled status:', error);
      return next();
    }
  };
}

// Utility functions for common caching patterns

/**
 * Create middleware for user-specific data caching
 */
export function createUserCacheMiddleware(cacheService: CacheService, ttl: number = 300) {
  return createCacheMiddleware(cacheService, {
    ttl,
    namespace: 'user',
    userSpecific: true,
    tags: ['user-data'],
  });
}

/**
 * Create middleware for public data caching (longer TTL)
 */
export function createPublicCacheMiddleware(cacheService: CacheService, ttl: number = 3600) {
  return createCacheMiddleware(cacheService, {
    ttl,
    namespace: 'public',
    userSpecific: false,
    tags: ['public-data'],
  });
}

/**
 * Create middleware for recipe caching with tags
 */
export function createRecipeCacheMiddleware(cacheService: CacheService) {
  return createCacheMiddleware(cacheService, {
    ttl: 1800, // 30 minutes
    namespace: 'recipes',
    userSpecific: true,
    tags: (req) => {
      const tags = ['recipes'];
      if (req.params.id) tags.push(`recipe:${req.params.id}`);
      return tags;
    },
  });
}

/**
 * Create middleware for meal plan caching with user-specific keys
 */
export function createMealPlanCacheMiddleware(cacheService: CacheService) {
  return createCacheMiddleware(cacheService, {
    ttl: 900, // 15 minutes
    namespace: 'meal-plans',
    userSpecific: true,
    tags: (req) => {
      const tags = ['meal-plans'];
      if (req.params.id) tags.push(`meal-plan:${req.params.id}`);
      if (req.user?.id) tags.push(`user:${req.user.id}`);
      return tags;
    },
  });
}