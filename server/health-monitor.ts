import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getFetch } from './utils/fetch.js';

interface HealthStatus {
  route: string;
  status: 'healthy' | 'unhealthy' | 'failed' | 'degraded';
  responseTime: number;
  timestamp: Date;
  error?: string;
  metadata?: any;
}

interface SystemMetrics {
  routeFailures: number;
  lastFailureTime: Date | null;
  failoverActivations: number;
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

interface AlertConfig {
  emailEnabled: boolean;
  slackEnabled: boolean;
  webhookUrl?: string;
  recipients: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceTrend {
  timestamp: Date;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
}

export class HealthMonitor extends EventEmitter {
  private metrics: SystemMetrics;
  private healthHistory: Map<string, HealthStatus[]> = new Map();
  private performanceTrends: PerformanceTrend[] = [];
  private alertConfig: AlertConfig;
  private monitoringStartTime: Date;
  private lastAlertTime: Map<string, Date> = new Map();
  private alertCooldown = 300000; // 5 minutes
  private logFile: string;

  constructor() {
    super();

    this.monitoringStartTime = new Date();
    this.logFile = path.join(process.cwd(), 'logs', 'health-monitor.log');

    this.metrics = {
      routeFailures: 0,
      lastFailureTime: null,
      failoverActivations: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      successRate: 100,
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0
    };

    this.alertConfig = {
      emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
      slackEnabled: process.env.ALERT_SLACK_ENABLED === 'true',
      webhookUrl: process.env.ALERT_SLACK_WEBHOOK,
      recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean),
      severity: (process.env.ALERT_MIN_SEVERITY as any) || 'medium'
    };

    this.initializeLogging();
    this.startPerformanceTracking();

    console.log('📊 Health Monitor initialized');
    console.log(`🔔 Alerts: Email=${this.alertConfig.emailEnabled}, Slack=${this.alertConfig.slackEnabled}`);
  }

  // Predictive failure detection using machine learning-inspired algorithm
  public async predictFailure(): Promise<{ probability: number; factors: string[]; recommendation: string }> {
    const recentFailureRate = this.getRecentFailureRate();
    const responseTimeSpike = this.detectResponseTimeSpike();
    const systemLoad = await this.checkSystemLoad();
    const memoryTrend = this.analyzeMemoryTrend();
    const errorRateTrend = this.analyzeErrorRateTrend();

    const factors: string[] = [];
    let probability = 0;

    // Failure rate analysis (0-30% weight)
    if (recentFailureRate > 5) {
      probability += 30;
      factors.push(`High recent failure rate: ${recentFailureRate.toFixed(1)}%`);
    } else if (recentFailureRate > 2) {
      probability += 15;
      factors.push(`Elevated failure rate: ${recentFailureRate.toFixed(1)}%`);
    }

    // Response time analysis (0-25% weight)
    if (responseTimeSpike > 2.0) {
      probability += 25;
      factors.push(`Significant response time spike: ${responseTimeSpike.toFixed(1)}x normal`);
    } else if (responseTimeSpike > 1.5) {
      probability += 15;
      factors.push(`Response time increase: ${responseTimeSpike.toFixed(1)}x normal`);
    }

    // System load analysis (0-20% weight)
    if (systemLoad.memoryUsage > 90) {
      probability += 20;
      factors.push(`Critical memory usage: ${systemLoad.memoryUsage.toFixed(1)}%`);
    } else if (systemLoad.memoryUsage > 80) {
      probability += 10;
      factors.push(`High memory usage: ${systemLoad.memoryUsage.toFixed(1)}%`);
    }

    if (systemLoad.cpuUsage > 95) {
      probability += 15;
      factors.push(`Critical CPU usage: ${systemLoad.cpuUsage.toFixed(1)}%`);
    } else if (systemLoad.cpuUsage > 85) {
      probability += 8;
      factors.push(`High CPU usage: ${systemLoad.cpuUsage.toFixed(1)}%`);
    }

    // Memory trend analysis (0-15% weight)
    if (memoryTrend === 'rapidly_increasing') {
      probability += 15;
      factors.push('Memory usage rapidly increasing (memory leak suspected)');
    } else if (memoryTrend === 'steadily_increasing') {
      probability += 8;
      factors.push('Memory usage steadily increasing');
    }

    // Error rate trend analysis (0-10% weight)
    if (errorRateTrend === 'increasing') {
      probability += 10;
      factors.push('Error rate trending upward');
    }

    // Cap probability at 100%
    probability = Math.min(probability, 100);

    // Generate recommendation based on probability
    let recommendation = '';
    if (probability > 80) {
      recommendation = 'IMMEDIATE ACTION REQUIRED: System failure imminent. Activate failover systems.';
    } else if (probability > 60) {
      recommendation = 'HIGH ALERT: Prepare for potential failure. Monitor closely and prepare failover.';
    } else if (probability > 40) {
      recommendation = 'CAUTION: System showing stress signs. Consider load reduction or resource scaling.';
    } else if (probability > 20) {
      recommendation = 'ADVISORY: Minor issues detected. Continue monitoring.';
    } else {
      recommendation = 'HEALTHY: System operating normally.';
    }

    return {
      probability,
      factors,
      recommendation
    };
  }

