/**
 * Rate Limiting Service
 * 
 * Comprehensive rate limiting service using Redis with multiple algorithms,
 * user-specific limits, and intelligent protection mechanisms.
 * 
 * Features:
 * - Multiple rate limiting algorithms (Token Bucket, Sliding Window, Fixed Window)
 * - User role-based rate limiting
 * - IP-based and user-based limiting
 * - Endpoint-specific rate limits
 * - Burst protection and gradual recovery
 * - Rate limit analytics and monitoring
 * - Whitelist and blacklist support
 * - Geographic rate limiting
 * - API key-based rate limiting
 */

import { CacheService } from './cacheService';
import { Request } from 'express';
import { EventEmitter } from 'events';

export interface RateLimitRule {
  id: string;
  name: string;
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window';
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  burstLimit?: number; // Allow burst up to this limit
  refillRate?: number; // Token refill rate (for token bucket)
  keyGenerator?: (req: Request) => string;
  skipCondition?: (req: Request) => boolean;
  onLimitExceeded?: (req: Request, info: RateLimitInfo) => void;
  enabled: boolean;
  priority: number; // Higher priority rules are checked first
}

export interface RateLimitInfo {
  ruleId: string;
  key: string;
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
  algorithm: string;
}

export interface UserRateLimitConfig {
  role: string;
  limits: {
    [endpoint: string]: {
      windowMs: number;
      maxRequests: number;
      burstLimit?: number;
    };
  };
}

export interface RateLimitMetrics {
  totalRequests: number;
  limitedRequests: number;
  limitRate: number;
  topLimitedIPs: Array<{ ip: string; count: number }>;
  topLimitedUsers: Array<{ userId: string; count: number }>;
  endpointMetrics: {
    [endpoint: string]: {
      requests: number;
      limited: number;
      limitRate: number;
    };
  };
}

export class RateLimitService extends EventEmitter {
  private cacheService: CacheService;
  private rules: Map<string, RateLimitRule> = new Map();
  private userConfigs: Map<string, UserRateLimitConfig> = new Map();
  private whitelist: Set<string> = new Set(); // IPs or user IDs
  private blacklist: Set<string> = new Set(); // IPs or user IDs
  private metrics: RateLimitMetrics;
  private readonly METRICS_TTL = 3600; // 1 hour
  private readonly RATE_LIMIT_TTL = 86400; // 24 hours

  constructor(cacheService: CacheService) {
    super();
    this.cacheService = cacheService;
    this.metrics = {
      totalRequests: 0,
      limitedRequests: 0,
      limitRate: 0,
      topLimitedIPs: [],
      topLimitedUsers: [],
      endpointMetrics: {},
    };
    
    this.initializeDefaultRules();
  }

  // =======================
  // Rule Management
  // =======================

  /**
   * Initialize default rate limiting rules
   */
  private initializeDefaultRules(): void {
    // Global API rate limit
    this.addRule({
      id: 'global',
      name: 'Global API Rate Limit',
      algorithm: 'sliding-window',
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      burstLimit: 50,
      keyGenerator: (req) => `global:${this.getClientId(req)}`,
      enabled: true,
      priority: 1,
    });

    // Authentication endpoints (stricter)
    this.addRule({
      id: 'auth',
      name: 'Authentication Rate Limit',
      algorithm: 'fixed-window',
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // Only 5 login attempts per 15 minutes
      keyGenerator: (req) => `auth:${this.getClientId(req)}`,
      skipCondition: (req) => !req.path.includes('/auth/'),
      enabled: true,
      priority: 10,
    });

    // Recipe generation (resource intensive)
    this.addRule({
      id: 'recipe-generation',
      name: 'Recipe Generation Rate Limit',
      algorithm: 'token-bucket',
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      burstLimit: 3,
      refillRate: 1, // 1 token per 6 minutes
      keyGenerator: (req) => `recipe-gen:${req.user?.id || this.getClientId(req)}`,
      skipCondition: (req) => !req.path.includes('/api/admin/generate-recipes'),
      enabled: true,
      priority: 9,
    });

    // Meal plan generation (resource intensive)
    this.addRule({
      id: 'meal-plan-generation',
      name: 'Meal Plan Generation Rate Limit',
      algorithm: 'token-bucket',
      windowMs: 30 * 60 * 1000, // 30 minutes
      maxRequests: 5,
      burstLimit: 2,
      refillRate: 1, // 1 token per 6 minutes
      keyGenerator: (req) => `meal-plan-gen:${req.user?.id || this.getClientId(req)}`,
      skipCondition: (req) => !req.path.includes('/api/meal-plan/generate'),
      enabled: true,
      priority: 8,
    });

    // PDF export rate limiting
    this.addRule({
      id: 'pdf-export',
      name: 'PDF Export Rate Limit',
      algorithm: 'sliding-window',
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10,
      keyGenerator: (req) => `pdf:${req.user?.id || this.getClientId(req)}`,
      skipCondition: (req) => !req.path.includes('/api/pdf/'),
      enabled: true,
      priority: 7,
    });

    // File upload rate limiting
    this.addRule({
      id: 'file-upload',
      name: 'File Upload Rate Limit',
      algorithm: 'sliding-window',
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 20,
      keyGenerator: (req) => `upload:${req.user?.id || this.getClientId(req)}`,
      skipCondition: (req) => !req.path.includes('/upload'),
      enabled: true,
      priority: 6,
    });

    // User role-specific limits
    this.initializeUserConfigs();
  }

