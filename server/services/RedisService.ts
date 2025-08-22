import { createClient, RedisClientType } from 'redis';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  defaultTTL?: number;
}

export interface CacheMetrics {
  hitCount: number;
  missCount: number;
  setCount: number;
  deleteCount: number;
  errorCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
}

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private fallbackCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number;
  private metrics: CacheMetrics = {
    hitCount: 0,
    missCount: 0,
    setCount: 0,
    deleteCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    averageResponseTime: 0
  };

  constructor(config: RedisConfig = {}) {
    const {
      url = process.env.REDIS_URL,
      host = process.env.REDIS_HOST || 'localhost',
      port = parseInt(process.env.REDIS_PORT || '6379'),
      password = process.env.REDIS_PASSWORD,
      database = parseInt(process.env.REDIS_DB || '0'),
      defaultTTL = 3600 // 1 hour default
    } = config;

    this.defaultTTL = defaultTTL;

    // Create Redis client
    if (url) {
      this.client = createClient({ url });
    } else {
      this.client = createClient({
        socket: { host, port },
        password,
        database
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
      this.metrics.errorCount++;
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('Redis client connection ended');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => T
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const result = await operation();
      this.updateMetrics(startTime);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      console.warn('Redis operation failed, using fallback:', error);
      
      if (fallbackOperation) {
        return fallbackOperation();
      }
      throw error;
    }
  }

  private updateMetrics(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.metrics.totalResponseTime += responseTime;
    const totalOperations = this.metrics.hitCount + this.metrics.missCount + this.metrics.setCount + this.metrics.deleteCount;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / totalOperations;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.executeWithFallback(
      async () => {
        const value = await this.client.get(key);
        if (value === null) {
          this.metrics.missCount++;
          return null;
        }
        
        this.metrics.hitCount++;
        try {
          return JSON.parse(value) as T;
        } catch (error) {
          console.warn(`Failed to parse cached value for key ${key}:`, error);
          return null;
        }
      },
      () => {
        const entry = this.fallbackCache.get(key);
        if (!entry) {
          this.metrics.missCount++;
          return null;
        }
        
        // Check TTL in fallback cache
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
          this.fallbackCache.delete(key);
          this.metrics.missCount++;
          return null;
        }
        
        this.metrics.hitCount++;
        return entry.value;
      }
    );
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTTL;
    
    return this.executeWithFallback(
      async () => {
        await this.client.setEx(key, ttl, JSON.stringify(value));
        this.metrics.setCount++;
      },
      () => {
        this.fallbackCache.set(key, {
          value,
          timestamp: Date.now(),
          ttl
        });
        this.metrics.setCount++;
      }
    );
  }

  async del(key: string): Promise<number> {
    return this.executeWithFallback(
      async () => {
        const result = await this.client.del(key);
        this.metrics.deleteCount++;
        return result;
      },
      () => {
        const existed = this.fallbackCache.has(key);
        this.fallbackCache.delete(key);
        this.metrics.deleteCount++;
        return existed ? 1 : 0;
      }
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.executeWithFallback(
      async () => {
        return (await this.client.exists(key)) === 1;
      },
      () => {
        const entry = this.fallbackCache.get(key);
        if (!entry) return false;
        
        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
          this.fallbackCache.delete(key);
          return false;
        }
        
        return true;
      }
    );
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return this.executeWithFallback(
      async () => {
        const values = await this.client.mGet(keys);
        return values.map((value, index) => {
          if (value === null) {
            this.metrics.missCount++;
            return null;
          }
          
          this.metrics.hitCount++;
          try {
            return JSON.parse(value) as T;
          } catch (error) {
            console.warn(`Failed to parse cached value for key ${keys[index]}:`, error);
            return null;
          }
        });
      },
      () => {
        return keys.map(key => {
          const entry = this.fallbackCache.get(key);
          if (!entry) {
            this.metrics.missCount++;
            return null;
          }
          
          // Check TTL
          if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
            this.fallbackCache.delete(key);
            this.metrics.missCount++;
            return null;
          }
          
          this.metrics.hitCount++;
          return entry.value;
        });
      }
    );
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    return this.executeWithFallback(
      async () => {
        // Redis doesn't support TTL in MSET, so we need to use pipeline
        const pipeline = this.client.multi();
        
        keyValuePairs.forEach(({ key, value, ttl }) => {
          const finalTtl = ttl || this.defaultTTL;
          pipeline.setEx(key, finalTtl, JSON.stringify(value));
        });
        
        await pipeline.exec();
        this.metrics.setCount += keyValuePairs.length;
      },
      () => {
        keyValuePairs.forEach(({ key, value, ttl }) => {
          this.fallbackCache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
          });
        });
        this.metrics.setCount += keyValuePairs.length;
      }
    );
  }

  async invalidatePattern(pattern: string): Promise<number> {
    return this.executeWithFallback(
      async () => {
        const keys = await this.client.keys(pattern);
        if (keys.length === 0) return 0;
        
        const result = await this.client.del(keys);
        this.metrics.deleteCount += result;
        return result;
      },
      () => {
        let deletedCount = 0;
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        
        for (const [key] of this.fallbackCache) {
          if (regex.test(key)) {
            this.fallbackCache.delete(key);
            deletedCount++;
          }
        }
        
        this.metrics.deleteCount += deletedCount;
        return deletedCount;
      }
    );
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async getOrSetBatch<T>(
    keys: string[],
    batchFetcher: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttlSeconds?: number
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const cached = await this.mget<T>(keys);
    const missingKeys: string[] = [];

    // Process cached results
    keys.forEach((key, index) => {
      const cachedValue = cached[index];
      if (cachedValue !== null) {
        result.set(key, cachedValue);
      } else {
        missingKeys.push(key);
      }
    });

    // Fetch missing values
    if (missingKeys.length > 0) {
      const freshValues = await batchFetcher(missingKeys);
      const keyValuePairs = Array.from(freshValues.entries()).map(([key, value]) => ({
        key,
        value,
        ttl: ttlSeconds
      }));

      // Cache new values
      await this.mset(keyValuePairs);
      
      // Add to result
      freshValues.forEach((value, key) => {
        result.set(key, value);
      });
    }

    return result;
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string; metrics: CacheMetrics }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Test basic operation
      const testKey = `health:${Date.now()}`;
      await this.set(testKey, 'test');
      const value = await this.get(testKey);
      await this.del(testKey);
      
      if (value === 'test') {
        return {
          status: 'healthy',
          message: 'Redis is responding normally',
          metrics: { ...this.metrics }
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Redis read/write test failed',
          metrics: { ...this.metrics }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metrics: { ...this.metrics }
      };
    }
  }

  // Get cache performance metrics
  getMetrics(): CacheMetrics {
    const total = this.metrics.hitCount + this.metrics.missCount;
    return {
      ...this.metrics,
      hitRatio: total > 0 ? this.metrics.hitCount / total : 0
    };
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = {
      hitCount: 0,
      missCount: 0,
      setCount: 0,
      deleteCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0
    };
  }

  // Clear all cached data
  async flushAll(): Promise<void> {
    await this.executeWithFallback(
      async () => {
        await this.client.flushAll();
      },
      () => {
        this.fallbackCache.clear();
      }
    );
  }
}

// Singleton instance
let redisService: RedisService | null = null;

export function getRedisService(config?: RedisConfig): RedisService {
  if (!redisService) {
    redisService = new RedisService(config);
  }
  return redisService;
}

export default RedisService;