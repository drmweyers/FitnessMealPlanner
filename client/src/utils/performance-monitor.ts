/**
 * Performance Monitoring Utilities
 * 
 * This module provides performance monitoring capabilities for the React application,
 * including component render tracking, API call timing, and bundle loading metrics.
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'render' | 'api' | 'bundle' | 'custom';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiCallTimes = new Map<string, number>();
  private renderTimes = new Map<string, number>();

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, type: PerformanceMetric['type'], metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      type,
      metadata
    });

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Start timing an API call
   */
  startApiCall(endpoint: string): string {
    const callId = `${endpoint}-${Date.now()}`;
    this.apiCallTimes.set(callId, performance.now());
    return callId;
  }

  /**
   * End timing an API call
   */
  endApiCall(callId: string, success: boolean = true) {
    const startTime = this.apiCallTimes.get(callId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.recordMetric(
        `api-call-${callId.split('-')[0]}`,
        duration,
        'api',
        { success, callId }
      );
      this.apiCallTimes.delete(callId);
    }
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'custom');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'custom', { error: true });
      throw error;
    }
  }

  /**
   * Record component render time
   */
  recordComponentRender(componentName: string, renderTime: number) {
    this.recordMetric(`component-render-${componentName}`, renderTime, 'render');
  }

  /**
   * Start timing a component render
   */
  startComponentRender(componentName: string): string {
    const renderId = `${componentName}-${Date.now()}`;
    this.renderTimes.set(renderId, performance.now());
    return renderId;
  }

  /**
   * End timing a component render
   */
  endComponentRender(renderId: string) {
    const startTime = this.renderTimes.get(renderId);
    if (startTime) {
      const duration = performance.now() - startTime;
      const componentName = renderId.split('-')[0];
      this.recordComponentRender(componentName, duration);
      this.renderTimes.delete(renderId);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(type?: PerformanceMetric['type']): PerformanceMetric[] {
    if (type) {
      return this.metrics.filter(metric => metric.type === type);
    }
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const summary = {
      totalMetrics: this.metrics.length,
      averageApiTime: 0,
      averageRenderTime: 0,
      slowestApiCall: null as PerformanceMetric | null,
      slowestRender: null as PerformanceMetric | null,
    };

    const apiMetrics = this.metrics.filter(m => m.type === 'api');
    const renderMetrics = this.metrics.filter(m => m.type === 'render');

    if (apiMetrics.length > 0) {
      summary.averageApiTime = apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;
      summary.slowestApiCall = apiMetrics.reduce((slowest, current) => 
        current.value > slowest.value ? current : slowest
      );
    }

    if (renderMetrics.length > 0) {
      summary.averageRenderTime = renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length;
      summary.slowestRender = renderMetrics.reduce((slowest, current) => 
        current.value > slowest.value ? current : slowest
      );
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.length = 0;
    this.apiCallTimes.clear();
    this.renderTimes.clear();
  }

  /**
   * Log performance summary to console (development only)
   */
  logSummary() {
    if (process.env.NODE_ENV !== 'development') return;

    const summary = this.getSummary();
    console.group('Performance Summary');
    console.log(`Total Metrics: ${summary.totalMetrics}`);
    console.log(`Average API Time: ${summary.averageApiTime.toFixed(2)}ms`);
    console.log(`Average Render Time: ${summary.averageRenderTime.toFixed(2)}ms`);
    
    if (summary.slowestApiCall) {
      console.log(`Slowest API Call: ${summary.slowestApiCall.name} (${summary.slowestApiCall.value.toFixed(2)}ms)`);
    }
    
    if (summary.slowestRender) {
      console.log(`Slowest Render: ${summary.slowestRender.name} (${summary.slowestRender.value.toFixed(2)}ms)`);
    }
    
    console.groupEnd();
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorCoreWebVitals() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          this.recordMetric('LCP', entry.startTime, 'custom', { 
            element: (entry as any).element?.tagName 
          });
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          this.recordMetric('FID', (entry as any).processingStart - entry.startTime, 'custom');
        }
      }
    });

    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Record CLS on page unload
    window.addEventListener('beforeunload', () => {
      this.recordMetric('CLS', clsValue, 'custom');
    });
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize Core Web Vitals monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.monitorCoreWebVitals();
  
  // Log summary every 30 seconds in development
  setInterval(() => {
    performanceMonitor.logSummary();
  }, 30000);
}

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitor(componentName: string) {
  const startRender = () => performanceMonitor.startComponentRender(componentName);
  const endRender = (renderId: string) => performanceMonitor.endComponentRender(renderId);
  const timeFunction = <T>(name: string, fn: () => Promise<T> | T) => 
    performanceMonitor.timeFunction(`${componentName}-${name}`, fn);

  return { startRender, endRender, timeFunction };
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function MonitoredComponent(props: P) {
    const { startRender, endRender } = usePerformanceMonitor(componentName);
    
    const renderId = startRender();
    
    React.useEffect(() => {
      return () => endRender(renderId);
    }, [renderId]);

    return React.createElement(WrappedComponent, props);
  };
}