/**
 * Database Query Performance Monitor
 * 
 * Monitors database query performance, tracks slow queries,
 * and provides insights for optimization.
 */

import { logger } from './logger';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  context?: string;
  parameters?: any;
}

interface SlowQueryAlert {
  query: string;
  duration: number;
  threshold: number;
  frequency: number;
  lastOccurred: Date;
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold: number = 1000; // 1 second
  private maxMetricsHistory: number = 10000;
  private slowQueryAlerts: Map<string, SlowQueryAlert> = new Map();

  /**
   * Record a query execution with timing
   */
  recordQuery(
    query: string,
    duration: number,
    userId?: string,
    context?: string,
    parameters?: any
  ): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      userId,
      context,
      parameters: this.sanitizeParameters(parameters),
    };

    this.metrics.push(metric);

    // Keep metrics history bounded
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check for slow query
    if (duration > this.slowQueryThreshold) {
      this.handleSlowQuery(metric);
    }

    // Log query performance
    logger.performance(
      `Database query executed: ${context || 'unknown'}`,
      duration,
      {
        userId,
        feature: 'database',
        action: 'query_execution',
        metadata: {
          query: metric.query,
          parameters: metric.parameters,
        },
      }
    );
  }

  /**
   * Sanitize query string for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential passwords, tokens, or sensitive data
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .substring(0, 500); // Limit query length
  }

  /**
   * Sanitize query parameters for logging
   */
  private sanitizeParameters(parameters: any): any {
    if (!parameters) return parameters;
    
    if (Array.isArray(parameters)) {
      return parameters.map(param => 
        typeof param === 'string' && param.length > 100 
          ? param.substring(0, 100) + '...' 
          : param
      );
    }

    if (typeof parameters === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(parameters)) {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('secret')) {
          sanitized[key] = '***';
        } else if (typeof value === 'string' && value.length > 100) {
          sanitized[key] = value.substring(0, 100) + '...';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return parameters;
  }

  /**
   * Handle slow query detection and alerting
   */
  private handleSlowQuery(metric: QueryMetrics): void {
    const queryKey = metric.query;
    const existing = this.slowQueryAlerts.get(queryKey);

    if (existing) {
      existing.frequency++;
      existing.lastOccurred = metric.timestamp;
      if (metric.duration > existing.duration) {
        existing.duration = metric.duration;
      }
    } else {
      this.slowQueryAlerts.set(queryKey, {
        query: queryKey,
        duration: metric.duration,
        threshold: this.slowQueryThreshold,
        frequency: 1,
        lastOccurred: metric.timestamp,
      });
    }

    logger.warn(
      `Slow query detected: ${metric.duration}ms`,
      {
        userId: metric.userId,
        feature: 'database',
        action: 'slow_query_alert',
        metadata: {
          query: queryKey,
          duration: metric.duration,
          threshold: this.slowQueryThreshold,
          context: metric.context,
        },
      }
    );
  }

  /**
   * Get performance statistics for the last N minutes
   */
  getPerformanceStats(lastMinutes: number = 60): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    topSlowQueries: QueryMetrics[];
  } {
    const cutoff = new Date(Date.now() - lastMinutes * 60 * 1000);
    const recentQueries = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentQueries.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        topSlowQueries: [],
      };
    }

    const totalDuration = recentQueries.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = recentQueries.filter(m => m.duration > this.slowQueryThreshold);
    
    const topSlow = [...recentQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalQueries: recentQueries.length,
      averageDuration: totalDuration / recentQueries.length,
      slowQueries: slowQueries.length,
      topSlowQueries: topSlow,
    };
  }

  /**
   * Get slow query alerts summary
   */
  getSlowQueryAlerts(): SlowQueryAlert[] {
    return Array.from(this.slowQueryAlerts.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Create a timing wrapper for database operations
   */
  wrapQuery<T>(
    queryPromise: Promise<T>,
    queryDescription: string,
    userId?: string,
    context?: string
  ): Promise<T> {
    const startTime = process.hrtime.bigint();

    return queryPromise
      .then(result => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        this.recordQuery(queryDescription, duration, userId, context);
        return result;
      })
      .catch(error => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;
        
        this.recordQuery(`ERROR: ${queryDescription}`, duration, userId, context);
        
        logger.error(
          `Database query failed: ${queryDescription}`,
          error,
          {
            userId,
            feature: 'database',
            action: 'query_error',
            metadata: {
              duration,
              context,
            },
          }
        );
        
        throw error;
      });
  }

  /**
   * Reset all metrics and alerts (for testing)
   */
  reset(): void {
    this.metrics = [];
    this.slowQueryAlerts.clear();
  }

  /**
   * Configure slow query threshold
   */
  setSlowQueryThreshold(milliseconds: number): void {
    this.slowQueryThreshold = milliseconds;
    logger.info(
      `Slow query threshold updated to ${milliseconds}ms`,
      {
        feature: 'database',
        action: 'config_update',
        metadata: { newThreshold: milliseconds },
      }
    );
  }
}

// Export singleton instance
export const queryMonitor = new QueryPerformanceMonitor();