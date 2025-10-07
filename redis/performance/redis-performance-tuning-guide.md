# Redis Performance Tuning Guide for FitnessMealPlanner

## 🚀 Performance Overview

This comprehensive guide provides performance optimization strategies for Redis deployment in the FitnessMealPlanner production environment on DigitalOcean.

## 📊 Performance Baseline

### Expected Performance Metrics (Production Targets)
- **Latency**: < 1ms for 95% of operations
- **Throughput**: > 10,000 ops/sec
- **Memory Efficiency**: < 80% usage under normal load
- **Cache Hit Ratio**: > 80% for application cache
- **Connection Pool**: < 50 active connections
- **Key Eviction Rate**: < 100 keys/sec

## 🔧 Memory Optimization

### 1. Memory Configuration

```conf
# redis.conf - Memory optimization
maxmemory 256mb                    # Set appropriate memory limit
maxmemory-policy allkeys-lru       # LRU eviction for cache workload
maxmemory-samples 5                # Balance between accuracy and performance

# Lazy freeing for better performance
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes
```

### 2. Data Structure Optimization

```conf
# Optimize data structures for memory efficiency
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
```

### 3. Memory Usage Monitoring Script

```bash
#!/bin/bash
# redis-memory-monitor.sh

REDIS_HOST="redis-primary"
REDIS_PORT="6379"
REDIS_PASSWORD="$REDIS_PASSWORD"

echo "Redis Memory Analysis - $(date)"
echo "================================="

# Basic memory info
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO memory | grep -E "(used_memory|maxmemory|mem_fragmentation)"

# Memory usage by database
for db in {0..15}; do
    keys=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD -n $db DBSIZE)
    if [[ $keys -gt 0 ]]; then
        echo "Database $db: $keys keys"
    fi
done

# Top memory consuming keys (sample)
echo ""
echo "Top Memory Consuming Keys (sample):"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --bigkeys --i 0.01
```

## ⚡ Performance Optimization

### 1. CPU and Threading Configuration

```conf
# redis.conf - CPU optimization
# Single-threaded by design, but optimize I/O threads
io-threads 2                       # Enable I/O threading (Redis 6+)
io-threads-do-reads yes           # Enable threaded reads

# Background saving optimization
stop-writes-on-bgsave-error no    # Don't stop writes during background save
rdbcompression yes                # Compress RDB files
rdbchecksum yes                   # Verify RDB integrity

# AOF optimization
appendfsync everysec              # Balance between performance and durability
no-appendfsync-on-rewrite no      # Don't block during AOF rewrite
auto-aof-rewrite-percentage 100   # Automatic AOF rewrite threshold
auto-aof-rewrite-min-size 64mb    # Minimum size before rewrite
```

### 2. Network Optimization

```conf
# Network performance tuning
tcp-keepalive 300                 # TCP keepalive
timeout 0                         # No client timeout (managed by app)
tcp-backlog 511                   # Connection backlog

# Client output buffer limits
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60

# Query buffer limits
client-query-buffer-limit 1gb
proto-max-bulk-len 512mb
```

### 3. Application-Level Optimizations