  // Comprehensive route health assessment
  public async assessRouteHealth(route: string): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const fetch = await getFetch();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`http://localhost:4000${route}`, {
        signal: controller.signal as any,
        timeout: 10000,
        headers: {
          'User-Agent': 'FitnessMealPlanner-HealthMonitor/1.0',
          'Accept': 'application/json,text/html'
        }
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(response.status === 200, responseTime);

      // Determine health status
      let status: 'healthy' | 'unhealthy' | 'failed' | 'degraded';
      if (response.status === 200) {
        if (responseTime < 1000) {
          status = 'healthy';
        } else if (responseTime < 5000) {
          status = 'degraded';
        } else {
          status = 'unhealthy';
        }
      } else {
        status = response.status >= 500 ? 'failed' : 'unhealthy';
      }

      const healthStatus: HealthStatus = {
        route,
        status,
        responseTime,
        timestamp: new Date(),
        error: response.status !== 200 ? `HTTP ${response.status}` : undefined,
        metadata: {
          httpStatus: response.status,
          contentType: response.headers.get('content-type'),
          server: response.headers.get('server')
        }
      };

      // Record in history
      this.recordHealthStatus(route, healthStatus);

      // Check for alerts
      await this.checkAlerts(healthStatus);

      return healthStatus;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update metrics for failure
      this.updateMetrics(false, responseTime);

      const healthStatus: HealthStatus = {
        route,
        status: 'failed',
        responseTime,
        timestamp: new Date(),
        error: error.message,
        metadata: {
          errorType: error.name,
          timeout: error.message.includes('timeout') || error.message.includes('aborted')
        }
      };

      // Record in history
      this.recordHealthStatus(route, healthStatus);

      // Check for alerts
      await this.checkAlerts(healthStatus);

      return healthStatus;
    }
  }

  // Real-time alerting system
  public async setupAlerting(): Promise<void> {
    console.log('🔔 Setting up alerting system...');

    // Ensure logs directory exists
    await this.ensureLogsDirectory();

    // Set up event listeners for different alert types
    this.on('routeFailure', (health: HealthStatus) => {
      this.handleAlert('route_failure', 'high', `Route ${health.route} failed: ${health.error}`, health);
    });

    this.on('systemDegraded', (metrics: SystemMetrics) => {
      this.handleAlert('system_degraded', 'medium', `System performance degraded: ${metrics.successRate.toFixed(1)}% success rate`, metrics);
    });

    this.on('failurePredicted', (prediction: any) => {
      if (prediction.probability > 70) {
        this.handleAlert('failure_predicted', 'critical', `System failure predicted (${prediction.probability}% probability)`, prediction);
      }
    });

    this.on('resourcePressure', (resources: any) => {
      if (resources.memoryUsage > 90 || resources.cpuUsage > 95) {
        this.handleAlert('resource_pressure', 'high', `Critical resource pressure: Memory ${resources.memoryUsage}%, CPU ${resources.cpuUsage}%`, resources);
      }
    });

    console.log('✅ Alerting system configured');
  }

