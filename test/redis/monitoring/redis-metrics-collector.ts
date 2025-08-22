import { RedisService, CacheMetrics } from '../../../server/services/RedisService';
import { EventEmitter } from 'events';

export interface RedisSystemMetrics {
  memory: {
    used: number;
    peak: number;
    available: number;
    fragmentation: number;
  };
  connections: {
    active: number;
    total: number;
    rejected: number;
  };
  operations: {
    commandsProcessed: number;
    commandsPerSecond: number;
    slowLogLength: number;
  };
  keyspace: {
    totalKeys: number;
    expires: number;
    avgTtl: number;
  };
  replication: {
    role: 'master' | 'slave';
    connectedSlaves?: number;
    masterLastIoSecondsAgo?: number;
  };
}

export interface RedisPerformanceSnapshot {
  timestamp: number;
  applicationMetrics: CacheMetrics;
  systemMetrics: RedisSystemMetrics;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  errorAnalysis: {
    connectionErrors: number;
    timeoutErrors: number;
    memoryErrors: number;
    otherErrors: number;
  };
}

export class RedisMetricsCollector extends EventEmitter {
  private redisService: RedisService;
  private metricsHistory: RedisPerformanceSnapshot[] = [];
  private responseTimeSamples: number[] = [];
  private errorCounts = {
    connection: 0,
    timeout: 0,
    memory: 0,
    other: 0
  };
  private collectionInterval: NodeJS.Timeout | null = null;
  private readonly maxHistorySize: number;

  constructor(redisService: RedisService, maxHistorySize = 1000) {
    super();
    this.redisService = redisService;
    this.maxHistorySize = maxHistorySize;
  }

  async startCollection(intervalMs = 5000): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    console.log(`Starting Redis metrics collection every ${intervalMs}ms`);

