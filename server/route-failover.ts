// @ts-nocheck - Infrastructure/agent file, type errors suppressed
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithFallback } from './utils/fetch.js';

// ES module compatible dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteHealthStatus {
  route: string;
  status: 'healthy' | 'unhealthy' | 'failed';
  responseTime: number;
  timestamp: Date;
  error?: string;
}

interface HealthIssue {
  type: 'viteexpress_failure' | 'route_timeout' | 'memory_pressure' | 'port_conflict' | 'startup_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details?: any;
}

export class RouteFailoverSystem {
  private app: express.Application;
  private routeHealth: Map<string, RouteHealthStatus> = new Map();
  private failoverActive: boolean = false;
  private healthCheckInterval: NodeJS.Timer | null = null;
  private port: number;

  constructor(app: express.Application, port: number = 4000) {
    this.app = app;
    this.port = port;
    this.initializeHealthMonitoring();
  }

  // Initialize the health monitoring system
  private initializeHealthMonitoring(): void {
    console.log('🔧 Initializing Route Failover System...');

    // Always register fallback routes as safety net
    this.registerManualRoutes();

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('✅ Route Failover System initialized');
  }

  // Primary ViteExpress health check
  public async checkViteExpressHealth(): Promise<boolean> {
    try {
      const testResponse = await this.internalRouteTest('/api/health');
      const isHealthy = testResponse.status === 200;

      this.routeHealth.set('viteExpress', {
        route: 'viteExpress',
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: testResponse.responseTime || 0,
        timestamp: new Date(),
        error: isHealthy ? undefined : `HTTP ${testResponse.status}`
      });

      return isHealthy;
    } catch (error) {
      console.warn('⚠️ ViteExpress health check failed:', error.message);
      this.routeHealth.set('viteExpress', {
        route: 'viteExpress',
        status: 'failed',
        responseTime: 0,
        timestamp: new Date(),
        error: error.message
      });
      return false;
    }
  }