```javascript
// FitnessMealPlanner Redis Client Configuration
const redis = require('redis');

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  
  // Connection pool optimization
  connectTimeout: 10000,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  
  // Performance settings
  keepAlive: true,
  family: 4, // Use IPv4
  
  // Application-specific settings
  db: {
    cache: 0,        // Application cache
    sessions: 1,     // User sessions
    mealplans: 2     // Meal plan cache
  }
};

// Connection with clustering for high availability
const client = redis.createClient(redisConfig);

// Implement connection pooling
class RedisPool {
  constructor(config, poolSize = 10) {
    this.pool = [];
    this.config = config;
    
    // Create connection pool
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(redis.createClient(config));
    }
  }
  
  getConnection() {
    return this.pool[Math.floor(Math.random() * this.pool.length)];
  }
}

// Optimized caching patterns for FitnessMealPlanner
class FitnessCacheManager {
  constructor(redisPool) {
    this.redis = redisPool;
    this.defaultTTL = 3600; // 1 hour
  }
  
  // Meal plan caching with smart TTL
  async cacheMealPlan(userId, mealPlan) {
    const key = `mealplan:${userId}`;
    const ttl = this.calculateTTL(mealPlan.createdAt);
    
    return await this.redis.setex(key, ttl, JSON.stringify(mealPlan));
  }
  
  // Recipe caching with popularity-based TTL
  async cacheRecipe(recipeId, recipe) {
    const key = `recipe:${recipeId}`;
    const popularity = recipe.viewCount || 0;
    const ttl = Math.max(1800, Math.min(86400, popularity * 10)); // 30min to 24h
    
    return await this.redis.setex(key, ttl, JSON.stringify(recipe));
  }
  
  // Batch operations for efficiency
  async batchGet(keys) {
    return await this.redis.mget(keys);
  }
  
  async batchSet(keyValuePairs) {
    const pipeline = this.redis.pipeline();
    keyValuePairs.forEach(([key, value, ttl]) => {
      pipeline.setex(key, ttl || this.defaultTTL, value);
    });
    return await pipeline.exec();
  }
  
  calculateTTL(createdAt) {
    const age = Date.now() - new Date(createdAt).getTime();
    const hours = age / (1000 * 60 * 60);
    
    // Fresher content gets longer TTL
    if (hours < 1) return 7200;    // 2 hours
    if (hours < 24) return 3600;   // 1 hour
    if (hours < 168) return 1800;  // 30 minutes
    return 900; // 15 minutes
  }
}
```

## 📈 Monitoring and Profiling

### 1. Performance Monitoring Dashboard

