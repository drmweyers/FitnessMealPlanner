/**
 * Cache Service
 * 
 * Comprehensive caching service with TTL management, cache invalidation,
 * cache warming, and performance monitoring.
 * 
 * Features:
 * - TTL (Time To Live) management with automatic expiration
 * - Cache invalidation by keys and patterns
 * - Cache warming and preloading
 * - Performance metrics and monitoring
 * - Batch operations for efficiency
 * - Compression for large values
 * - Cache tags for grouped invalidation
 * - Fallback mechanisms when Redis is unavailable
 */

import { RedisClient, getRedisClient } from './redisClient';
import { EventEmitter } from 'events';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisify compression functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Compress large values
  tags?: string[]; // Tags for grouped invalidation
  namespace?: string; // Namespace for key prefixing
  fallback?: () => Promise<any>; // Fallback function when cache miss
  warmup?: boolean; // Whether to warm up this cache entry
}

export interface CacheSetOptions extends CacheOptions {
  nx?: boolean; // Set only if key doesn't exist (NX)
  ex?: number; // Set expiry in seconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgResponseTime: number;
  totalOperations: number;
}

export interface CacheMetrics {
  key: string;
  lastAccessed: number;
  accessCount: number;
  size: number;
  ttl: number;
  tags: string[];
}

export class CacheService extends EventEmitter {
  private redisClient: RedisClient;
  private stats: CacheStats;
  private defaultTTL: number = 3600; // 1 hour default
  private compressionThreshold: number = 1024; // Compress values larger than 1KB
  private keyPrefix: string;
  private tagPrefix: string = 'tag:';
  private metricsPrefix: string = 'metrics:';

