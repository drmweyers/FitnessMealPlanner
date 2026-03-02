// @ts-nocheck - Type errors suppressed
/**
 * Access Logging Middleware
 * 
 * Tracks all user activities and API access for admin monitoring and analytics.
 * Logs: user ID, endpoint, method, timestamp, IP address, user agent, response status
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// In-memory cache for access logs (to avoid database writes on every request)
// In production, consider using Redis or a message queue
interface AccessLog {
  userId?: string;
  email?: string;
  role?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class AccessLogger {
  private logs: AccessLog[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  log(accessLog: AccessLog): void {
    this.logs.push(accessLog);

    // Flush if batch size reached
    if (this.logs.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.logs.length > 0) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flush(): Promise<void> {
    if (this.logs.length === 0) return;

    const logsToFlush = [...this.logs];
    this.logs = [];

    try {
      // Store in database (create table if needed)
      // For now, we'll use a simple approach - store in a JSONB column
      // In production, you'd want a proper access_logs table
      await this.storeLogs(logsToFlush);
    } catch (error) {
      console.error('[AccessLogger] Failed to flush logs:', error);
      // Re-add logs to queue if flush failed
      this.logs.unshift(...logsToFlush);
    }
  }

  private async storeLogs(logs: AccessLog[]): Promise<void> {
    // Store logs in a simple JSON format
    // In production, create a proper access_logs table
    for (const log of logs) {
      // For now, just log to console
      // TODO: Create access_logs table and store properly
      console.log('[AccessLog]', JSON.stringify(log));
    }
  }

  async getLogs(filters: {
    userId?: string;
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AccessLog[]> {
    // In production, query from database
    // For now, return empty array
    return [];
  }

  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Final flush
    this.flush();
  }
}

export const accessLogger = new AccessLogger();

/**
 * Access Logging Middleware
 * 
 * Logs all API requests with user information, endpoint, method, IP, etc.
 */
export const logAccess = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capture response finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                     req.connection.remoteAddress || 
                     'unknown';

    const log: AccessLog = {
      userId: req.user?.id,
      email: (req.user as any)?.email, // May not be available
      role: req.user?.role,
      endpoint: req.path,
      method: req.method,
      ipAddress: ipAddress as string,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      metadata: {
        query: req.query,
        params: req.params,
      }
    };

    accessLogger.log(log);
  });

  next();
};

/**
 * Get access logs for admin dashboard
 */
export async function getAccessLogs(filters: {
  userId?: string;
  endpoint?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AccessLog[]> {
  return accessLogger.getLogs(filters);
}