```python
#!/usr/bin/env python3
# redis-performance-monitor.py

import redis
import time
import json
import psutil
from datetime import datetime

class RedisPerformanceMonitor:
    def __init__(self, redis_config):
        self.redis = redis.Redis(**redis_config)
        self.metrics_history = []
    
    def collect_metrics(self):
        """Collect comprehensive Redis performance metrics"""
        info = self.redis.info()
        
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'memory': {
                'used_memory': info.get('used_memory', 0),
                'used_memory_human': info.get('used_memory_human', '0B'),
                'used_memory_peak': info.get('used_memory_peak', 0),
                'mem_fragmentation_ratio': info.get('mem_fragmentation_ratio', 0),
                'maxmemory': info.get('maxmemory', 0),
            },
            'performance': {
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                'instantaneous_input_kbps': info.get('instantaneous_input_kbps', 0),
                'instantaneous_output_kbps': info.get('instantaneous_output_kbps', 0),
                'connected_clients': info.get('connected_clients', 0),
                'blocked_clients': info.get('blocked_clients', 0),
            },
            'cache': {
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'evicted_keys': info.get('evicted_keys', 0),
                'expired_keys': info.get('expired_keys', 0),
            },
            'persistence': {
                'rdb_changes_since_last_save': info.get('rdb_changes_since_last_save', 0),
                'rdb_bgsave_in_progress': info.get('rdb_bgsave_in_progress', 0),
                'aof_rewrite_in_progress': info.get('aof_rewrite_in_progress', 0),
            }
        }
        
        # Calculate cache hit ratio
        hits = metrics['cache']['keyspace_hits']
        misses = metrics['cache']['keyspace_misses']
        total_requests = hits + misses
        if total_requests > 0:
            metrics['cache']['hit_ratio'] = hits / total_requests
        else:
            metrics['cache']['hit_ratio'] = 0
        
        self.metrics_history.append(metrics)
        return metrics
    
    def analyze_performance(self):
        """Analyze performance trends and identify bottlenecks"""
        if len(self.metrics_history) < 2:
            return "Insufficient data for analysis"
        
        latest = self.metrics_history[-1]
        previous = self.metrics_history[-2]
        
        analysis = {
            'memory_trend': self.analyze_memory_trend(latest, previous),
            'performance_trend': self.analyze_performance_trend(latest, previous),
            'cache_performance': self.analyze_cache_performance(latest),
            'recommendations': []
        }
        
        # Generate recommendations
        if latest['cache']['hit_ratio'] < 0.8:
            analysis['recommendations'].append("Cache hit ratio is low (<80%). Consider optimizing cache keys and TTL values.")
        
        if latest['performance']['connected_clients'] > 50:
            analysis['recommendations'].append("High number of connected clients. Consider implementing connection pooling.")
        
        if latest['memory']['mem_fragmentation_ratio'] > 1.5:
            analysis['recommendations'].append("High memory fragmentation. Consider Redis restart or memory optimization.")
        
        return analysis
    
    def analyze_memory_trend(self, latest, previous):
        current_memory = latest['memory']['used_memory']
        prev_memory = previous['memory']['used_memory']
        change = ((current_memory - prev_memory) / prev_memory) * 100 if prev_memory > 0 else 0
        
        return {
            'current_usage': latest['memory']['used_memory_human'],
            'change_percent': round(change, 2),
            'fragmentation_ratio': latest['memory']['mem_fragmentation_ratio']
        }
    
    def analyze_performance_trend(self, latest, previous):
        current_ops = latest['performance']['instantaneous_ops_per_sec']
        prev_ops = previous['performance']['instantaneous_ops_per_sec']
        change = ((current_ops - prev_ops) / prev_ops) * 100 if prev_ops > 0 else 0
        
        return {
            'current_ops_per_sec': current_ops,
            'change_percent': round(change, 2),
            'connected_clients': latest['performance']['connected_clients']
        }
    
    def analyze_cache_performance(self, latest):
        return {
            'hit_ratio': round(latest['cache']['hit_ratio'], 3),
            'total_hits': latest['cache']['keyspace_hits'],
            'total_misses': latest['cache']['keyspace_misses'],
            'evicted_keys': latest['cache']['evicted_keys']
        }

# Usage example
if __name__ == "__main__":
    config = {
        'host': 'redis-primary',
        'port': 6379,
        'password': os.getenv('REDIS_PASSWORD'),
        'decode_responses': True
    }
    
    monitor = RedisPerformanceMonitor(config)
    
    # Continuous monitoring
    while True:
        metrics = monitor.collect_metrics()
        analysis = monitor.analyze_performance()
        
        print(f"Redis Performance Report - {metrics['timestamp']}")
        print(f"Memory: {metrics['memory']['used_memory_human']}")
        print(f"Operations/sec: {metrics['performance']['instantaneous_ops_per_sec']}")
        print(f"Cache Hit Ratio: {metrics['cache']['hit_ratio']:.2%}")
        print("---")
        
        time.sleep(60)  # Monitor every minute
```

### 2. Slow Query Analysis

```bash
#!/bin/bash
# redis-slowlog-analyzer.sh

REDIS_HOST="redis-primary"
REDIS_PORT="6379"
REDIS_PASSWORD="$REDIS_PASSWORD"

echo "Redis Slow Query Analysis - $(date)"
echo "==================================="

# Get slow log entries
SLOWLOG_ENTRIES=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD SLOWLOG GET 10)

if [[ -n "$SLOWLOG_ENTRIES" ]]; then
    echo "Top 10 Slow Queries:"
    echo "$SLOWLOG_ENTRIES"
    echo ""
    
    # Analyze slow query patterns
    echo "Analysis:"
    echo "--------"
    echo "Total slow queries: $(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD SLOWLOG LEN)"
    
    # Check for common performance issues
    if echo "$SLOWLOG_ENTRIES" | grep -q "KEYS"; then
        echo "⚠️  WARNING: KEYS command found in slow log - use SCAN instead"
    fi
    
    if echo "$SLOWLOG_ENTRIES" | grep -q "SORT"; then
        echo "⚠️  WARNING: SORT command found in slow log - consider server-side optimization"
    fi
    
    if echo "$SLOWLOG_ENTRIES" | grep -q "SMEMBERS"; then
        echo "⚠️  WARNING: SMEMBERS on large sets - consider SSCAN for large sets"
    fi
else
    echo "✅ No slow queries detected"
fi

# Reset slow log
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD SLOWLOG RESET
echo "Slow log reset for next monitoring cycle"
```