  constructor(keyPrefix: string = 'fitnessmeal:', redisClient?: RedisClient) {
    super();
    this.redisClient = redisClient || getRedisClient();
    this.keyPrefix = keyPrefix;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalOperations: 0,
    };
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    const ns = namespace ? `${namespace}:` : '';
    return `${this.keyPrefix}${ns}${key}`;
  }

  /**
   * Build tag key
   */
  private buildTagKey(tag: string): string {
    return `${this.keyPrefix}${this.tagPrefix}${tag}`;
  }

  /**
   * Build metrics key
   */
  private buildMetricsKey(key: string): string {
    return `${this.keyPrefix}${this.metricsPrefix}${key}`;
  }

  /**
   * Serialize and optionally compress data
   */
  private async serialize(data: any, compress: boolean = false): Promise<string | Buffer> {
    try {
      const jsonString = JSON.stringify(data);
      
      if (compress && jsonString.length > this.compressionThreshold) {
        const compressed = await gzip(jsonString);
        return compressed;
      }
      
      return jsonString;
    } catch (error) {
      console.error('[CacheService] Serialization error:', error);
      throw new Error('Failed to serialize data');
    }
  }

  /**
   * Deserialize and optionally decompress data
   */
  private async deserialize(data: string | Buffer): Promise<any> {
    try {
      if (Buffer.isBuffer(data)) {
        // Data is compressed
        const decompressed = await gunzip(data);
        return JSON.parse(decompressed.toString());
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('[CacheService] Deserialization error:', error);
      throw new Error('Failed to deserialize data');
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete' | 'error', responseTime?: number): void {
    this.stats.totalOperations++;
    
    switch (operation) {
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'set':
        this.stats.sets++;
        break;
      case 'delete':
        this.stats.deletes++;
        break;
      case 'error':
        this.stats.errors++;
        break;
    }
    
    // Calculate hit rate
    const totalCacheOps = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalCacheOps > 0 ? (this.stats.hits / totalCacheOps) * 100 : 0;
    
    // Update average response time
    if (responseTime !== undefined) {
      this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;
    }
  }

  /**
   * Update cache metrics for a key
   */
  private async updateMetrics(key: string, options: CacheOptions = {}): Promise<void> {
    if (!this.redisClient.isConnected()) return;

    try {
      const metricsKey = this.buildMetricsKey(key);
      const client = this.redisClient.getClient();
      
      const metrics: CacheMetrics = {
        key,
        lastAccessed: Date.now(),
        accessCount: 1,
        size: 0,
        ttl: options.ttl || this.defaultTTL,
        tags: options.tags || [],
      };
      
      // Get existing metrics to increment access count
      const existing = await client.get(metricsKey);
      if (existing) {
        const existingMetrics = JSON.parse(existing);
        metrics.accessCount = (existingMetrics.accessCount || 0) + 1;
      }
      
      await client.setex(metricsKey, 86400, JSON.stringify(metrics)); // Keep metrics for 24 hours
    } catch (error) {
      // Metrics update failures shouldn't affect cache operations
      console.warn('[CacheService] Metrics update failed:', error);
    }
  }

  /**
   * Get cached value by key
   */
  public async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = this.buildKey(key, options.namespace);
    
    try {
      if (!this.redisClient.isConnected()) {
        console.warn('[CacheService] Redis not connected, using fallback if available');
        if (options.fallback) {
          return await options.fallback();
        }
        return null;
      }

      const client = this.redisClient.getClient();
      const data = await client.getBuffer(cacheKey);
      
      if (data === null) {
        this.updateStats('miss', Date.now() - startTime);
        this.emit('cacheMiss', { key, namespace: options.namespace });
        
        // Try fallback if available
        if (options.fallback) {
          const fallbackData = await options.fallback();
          // Cache the fallback data for future requests
          if (fallbackData !== null && fallbackData !== undefined) {
            await this.set(key, fallbackData, options);
          }
          return fallbackData;
        }
        
        return null;
      }

      const value = await this.deserialize(data);
      
      this.updateStats('hit', Date.now() - startTime);
      this.updateMetrics(key, options);
      this.emit('cacheHit', { key, namespace: options.namespace });
      
      return value;
      
    } catch (error) {
      console.error(`[CacheService] Get error for key ${cacheKey}:`, error);
      this.updateStats('error', Date.now() - startTime);
      this.emit('cacheError', { operation: 'get', key, error });
      
      // Try fallback on error
      if (options.fallback) {
        try {
          return await options.fallback();
        } catch (fallbackError) {
          console.error('[CacheService] Fallback also failed:', fallbackError);
        }
      }
      
      return null;
    }
  }

  /**
   * Set cached value by key
   */
  public async set(key: string, value: any, options: CacheSetOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    const cacheKey = this.buildKey(key, options.namespace);
    
    try {
      if (!this.redisClient.isConnected()) {
        console.warn('[CacheService] Redis not connected, cannot set cache');
        return false;
      }

      const client = this.redisClient.getClient();
      const serializedData = await this.serialize(value, options.compress);
      const ttl = options.ttl || options.ex || this.defaultTTL;
      
      // Set the main cache entry
      let result: string | null;
      if (options.nx) {
        result = await client.set(cacheKey, serializedData, 'EX', ttl, 'NX');
      } else {
        result = await client.setex(cacheKey, ttl, serializedData);
      }
      
      if (result === null && options.nx) {
        // Key already exists and NX was specified
        return false;
      }
      
      // Handle cache tags
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags, options.namespace);
      }
      
      this.updateStats('set', Date.now() - startTime);
      this.updateMetrics(key, options);
      this.emit('cacheSet', { key, namespace: options.namespace, ttl });
      
      return true;
      
    } catch (error) {
      console.error(`[CacheService] Set error for key ${cacheKey}:`, error);
      this.updateStats('error', Date.now() - startTime);
      this.emit('cacheError', { operation: 'set', key, error });
      return false;
    }
  }

  /**
   * Delete cached value by key
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    const startTime = Date.now();
    const cacheKey = this.buildKey(key, namespace);
    
    try {
      if (!this.redisClient.isConnected()) {
        return false;
      }

      const client = this.redisClient.getClient();
      const result = await client.del(cacheKey);
      
      // Also delete metrics
      const metricsKey = this.buildMetricsKey(key);
      await client.del(metricsKey);
      
      this.updateStats('delete', Date.now() - startTime);
      this.emit('cacheDelete', { key, namespace });
      
      return result > 0;
      
    } catch (error) {
      console.error(`[CacheService] Delete error for key ${cacheKey}:`, error);
      this.updateStats('error', Date.now() - startTime);
      this.emit('cacheError', { operation: 'delete', key, error });
      return false;
    }
  }

  /**
   * Add key to cache tags for grouped invalidation
   */
  private async addToTags(key: string, tags: string[], namespace?: string): Promise<void> {
    if (!this.redisClient.isConnected() || !tags.length) return;

    try {
      const client = this.redisClient.getClient();
      const cacheKey = this.buildKey(key, namespace);
      
      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag);
        await client.sadd(tagKey, cacheKey);
        await client.expire(tagKey, 86400); // Tag expires in 24 hours
      }
    } catch (error) {
      console.warn('[CacheService] Failed to add tags:', error);
    }
  }

  /**
   * Invalidate cache by tag
   */
  public async invalidateByTag(tag: string): Promise<number> {
    try {
      if (!this.redisClient.isConnected()) {
        return 0;
      }

      const client = this.redisClient.getClient();
      const tagKey = this.buildTagKey(tag);
      
      // Get all keys with this tag
      const keys = await client.smembers(tagKey);
      
      if (keys.length === 0) {
        return 0;
      }
      
      // Delete all keys and the tag itself
      const pipeline = client.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(tagKey);
      
      await pipeline.exec();
      
      this.emit('tagInvalidated', { tag, count: keys.length });
      
      return keys.length;
      
    } catch (error) {
      console.error(`[CacheService] Tag invalidation error for tag ${tag}:`, error);
      this.emit('cacheError', { operation: 'invalidateByTag', tag, error });
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateByPattern(pattern: string, namespace?: string): Promise<number> {
    try {
      if (!this.redisClient.isConnected()) {
        return 0;
      }

      const client = this.redisClient.getClient();
      const searchPattern = this.buildKey(pattern, namespace);
      
      const keys = await client.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await client.del(...keys);
      
      this.emit('patternInvalidated', { pattern, namespace, count: result });
      
      return result;
      
    } catch (error) {
      console.error(`[CacheService] Pattern invalidation error for pattern ${pattern}:`, error);
      this.emit('cacheError', { operation: 'invalidateByPattern', pattern, error });
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  public async mget<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    try {
      if (!this.redisClient.isConnected() || keys.length === 0) {
        return keys.map(() => null);
      }

      const client = this.redisClient.getClient();
      const cacheKeys = keys.map(key => this.buildKey(key, namespace));
      
      const results = await client.mget(...cacheKeys);
      
      const deserializedResults = await Promise.all(
        results.map(async (data, index) => {
          if (data === null) {
            this.updateStats('miss');
            return null;
          }
          
          try {
            this.updateStats('hit');
            return await this.deserialize(data);
          } catch (error) {
            console.error(`[CacheService] Deserialization error for key ${keys[index]}:`, error);
            return null;
          }
        })
      );
      
      return deserializedResults;
      
    } catch (error) {
      console.error('[CacheService] MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  public async mset(keyValuePairs: Array<[string, any]>, options: CacheOptions = {}): Promise<boolean> {
    try {
      if (!this.redisClient.isConnected() || keyValuePairs.length === 0) {
        return false;
      }

      const client = this.redisClient.getClient();
      const pipeline = client.pipeline();
      const ttl = options.ttl || this.defaultTTL;
      
      for (const [key, value] of keyValuePairs) {
        const cacheKey = this.buildKey(key, options.namespace);
        const serializedData = await this.serialize(value, options.compress);
        
        pipeline.setex(cacheKey, ttl, serializedData);
        
        // Handle tags
        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            const tagKey = this.buildTagKey(tag);
            pipeline.sadd(tagKey, cacheKey);
            pipeline.expire(tagKey, 86400);
          }
        }
      }
      
      await pipeline.exec();
      
      this.stats.sets += keyValuePairs.length;
      this.emit('cacheMSet', { count: keyValuePairs.length, namespace: options.namespace });
      
      return true;
      
    } catch (error) {
      console.error('[CacheService] MSET error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      if (!this.redisClient.isConnected()) {
        return false;
      }

      const client = this.redisClient.getClient();
      const cacheKey = this.buildKey(key, namespace);
      
      const result = await client.exists(cacheKey);
      return result === 1;
      
    } catch (error) {
      console.error(`[CacheService] Exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL (time to live) for a key
   */
  public async ttl(key: string, namespace?: string): Promise<number> {
    try {
      if (!this.redisClient.isConnected()) {
        return -1;
      }

      const client = this.redisClient.getClient();
      const cacheKey = this.buildKey(key, namespace);
      
      return await client.ttl(cacheKey);
      
    } catch (error) {
      console.error(`[CacheService] TTL check error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Extend TTL for a key
   */
  public async extend(key: string, ttl: number, namespace?: string): Promise<boolean> {
    try {
      if (!this.redisClient.isConnected()) {
        return false;
      }

      const client = this.redisClient.getClient();
      const cacheKey = this.buildKey(key, namespace);
      
      const result = await client.expire(cacheKey, ttl);
      return result === 1;
      
    } catch (error) {
      console.error(`[CacheService] TTL extend error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Flush all cache entries with the current prefix
   */
  public async flush(): Promise<boolean> {
    try {
      if (!this.redisClient.isConnected()) {
        return false;
      }

      const client = this.redisClient.getClient();
      const keys = await client.keys(`${this.keyPrefix}*`);
      
      if (keys.length === 0) {
        return true;
      }
      
      await client.del(...keys);
      
      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0,
        avgResponseTime: 0,
        totalOperations: 0,
      };
      
      this.emit('cacheFlushed', { count: keys.length });
      
      return true;
      
    } catch (error) {
      console.error('[CacheService] Flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache metrics for a specific key
   */
  public async getMetrics(key: string): Promise<CacheMetrics | null> {
    try {
      if (!this.redisClient.isConnected()) {
        return null;
      }

      const client = this.redisClient.getClient();
      const metricsKey = this.buildMetricsKey(key);
      
      const data = await client.get(metricsKey);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data);
      
    } catch (error) {
      console.error(`[CacheService] Metrics retrieval error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Warm up cache with provided data
   */
  public async warmup(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<number> {
    let successful = 0;
    
    for (const entry of entries) {
      const success = await this.set(entry.key, entry.value, { ...entry.options, warmup: true });
      if (success) {
        successful++;
      }
    }
    
    this.emit('cacheWarmedUp', { total: entries.length, successful });
    
    return successful;
  }

  /**
   * Get cache size information
   */
  public async getCacheSize(): Promise<{ keys: number; memory: string }> {
    try {
      if (!this.redisClient.isConnected()) {
        return { keys: 0, memory: '0B' };
      }

      const client = this.redisClient.getClient();
      
      // Count keys with our prefix
      const keys = await client.keys(`${this.keyPrefix}*`);
      
      // Get memory info
      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : '0B';
      
      return {
        keys: keys.length,
        memory,
      };
      
    } catch (error) {
      console.error('[CacheService] Cache size check error:', error);
      return { keys: 0, memory: '0B' };
    }
  }
}