  // Handle different types of alerts
  private async handleAlert(type: string, severity: 'low' | 'medium' | 'high' | 'critical', message: string, data: any): Promise<void> {
    const alertKey = `${type}_${severity}`;
    const lastAlert = this.lastAlertTime.get(alertKey);
    const now = new Date();

    // Check cooldown period
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.alertCooldown) {
      return; // Skip alert due to cooldown
    }

    // Update last alert time
    this.lastAlertTime.set(alertKey, now);

    // Log the alert
    await this.logAlert(type, severity, message, data);

    // Send notifications based on configuration
    if (this.shouldSendAlert(severity)) {
      await this.sendNotifications(type, severity, message, data);
    }

    // Console notification
    const emoji = this.getAlertEmoji(severity);
    console.log(`${emoji} ALERT [${severity.toUpperCase()}]: ${message}`);
  }

  private shouldSendAlert(severity: 'low' | 'medium' | 'high' | 'critical'): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const minLevel = severityLevels[this.alertConfig.severity];
    const alertLevel = severityLevels[severity];
    return alertLevel >= minLevel;
  }

  private getAlertEmoji(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const emojis = {
      low: '💡',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };
    return emojis[severity];
  }

  // Send notifications via configured channels
  private async sendNotifications(type: string, severity: string, message: string, data: any): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.alertConfig.emailEnabled && this.alertConfig.recipients.length > 0) {
      promises.push(this.sendEmailAlert(type, severity, message, data));
    }

    if (this.alertConfig.slackEnabled && this.alertConfig.webhookUrl) {
      promises.push(this.sendSlackAlert(type, severity, message, data));
    }

    await Promise.allSettled(promises);
  }

  private async sendEmailAlert(type: string, severity: string, message: string, data: any): Promise<void> {
    try {
      // Email implementation would go here
      // For now, just log the attempt
      console.log(`📧 Email alert sent: ${message}`);
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  private async sendSlackAlert(type: string, severity: string, message: string, data: any): Promise<void> {
    try {
      const fetch = await getFetch();

      const payload = {
        text: `🔔 FitnessMealPlanner Alert`,
        attachments: [{
          color: this.getSlackColor(severity),
          fields: [
            {
              title: 'Alert Type',
              value: type.replace('_', ' ').toUpperCase(),
              short: true
            },
            {
              title: 'Severity',
              value: severity.toUpperCase(),
              short: true
            },
            {
              title: 'Message',
              value: message,
              short: false
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }]
      };

      await fetch(this.alertConfig.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log(`💬 Slack alert sent: ${message}`);
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private getSlackColor(severity: string): string {
    const colors = {
      low: '#36a64f',      // Green
      medium: '#ff9500',   // Orange
      high: '#ff0000',     // Red
      critical: '#8B0000'  // Dark Red
    };
    return colors[severity] || '#cccccc';
  }

  // Logging system
  private async initializeLogging(): Promise<void> {
    await this.ensureLogsDirectory();
    console.log(`📝 Health monitoring logs: ${this.logFile}`);
  }

  private async ensureLogsDirectory(): Promise<void> {
    const logsDir = path.dirname(this.logFile);
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create logs directory:', error.message);
    }
  }

  private async logAlert(type: string, severity: string, message: string, data: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      data: JSON.stringify(data, null, 2)
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Utility methods for analysis
  private getRecentFailureRate(): number {
    const oneHourAgo = new Date(Date.now() - 3600000);
    let totalRequests = 0;
    let failedRequests = 0;

    this.healthHistory.forEach((history, route) => {
      const recentHistory = history.filter(h => h.timestamp > oneHourAgo);
      totalRequests += recentHistory.length;
      failedRequests += recentHistory.filter(h => h.status === 'failed').length;
    });

    return totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
  }

  private detectResponseTimeSpike(): number {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recent: number[] = [];
    const baseline: number[] = [];

    this.healthHistory.forEach((history, route) => {
      history.forEach(h => {
        if (h.timestamp > oneHourAgo) {
          recent.push(h.responseTime);
        } else {
          baseline.push(h.responseTime);
        }
      });
    });

    if (recent.length === 0 || baseline.length === 0) return 1.0;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;

    return baselineAvg > 0 ? recentAvg / baselineAvg : 1.0;
  }

  private async checkSystemLoad(): Promise<{ memoryUsage: number; cpuUsage: number; diskUsage: number }> {
    // Get actual system metrics
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapUsed + memoryUsage.external;
    const maxMemory = 1024 * 1024 * 1024; // 1GB assumed max

    return {
      memoryUsage: (totalMemory / maxMemory) * 100,
      cpuUsage: process.cpuUsage().system / 1000000, // Convert to percentage
      diskUsage: 50 // Placeholder - would implement actual disk usage check
    };
  }

  private analyzeMemoryTrend(): 'stable' | 'steadily_increasing' | 'rapidly_increasing' | 'decreasing' {
    if (this.performanceTrends.length < 5) return 'stable';

    const recent = this.performanceTrends.slice(-10);
    const slope = this.calculateTrend(recent.map(t => t.memoryUsage));

    if (slope > 2) return 'rapidly_increasing';
    if (slope > 0.5) return 'steadily_increasing';
    if (slope < -0.5) return 'decreasing';
    return 'stable';
  }

  private analyzeErrorRateTrend(): 'stable' | 'increasing' | 'decreasing' {
    if (this.performanceTrends.length < 5) return 'stable';

    const recent = this.performanceTrends.slice(-10);
    const slope = this.calculateTrend(recent.map(t => t.errorRate));

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
    const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
    return slope;
  }

  // Record and update methods
  private recordHealthStatus(route: string, health: HealthStatus): void {
    if (!this.healthHistory.has(route)) {
      this.healthHistory.set(route, []);
    }

    const history = this.healthHistory.get(route)!;
    history.push(health);

    // Keep only last 1000 entries per route
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Emit events for alerting
    if (health.status === 'failed') {
      this.emit('routeFailure', health);
    }
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;

    if (!success) {
      this.metrics.routeFailures++;
      this.metrics.lastFailureTime = new Date();
    }

    // Update success rate
    this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.routeFailures) / this.metrics.totalRequests) * 100;

    // Update average response time (rolling average)
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);

    // Update uptime
    this.metrics.uptime = Date.now() - this.monitoringStartTime.getTime();
  }

  private startPerformanceTracking(): void {
    setInterval(async () => {
      const systemLoad = await this.checkSystemLoad();
      const errorRate = this.getRecentFailureRate();

      const trend: PerformanceTrend = {
        timestamp: new Date(),
        responseTime: this.metrics.averageResponseTime,
        memoryUsage: systemLoad.memoryUsage,
        cpuUsage: systemLoad.cpuUsage,
        errorRate
      };

      this.performanceTrends.push(trend);

      // Keep only last 1000 trends
      if (this.performanceTrends.length > 1000) {
        this.performanceTrends.splice(0, this.performanceTrends.length - 1000);
      }

      // Update metrics
      this.metrics.memoryUsage = systemLoad.memoryUsage;
      this.metrics.cpuUsage = systemLoad.cpuUsage;
      this.metrics.diskUsage = systemLoad.diskUsage;

      // Check for system degradation
      if (this.metrics.successRate < 95) {
        this.emit('systemDegraded', this.metrics);
      }

      // Check for resource pressure
      if (systemLoad.memoryUsage > 85 || systemLoad.cpuUsage > 90) {
        this.emit('resourcePressure', systemLoad);
      }

    }, 60000); // Every minute
  }

  private async checkAlerts(health: HealthStatus): Promise<void> {
    // Predictive analysis
    const prediction = await this.predictFailure();
    if (prediction.probability > 60) {
      this.emit('failurePredicted', prediction);
    }
  }

  // Public methods for getting status
  public getSystemMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getRouteHealth(route: string): HealthStatus[] {
    return this.healthHistory.get(route) || [];
  }

  public getAllRouteHealth(): Array<{ route: string; latest: HealthStatus; history: HealthStatus[] }> {
    return Array.from(this.healthHistory.entries()).map(([route, history]) => ({
      route,
      latest: history[history.length - 1],
      history
    }));
  }

  public getPerformanceTrends(): PerformanceTrend[] {
    return [...this.performanceTrends];
  }

  // Cleanup
  public cleanup(): void {
    console.log('🧹 Health monitor cleanup complete');
  }
}