## 🎯 Application-Specific Optimizations

### 1. FitnessMealPlanner Cache Strategy

```javascript
// Optimized caching patterns for FitnessMealPlanner features

class FitnessPerfOptimizer {
  constructor(redisClient) {
    this.redis = redisClient;
  }
  
  // Recipe search optimization with bloom filter
  async optimizeRecipeSearch(searchParams) {
    const searchKey = `search:${this.hashParams(searchParams)}`;
    
    // Check if search result exists in cache
    const cached = await this.redis.get(searchKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Perform search and cache result
    const results = await this.performRecipeSearch(searchParams);
    await this.redis.setex(searchKey, 1800, JSON.stringify(results)); // 30min TTL
    
    return results;
  }
  
  // Meal plan generation with smart caching
  async optimizeMealPlanGeneration(userId, preferences) {
    const cacheKey = `mealplan:${userId}:${this.hashParams(preferences)}`;
    
    // Check for existing meal plan
    const existingPlan = await this.redis.get(cacheKey);
    if (existingPlan) {
      // Update last accessed time
      await this.redis.expire(cacheKey, 7200); // Extend to 2 hours
      return JSON.parse(existingPlan);
    }
    
    // Generate new meal plan
    const mealPlan = await this.generateMealPlan(userId, preferences);
    
    // Cache with longer TTL for complex operations
    await this.redis.setex(cacheKey, 7200, JSON.stringify(mealPlan));
    
    return mealPlan;
  }
  
  // User session optimization
  async optimizeUserSessions(userId, sessionData) {
    const sessionKey = `session:${userId}`;
    
    // Use Redis hash for efficient partial updates
    await this.redis.hmset(sessionKey, {
      lastActivity: Date.now(),
      preferences: JSON.stringify(sessionData.preferences),
      mealPlanId: sessionData.currentMealPlanId || '',
    });
    
    // Set session expiry
    await this.redis.expire(sessionKey, 86400); // 24 hours
  }
  
  // Progress tracking with time-series optimization
  async optimizeProgressTracking(userId, measurement) {
    const progressKey = `progress:${userId}`;
    const timeSeriesKey = `progress:${userId}:timeseries`;
    
    // Store latest measurement
    await this.redis.hmset(progressKey, {
      weight: measurement.weight,
      lastUpdated: measurement.timestamp,
      trend: this.calculateTrend(measurement)
    });
    
    // Store time series data (limited to last 100 entries)
    await this.redis.lpush(timeSeriesKey, JSON.stringify(measurement));
    await this.redis.ltrim(timeSeriesKey, 0, 99);
    
    // Set appropriate TTL
    await this.redis.expire(progressKey, 2592000); // 30 days
    await this.redis.expire(timeSeriesKey, 2592000);
  }
  
  // Bulk operations for efficiency
  async bulkCacheRecipes(recipes) {
    const pipeline = this.redis.pipeline();
    
    recipes.forEach(recipe => {
      const key = `recipe:${recipe.id}`;
      const ttl = this.calculateRecipeTTL(recipe);
      pipeline.setex(key, ttl, JSON.stringify(recipe));
    });
    
    return await pipeline.exec();
  }
  
  hashParams(params) {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
  }
  
  calculateRecipeTTL(recipe) {
    // Popular recipes get longer TTL
    const baseTime = 3600; // 1 hour
    const popularity = recipe.viewCount || 0;
    const multiplier = Math.min(24, Math.max(1, popularity / 100));
    return Math.floor(baseTime * multiplier);
  }
}
```

### 2. Performance Testing Script