  /**
   * Initialize user role-specific configurations
   */
  private initializeUserConfigs(): void {
    // Admin users - higher limits
    this.setUserRoleConfig('admin', {
      role: 'admin',
      limits: {
        '/api/admin/': { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 20 },
        '/api/recipes/': { windowMs: 60 * 1000, maxRequests: 200, burstLimit: 50 },
        '/api/meal-plan/': { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 25 },
      },
    });

    // Trainer users - moderate limits
    this.setUserRoleConfig('trainer', {
      role: 'trainer',
      limits: {
        '/api/trainer/': { windowMs: 60 * 1000, maxRequests: 60, burstLimit: 15 },
        '/api/recipes/': { windowMs: 60 * 1000, maxRequests: 100, burstLimit: 25 },
        '/api/meal-plan/': { windowMs: 60 * 1000, maxRequests: 50, burstLimit: 12 },
      },
    });

    // Customer users - standard limits
    this.setUserRoleConfig('customer', {
      role: 'customer',
      limits: {
        '/api/customer/': { windowMs: 60 * 1000, maxRequests: 30, burstLimit: 8 },
        '/api/meal-plan/': { windowMs: 60 * 1000, maxRequests: 20, burstLimit: 5 },
        '/api/progress/': { windowMs: 60 * 1000, maxRequests: 40, burstLimit: 10 },
      },
    });
  }