    this.collectionInterval = setInterval(async () => {
      try {
        const snapshot = await this.collectMetrics();
        this.metricsHistory.push(snapshot);

        // Trim history to prevent memory growth
        if (this.metricsHistory.length > this.maxHistorySize) {
          this.metricsHistory.shift();
        }

        // Emit metrics event for real-time monitoring
        this.emit('metrics', snapshot);

        // Check for alerts
        this.checkAlerts(snapshot);
      } catch (error) {
        console.error('Error collecting Redis metrics:', error);
        this.errorCounts.other++;
      }
    }, intervalMs);
  }

  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log('Stopped Redis metrics collection');
    }
  }

  private async collectMetrics(): Promise<RedisPerformanceSnapshot> {
    const applicationMetrics = this.redisService.getMetrics();
    
    // Simulate Redis INFO command results (in production, you'd call Redis directly)
    const systemMetrics = await this.collectSystemMetrics();
    
    const responseTimePercentiles = this.calculatePercentiles(this.responseTimeSamples);
    
    const snapshot: RedisPerformanceSnapshot = {
      timestamp: Date.now(),
      applicationMetrics: {
        ...applicationMetrics,
        hitRatio: applicationMetrics.hitCount / (applicationMetrics.hitCount + applicationMetrics.missCount) || 0
      },
      systemMetrics,
      responseTimePercentiles,
      errorAnalysis: { ...this.errorCounts }
    };

    // Clear samples after calculation
    this.responseTimeSamples = [];

    return snapshot;
  }

  private async collectSystemMetrics(): Promise<RedisSystemMetrics> {
    // In a real implementation, you'd execute Redis INFO commands
    // For testing purposes, we'll simulate realistic metrics
    
    const simulateMemoryUsage = () => {
      const baseMemory = 50 * 1024 * 1024; // 50MB base
      const variation = Math.random() * 10 * 1024 * 1024; // ±10MB variation
      return Math.floor(baseMemory + variation);
    };

    const simulateConnections = () => {
      return {
        active: Math.floor(Math.random() * 50) + 10,
        total: Math.floor(Math.random() * 100) + 50,
        rejected: Math.floor(Math.random() * 5)
      };
    };

    return {
      memory: {
        used: simulateMemoryUsage(),
        peak: simulateMemoryUsage() * 1.2,
        available: 256 * 1024 * 1024, // 256MB available
        fragmentation: 1.1 + Math.random() * 0.3 // 1.1 - 1.4
      },
      connections: simulateConnections(),
      operations: {
        commandsProcessed: Math.floor(Math.random() * 10000) + 1000,
        commandsPerSecond: Math.floor(Math.random() * 500) + 100,
        slowLogLength: Math.floor(Math.random() * 10)
      },
      keyspace: {
        totalKeys: Math.floor(Math.random() * 1000) + 100,
        expires: Math.floor(Math.random() * 200) + 20,
        avgTtl: Math.floor(Math.random() * 3600) + 300 // 5min - 1hour
      },
      replication: {
        role: 'master',
        connectedSlaves: Math.floor(Math.random() * 3)
      }
    };
  }

  private calculatePercentiles(samples: number[]): typeof RedisPerformanceSnapshot.prototype.responseTimePercentiles {
    if (samples.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)],
      p90: sorted[Math.floor(length * 0.9)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)]
    };
  }

  // Method to record response times from the application
  recordResponseTime(responseTimeMs: number): void {
    this.responseTimeSamples.push(responseTimeMs);
    
    // Limit sample size to prevent memory issues
    if (this.responseTimeSamples.length > 1000) {
      this.responseTimeSamples = this.responseTimeSamples.slice(-500); // Keep last 500 samples
    }
  }

  recordError(errorType: 'connection' | 'timeout' | 'memory' | 'other'): void {
    this.errorCounts[errorType]++;
  }

  private checkAlerts(snapshot: RedisPerformanceSnapshot): void {
    const alerts = [];

    // Memory usage alert
    if (snapshot.systemMetrics.memory.used > snapshot.systemMetrics.memory.available * 0.8) {
      alerts.push({
        type: 'memory',
        severity: 'warning',
        message: 'Redis memory usage above 80%',
        value: (snapshot.systemMetrics.memory.used / snapshot.systemMetrics.memory.available * 100).toFixed(1) + '%'
      });
    }

    // High response time alert
    if (snapshot.responseTimePercentiles.p95 > 200) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: '95th percentile response time above 200ms',
        value: snapshot.responseTimePercentiles.p95 + 'ms'
      });
    }

    // Low hit ratio alert
    if (snapshot.applicationMetrics.hitRatio < 0.7) {
      alerts.push({
        type: 'cache_efficiency',
        severity: 'warning',
        message: 'Cache hit ratio below 70%',
        value: (snapshot.applicationMetrics.hitRatio * 100).toFixed(1) + '%'
      });
    }

    // High error rate alert
    const totalOps = snapshot.applicationMetrics.hitCount + snapshot.applicationMetrics.missCount;
    const errorRate = snapshot.applicationMetrics.errorCount / totalOps;
    if (errorRate > 0.05) {
      alerts.push({
        type: 'errors',
        severity: 'critical',
        message: 'Error rate above 5%',
        value: (errorRate * 100).toFixed(2) + '%'
      });
    }

    // Fragmentation alert
    if (snapshot.systemMetrics.memory.fragmentation > 2.0) {
      alerts.push({
        type: 'memory_fragmentation',
        severity: 'warning',
        message: 'Memory fragmentation above 2.0',
        value: snapshot.systemMetrics.memory.fragmentation.toFixed(2)
      });
    }

    // Emit alerts
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
      console.warn('Redis alerts:', alerts.map(a => `${a.type}: ${a.message} (${a.value})`).join(', '));
    }
  }

  getMetricsHistory(minutes: number = 10): RedisPerformanceSnapshot[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.metricsHistory.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  getCurrentMetrics(): RedisPerformanceSnapshot | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  getPerformanceSummary(minutes: number = 60): any {
    const recent = this.getMetricsHistory(minutes);
    if (recent.length === 0) return null;

    const hitRatios = recent.map(m => m.applicationMetrics.hitRatio);
    const p95Times = recent.map(m => m.responseTimePercentiles.p95);
    const memoryUsage = recent.map(m => m.systemMetrics.memory.used);
    const errorCounts = recent.map(m => m.applicationMetrics.errorCount);

    return {
      period: `${minutes} minutes`,
      sampleCount: recent.length,
      hitRatio: {
        avg: this.average(hitRatios),
        min: Math.min(...hitRatios),
        max: Math.max(...hitRatios)
      },
      responseTime: {
        avgP95: this.average(p95Times),
        minP95: Math.min(...p95Times),
        maxP95: Math.max(...p95Times)
      },
      memoryUsage: {
        avg: this.average(memoryUsage),
        min: Math.min(...memoryUsage),
        max: Math.max(...memoryUsage)
      },
      errors: {
        total: Math.max(...errorCounts) - Math.min(...errorCounts),
        rate: this.average(errorCounts.map((count, index) => {
          if (index === 0) return 0;
          const totalOps = recent[index].applicationMetrics.hitCount + recent[index].applicationMetrics.missCount;
          return count / totalOps;
        }))
      }
    };
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  // Generate dashboard-friendly JSON data
  generateDashboardData(): any {
    const current = this.getCurrentMetrics();
    const summary = this.getPerformanceSummary();
    const recent = this.getMetricsHistory(30); // Last 30 minutes

    return {
      current,
      summary,
      charts: {
        hitRatio: recent.map(m => ({
          timestamp: m.timestamp,
          value: m.applicationMetrics.hitRatio
        })),
        responseTime: recent.map(m => ({
          timestamp: m.timestamp,
          p50: m.responseTimePercentiles.p50,
          p95: m.responseTimePercentiles.p95,
          p99: m.responseTimePercentiles.p99
        })),
        memoryUsage: recent.map(m => ({
          timestamp: m.timestamp,
          used: m.systemMetrics.memory.used,
          available: m.systemMetrics.memory.available
        })),
        operations: recent.map(m => ({
          timestamp: m.timestamp,
          hits: m.applicationMetrics.hitCount,
          misses: m.applicationMetrics.missCount,
          errors: m.applicationMetrics.errorCount
        }))
      },
      health: {
        status: this.getHealthStatus(current),
        issues: this.getHealthIssues(current)
      }
    };
  }

  private getHealthStatus(current: RedisPerformanceSnapshot | null): 'healthy' | 'warning' | 'critical' {
    if (!current) return 'warning';

    const issues = this.getHealthIssues(current);
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const warningIssues = issues.filter(issue => issue.severity === 'warning');

    if (criticalIssues.length > 0) return 'critical';
    if (warningIssues.length > 0) return 'warning';
    return 'healthy';
  }

  private getHealthIssues(current: RedisPerformanceSnapshot | null): Array<{ type: string; severity: string; message: string }> {
    if (!current) return [{ type: 'data', severity: 'warning', message: 'No metrics available' }];

    const issues = [];

    // Check various health indicators
    if (current.applicationMetrics.hitRatio < 0.7) {
      issues.push({ type: 'cache_efficiency', severity: 'warning', message: 'Low cache hit ratio' });
    }

    if (current.responseTimePercentiles.p95 > 200) {
      issues.push({ type: 'performance', severity: 'warning', message: 'High response times' });
    }

    if (current.systemMetrics.memory.used > current.systemMetrics.memory.available * 0.9) {
      issues.push({ type: 'memory', severity: 'critical', message: 'High memory usage' });
    }

    const totalOps = current.applicationMetrics.hitCount + current.applicationMetrics.missCount;
    if (totalOps > 0 && (current.applicationMetrics.errorCount / totalOps) > 0.05) {
      issues.push({ type: 'errors', severity: 'critical', message: 'High error rate' });
    }

    return issues;
  }
}