```bash
#!/bin/bash
# redis-performance-test.sh

REDIS_HOST="redis-primary"
REDIS_PORT="6379"
REDIS_PASSWORD="$REDIS_PASSWORD"

echo "Redis Performance Benchmark - $(date)"
echo "====================================="

# Install redis-benchmark if not available
if ! command -v redis-benchmark &> /dev/null; then
    echo "Installing redis-tools..."
    sudo apt-get update && sudo apt-get install -y redis-tools
fi

# Performance tests mimicking FitnessMealPlanner workload
echo "1. Basic Performance Test"
redis-benchmark -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD -q -t ping,set,get,incr,lpush,rpop,sadd,spop,lrange,mset -c 50 -n 10000

echo ""
echo "2. Session Storage Simulation"
redis-benchmark -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD -t set,get,del -n 5000 -d 1024 -c 20 -r 1000

echo ""
echo "3. Cache Performance Test"
redis-benchmark -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD -t get,set,mget,mset -n 10000 -c 50 -r 10000 -d 512

echo ""
echo "4. Recipe Search Simulation"
for i in {1..100}; do
    redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD set "recipe:$i" "{\"id\":$i,\"name\":\"Recipe $i\",\"ingredients\":[\"ingredient1\",\"ingredient2\"],\"calories\":$((RANDOM%1000+200))}" > /dev/null
done

echo "Recipe cache populated with 100 entries"

# Test bulk operations
echo ""
echo "5. Bulk Operations Test"
time redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --scan --pattern "recipe:*" | head -50 | xargs redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD mget

# Memory analysis
echo ""
echo "6. Memory Usage Analysis"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info memory | grep -E "(used_memory|mem_fragmentation)"

# Latency testing
echo ""
echo "7. Latency Testing"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --latency -i 1 &
LATENCY_PID=$!
sleep 10
kill $LATENCY_PID

echo ""
echo "Performance test completed at $(date)"
```

## 📋 Performance Optimization Checklist

### Pre-Production Checklist
- [ ] Memory limits configured appropriately
- [ ] Data structure encodings optimized
- [ ] Persistence settings balanced for performance/durability
- [ ] Network buffer sizes tuned
- [ ] Client connection limits set
- [ ] Slow query monitoring enabled
- [ ] Performance baseline established
- [ ] Load testing completed
- [ ] Monitoring and alerting configured

### Regular Performance Maintenance
- [ ] Weekly slowlog analysis
- [ ] Memory fragmentation monitoring
- [ ] Cache hit ratio analysis
- [ ] Connection pool optimization
- [ ] Key expiration pattern review
- [ ] Data structure efficiency audit
- [ ] Performance trend analysis
- [ ] Load testing with production patterns

## 🎯 FitnessMealPlanner Specific Optimizations

### Cache Key Patterns
```
# Hierarchical key naming for efficient operations
user:{userId}:session                   # User session data
user:{userId}:preferences               # User dietary preferences
user:{userId}:mealplan:{date}          # Daily meal plans
recipe:{recipeId}                      # Recipe details
search:{searchHash}                    # Search result cache
progress:{userId}:{type}:{date}        # Progress tracking
popular:recipes:{category}             # Popular recipes by category
```

### TTL Strategy by Data Type
- **Sessions**: 24 hours (sliding expiration)
- **Meal Plans**: 7 days (weekly planning cycle)
- **Recipes**: 4-24 hours (popularity-based)
- **Search Results**: 30 minutes (query-dependent)
- **User Preferences**: 30 days (infrequently changed)
- **Progress Data**: 90 days (long-term tracking)

### Connection Pool Sizing
```javascript
// Recommended connection pool configuration
const poolConfig = {
  minConnections: 2,      // Minimum always available
  maxConnections: 20,     // Peak load capacity
  acquireTimeoutMillis: 10000,  // 10 second timeout
  idleTimeoutMillis: 300000,    // 5 minute idle timeout
  createRetryIntervalMillis: 200,
  createTimeoutMillis: 5000,
  validateOnBorrow: true
};
```

This comprehensive performance tuning guide ensures optimal Redis performance for the FitnessMealPlanner application while maintaining scalability and reliability.