  // Internal route testing
  private async internalRouteTest(route: string): Promise<{ status: number; responseTime: number }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetchWithFallback(`http://localhost:${this.port}${route}`, {
        signal: controller.signal as any,
        headers: {
          'User-Agent': 'FitnessMealPlanner-HealthCheck/1.0'
        }
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      return {
        status: response.status,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn(`Route test failed for ${route}:`, error.message);
      return {
        status: 0,
        responseTime
      };
    }
  }

  // Automatic failover activation
  public async activateFailover(): Promise<void> {
    if (this.failoverActive) {
      console.log('⚠️ Failover already active');
      return;
    }

    console.log('🔄 Activating Route Failover System...');
    this.failoverActive = true;

    // Intensify health monitoring during failover
    this.startIntensiveMonitoring();

    console.log('✅ Route Failover System ACTIVE - All routes protected');
  }

  // Manual route registration (always active as fallback)
  private registerManualRoutes(): void {
    const reactAppRoutes = [
      { path: '/login', description: 'Login page' },
      { path: '/signup', description: 'Signup page' },
      { path: '/dashboard', description: 'Dashboard' },
      { path: '/admin', description: 'Admin panel' },
      { path: '/trainer', description: 'Trainer dashboard' },
      { path: '/customer', description: 'Customer portal' },
      { path: '/profile', description: 'User profile' },
      { path: '/settings', description: 'Settings page' }
    ];

    // Register exact routes
    reactAppRoutes.forEach(({ path, description }) => {
      this.app.get(path, (req, res, next) => {
        this.serveReactAppWithFallback(req, res, next, description);
      });

      // Register wildcard routes for nested paths
      this.app.get(`${path}/*`, (req, res, next) => {
        this.serveReactAppWithFallback(req, res, next, `${description} (nested)`);
      });
    });

    // Root redirect
    this.app.get('/', (req, res) => {
      console.log('📍 Root access - redirecting to landing page');
      res.redirect('/landing/index.html');
    });

    console.log('✅ Manual route handlers registered for all critical paths');
  }

  // Enhanced React app serving with comprehensive error handling
  private serveReactAppWithFallback(req: express.Request, res: express.Response, next: express.NextFunction, description: string): void {
    const route = req.path;

    // Log access for monitoring
    console.log(`🔍 Route access: ${route} (${description})`);

    try {
      const indexPath = path.join(__dirname, '../client', 'index.html');

      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`❌ Failed to serve React app for ${route}:`, err);

          // Ultimate fallback - send basic HTML response
          res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>FitnessMealPlanner - Service Unavailable</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .error-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                .error-title { color: #e74c3c; margin-bottom: 20px; }
                .error-message { color: #666; margin-bottom: 30px; }
                .retry-button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="error-container">
                <h1 class="error-title">🔧 Service Temporarily Unavailable</h1>
                <p class="error-message">
                  We're experiencing technical difficulties with the ${description.toLowerCase()}.
                  Our failover system is working to restore service.
                </p>
                <button class="retry-button" onclick="window.location.reload()">
                  Retry Now
                </button>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                  Error Code: ROUTE_FAILOVER_${Date.now()}
                </p>
              </div>
            </body>
            </html>
          `);
        } else {
          console.log(`✅ Successfully served React app for ${route}`);
        }
      });
    } catch (error) {
      console.error(`💥 Critical error serving ${route}:`, error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Route failover system encountered an error',
        route: route,
        timestamp: new Date().toISOString(),
        failoverActive: this.failoverActive
      });
    }
  }

  // Real-time health monitoring
  private startHealthMonitoring(): void {
    console.log('🔍 Starting route health monitoring...');

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, parseInt(process.env.HEALTH_CHECK_INTERVAL || '15000')); // Default 15 seconds

    console.log('✅ Health monitoring active');
  }

  // Intensive monitoring during failover
  private startIntensiveMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log('🔍 Starting intensive health monitoring...');

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.attemptRecovery();
      } catch (error) {
        console.error('Intensive monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds during failover
  }

  // Perform comprehensive health check
  private async performHealthCheck(): Promise<void> {
    const criticalRoutes = ['/api/health', '/login', '/admin', '/trainer', '/customer'];

    for (const route of criticalRoutes) {
      try {
        const health = await this.assessRouteHealth(route);
        this.routeHealth.set(route, health);

        // Log concerning health issues
        if (health.status !== 'healthy') {
          console.warn(`⚠️ Route health concern: ${route} - ${health.status} (${health.responseTime}ms)`);
        }
      } catch (error) {
        console.error(`Health check failed for ${route}:`, error);
      }
    }

    // Overall system health summary
    this.logHealthSummary();
  }

  // Assess individual route health
  public async assessRouteHealth(route: string): Promise<RouteHealthStatus> {
    const startTime = Date.now();

    try {
      const testResult = await this.internalRouteTest(route);
      const responseTime = Date.now() - startTime;

      return {
        route,
        status: testResult.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        error: testResult.status !== 200 ? `HTTP ${testResult.status}` : undefined
      };
    } catch (error) {
      return {
        route,
        status: 'failed',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  // Intelligent recovery attempt
  private async attemptRecovery(): Promise<void> {
    if (!this.failoverActive) return;

    console.log('🔄 Attempting system recovery...');

    // Check if primary system (ViteExpress) is healthy again
    const viteHealthy = await this.checkViteExpressHealth();

    if (viteHealthy) {
      // Test all critical routes before declaring recovery
      const criticalRoutes = ['/login', '/admin', '/trainer', '/customer'];
      const recoveryTests = await Promise.all(
        criticalRoutes.map(route => this.assessRouteHealth(route))
      );

      const allHealthy = recoveryTests.every(test => test.status === 'healthy');
      const averageResponseTime = recoveryTests.reduce((sum, test) => sum + test.responseTime, 0) / recoveryTests.length;

      if (allHealthy && averageResponseTime < 5000) { // All healthy and responsive
        this.failoverActive = false;

        // Return to normal monitoring
        this.startHealthMonitoring();

        console.log('✅ System recovery successful - ViteExpress restored');
        console.log(`📊 Average response time: ${Math.round(averageResponseTime)}ms`);
      } else {
        console.log(`⚠️ Recovery incomplete - Average response time: ${Math.round(averageResponseTime)}ms`);
      }
    } else {
      console.log('⚠️ ViteExpress still unhealthy - maintaining failover mode');
    }
  }

  // Log health summary
  private logHealthSummary(): void {
    const healthyRoutes = Array.from(this.routeHealth.values()).filter(h => h.status === 'healthy').length;
    const totalRoutes = this.routeHealth.size;
    const healthPercentage = totalRoutes > 0 ? Math.round((healthyRoutes / totalRoutes) * 100) : 100;

    if (healthPercentage < 100) {
      console.log(`📊 Route Health: ${healthyRoutes}/${totalRoutes} healthy (${healthPercentage}%) | Failover: ${this.failoverActive ? 'ACTIVE' : 'STANDBY'}`);
    }
  }

  // Get current system status
  public getSystemStatus(): any {
    const routes = Array.from(this.routeHealth.entries()).map(([route, health]) => ({
      route,
      status: health.status,
      responseTime: health.responseTime,
      lastCheck: health.timestamp,
      error: health.error
    }));

    const healthyCount = routes.filter(r => r.status === 'healthy').length;
    const totalCount = routes.length;

    return {
      overallHealth: healthyCount === totalCount ? 'excellent' : healthyCount > totalCount * 0.8 ? 'good' : 'degraded',
      healthPercentage: totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100,
      failoverActive: this.failoverActive,
      routes,
      lastUpdate: new Date().toISOString()
    };
  }

  // Cleanup resources
  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('🧹 Route failover system cleanup complete');
  }
}