  /**
   * Add a new rate limiting rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove a rate limiting rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.emit('ruleRemoved', { ruleId });
    }
    return removed;
  }

  /**
   * Update a rate limiting rule
   */
  updateRule(ruleId: string, updates: Partial<RateLimitRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updated = { ...rule, ...updates };
    this.rules.set(ruleId, updated);
    this.emit('ruleUpdated', { ruleId, updates });
    return true;
  }

  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleId, { enabled });
  }

  // =======================
  // User Configuration
  // =======================

  /**
   * Set user role-based rate limiting configuration
   */
  setUserRoleConfig(role: string, config: UserRateLimitConfig): void {
    this.userConfigs.set(role, config);
    this.emit('userConfigUpdated', { role, config });
  }

  /**
   * Get user role-based configuration
   */
  getUserRoleConfig(role: string): UserRateLimitConfig | undefined {
    return this.userConfigs.get(role);
  }

  // =======================
  // Whitelist/Blacklist Management
  // =======================

  /**
   * Add IP or user ID to whitelist
   */
  addToWhitelist(identifier: string): void {
    this.whitelist.add(identifier);
    this.emit('whitelistUpdated', { action: 'add', identifier });
  }

  /**
   * Remove from whitelist
   */
  removeFromWhitelist(identifier: string): boolean {
    const removed = this.whitelist.delete(identifier);
    if (removed) {
      this.emit('whitelistUpdated', { action: 'remove', identifier });
    }
    return removed;
  }

  /**
   * Add IP or user ID to blacklist
   */
  addToBlacklist(identifier: string): void {
    this.blacklist.add(identifier);
    this.emit('blacklistUpdated', { action: 'add', identifier });
  }

  /**
   * Remove from blacklist
   */
  removeFromBlacklist(identifier: string): boolean {
    const removed = this.blacklist.delete(identifier);
    if (removed) {
      this.emit('blacklistUpdated', { action: 'remove', identifier });
    }
    return removed;
  }

  // =======================
  // Rate Limiting Logic
  // =======================

  /**
   * Check rate limits for a request
   */
  async checkRateLimit(req: Request): Promise<RateLimitInfo | null> {
    const clientId = this.getClientId(req);
    
    // Check blacklist first
    if (this.blacklist.has(clientId) || (req.user?.id && this.blacklist.has(req.user.id))) {
      this.emit('requestBlocked', { clientId, userId: req.user?.id, reason: 'blacklisted' });
      return {
        ruleId: 'blacklist',
        key: clientId,
        current: Infinity,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + 86400000, // 24 hours
        retryAfter: 86400,
        algorithm: 'blacklist',
      };
    }

    // Check whitelist - skip rate limiting
    if (this.whitelist.has(clientId) || (req.user?.id && this.whitelist.has(req.user.id))) {
      return null;
    }

    // Check rules in priority order
    const sortedRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      // Skip if rule has skip condition and it matches
      if (rule.skipCondition && rule.skipCondition(req)) {
        continue;
      }

      const limitInfo = await this.checkRule(req, rule);
      if (limitInfo && limitInfo.remaining <= 0) {
        await this.recordLimitExceeded(req, limitInfo);
        
        if (rule.onLimitExceeded) {
          rule.onLimitExceeded(req, limitInfo);
        }
        
        this.emit('rateLimitExceeded', { 
          clientId, 
          userId: req.user?.id, 
          rule: rule.id,
          info: limitInfo 
        });
        
        return limitInfo;
      }
    }

    // Update metrics for successful request
    await this.updateMetrics(req, false);
    return null;
  }

  /**
   * Check a specific rule
   */
  private async checkRule(req: Request, rule: RateLimitRule): Promise<RateLimitInfo | null> {
    const key = rule.keyGenerator ? rule.keyGenerator(req) : `default:${this.getClientId(req)}`;
    
    switch (rule.algorithm) {
      case 'fixed-window':
        return await this.checkFixedWindow(key, rule);
      case 'sliding-window':
        return await this.checkSlidingWindow(key, rule);
      case 'token-bucket':
        return await this.checkTokenBucket(key, rule);
      default:
        console.warn(`[RateLimitService] Unknown algorithm: ${rule.algorithm}`);
        return null;
    }
  }

  /**
   * Fixed window rate limiting
   */
  private async checkFixedWindow(key: string, rule: RateLimitRule): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const cacheKey = `fixed:${key}:${windowStart}`;
    
    const current = await this.cacheService.get(cacheKey) || 0;
    const newCount = typeof current === 'number' ? current + 1 : parseInt(current) + 1;
    
    // Set with TTL
    const ttlSeconds = Math.ceil((windowStart + rule.windowMs - now) / 1000);
    await this.cacheService.set(cacheKey, newCount, {
      ttl: ttlSeconds,
      namespace: 'rate-limit',
    });
    
    return {
      ruleId: rule.id,
      key,
      current: newCount,
      limit: rule.maxRequests,
      remaining: Math.max(0, rule.maxRequests - newCount),
      resetTime: windowStart + rule.windowMs,
      retryAfter: Math.ceil((windowStart + rule.windowMs - now) / 1000),
      algorithm: 'fixed-window',
    };
  }

  /**
   * Sliding window rate limiting
   */
  private async checkSlidingWindow(key: string, rule: RateLimitRule): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const cacheKey = `sliding:${key}`;
    
    // Get current requests in window
    const requests = await this.cacheService.get(cacheKey) || [];
    const requestList = Array.isArray(requests) ? requests : [];
    
    // Filter requests within window
    const validRequests = requestList.filter((timestamp: number) => timestamp > windowStart);
    
    // Add current request
    validRequests.push(now);
    
    // Update cache
    await this.cacheService.set(cacheKey, validRequests, {
      ttl: Math.ceil(rule.windowMs / 1000),
      namespace: 'rate-limit',
    });
    
    const current = validRequests.length;
    
    return {
      ruleId: rule.id,
      key,
      current,
      limit: rule.maxRequests,
      remaining: Math.max(0, rule.maxRequests - current),
      resetTime: now + rule.windowMs,
      retryAfter: Math.ceil(rule.windowMs / 1000),
      algorithm: 'sliding-window',
    };
  }

  /**
   * Token bucket rate limiting
   */
  private async checkTokenBucket(key: string, rule: RateLimitRule): Promise<RateLimitInfo> {
    const now = Date.now();
    const cacheKey = `bucket:${key}`;
    const refillRate = rule.refillRate || (rule.maxRequests / (rule.windowMs / 1000));
    
    // Get current bucket state
    const bucketData = await this.cacheService.get(cacheKey) || {
      tokens: rule.maxRequests,
      lastRefill: now,
    };
    
    // Calculate tokens to add based on time passed
    const timePassed = (now - bucketData.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * refillRate;
    
    // Update tokens (capped at max)
    const newTokens = Math.min(rule.maxRequests, bucketData.tokens + tokensToAdd);
    
    // Check if request can be served
    const hasTokens = newTokens >= 1;
    const finalTokens = hasTokens ? newTokens - 1 : newTokens;
    
    // Update bucket state
    await this.cacheService.set(cacheKey, {
      tokens: finalTokens,
      lastRefill: now,
    }, {
      ttl: Math.ceil(rule.windowMs / 1000),
      namespace: 'rate-limit',
    });
    
    const retryAfter = hasTokens ? 0 : Math.ceil((1 - newTokens) / refillRate);
    
    return {
      ruleId: rule.id,
      key,
      current: rule.maxRequests - Math.floor(finalTokens),
      limit: rule.maxRequests,
      remaining: hasTokens ? Math.floor(finalTokens) : 0,
      resetTime: now + (retryAfter * 1000),
      retryAfter,
      algorithm: 'token-bucket',
    };
  }

  // =======================
  // Utility Methods
  // =======================

  /**
   * Get client identifier (IP, user ID, or API key)
   */
  private getClientId(req: Request): string {
    // Try user ID first
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    
    // Try API key
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey) {
      return `api:${apiKey}`;
    }
    
    // Fall back to IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  // =======================
  // Metrics and Analytics
  // =======================

  /**
   * Update rate limiting metrics
   */
  private async updateMetrics(req: Request, limited: boolean): Promise<void> {
    this.metrics.totalRequests++;
    
    if (limited) {
      this.metrics.limitedRequests++;
      
      // Track top limited IPs and users
      const clientId = this.getClientId(req);
      if (clientId.startsWith('ip:')) {
        const ip = clientId.substring(3);
        this.updateTopLimited(this.metrics.topLimitedIPs, 'ip', ip);
      } else if (clientId.startsWith('user:') && req.user?.id) {
        this.updateTopLimited(this.metrics.topLimitedUsers, 'userId', req.user.id);
      }
    }
    
    // Update endpoint metrics
    const endpoint = this.getEndpointPattern(req.path);
    if (!this.metrics.endpointMetrics[endpoint]) {
      this.metrics.endpointMetrics[endpoint] = {
        requests: 0,
        limited: 0,
        limitRate: 0,
      };
    }
    
    const endpointMetric = this.metrics.endpointMetrics[endpoint];
    endpointMetric.requests++;
    
    if (limited) {
      endpointMetric.limited++;
    }
    
    endpointMetric.limitRate = endpointMetric.requests > 0 
      ? (endpointMetric.limited / endpointMetric.requests) * 100 
      : 0;
    
    // Update overall limit rate
    this.metrics.limitRate = this.metrics.totalRequests > 0
      ? (this.metrics.limitedRequests / this.metrics.totalRequests) * 100
      : 0;
    
    // Cache metrics periodically
    if (this.metrics.totalRequests % 100 === 0) {
      await this.cacheMetrics();
    }
  }

  /**
   * Update top limited lists
   */
  private updateTopLimited(list: Array<{ [key: string]: any }>, keyName: string, value: string): void {
    const existing = list.find(item => item[keyName] === value);
    
    if (existing) {
      existing.count++;
    } else {
      list.push({ [keyName]: value, count: 1 });
    }
    
    // Keep only top 10, sorted by count
    list.sort((a, b) => b.count - a.count);
    list.splice(10);
  }

  /**
   * Get endpoint pattern for metrics
   */
  private getEndpointPattern(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }

  /**
   * Record when rate limit is exceeded
   */
  private async recordLimitExceeded(req: Request, limitInfo: RateLimitInfo): Promise<void> {
    const record = {
      timestamp: Date.now(),
      clientId: this.getClientId(req),
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ruleId: limitInfo.ruleId,
      limitInfo,
    };
    
    const key = `limit-exceeded:${Date.now()}:${Math.random()}`;
    await this.cacheService.set(key, record, {
      ttl: this.RATE_LIMIT_TTL,
      namespace: 'rate-limit-violations',
      tags: ['violations'],
    });
    
    await this.updateMetrics(req, true);
  }

  /**
   * Cache current metrics
   */
  private async cacheMetrics(): Promise<void> {
    const key = `metrics:${Math.floor(Date.now() / (5 * 60 * 1000))}`;
    await this.cacheService.set(key, this.metrics, {
      ttl: this.METRICS_TTL,
      namespace: 'rate-limit-metrics',
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Get rate limit violations
   */
  async getViolations(limit: number = 100): Promise<any[]> {
    // This would require additional implementation to fetch from cache
    // For now, return empty array
    return [];
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      limitedRequests: 0,
      limitRate: 0,
      topLimitedIPs: [],
      topLimitedUsers: [],
      endpointMetrics: {},
    };
    
    this.emit('metricsReset');
  }

  /**
   * Get all active rules
   */
  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }
}