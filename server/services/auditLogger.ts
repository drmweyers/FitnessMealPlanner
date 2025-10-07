import { db } from '../db';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';

export interface AuditEvent {
  userId?: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_RESET' | 'ACCOUNT_LOCKED' | 'OAUTH_LOGIN';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  /**
   * Log an authentication event
   * Fails silently to prevent auth flow interruption
   */
  static async log(event: AuditEvent): Promise<void> {
    try {
      // For now, we'll log to console and prepare for future database implementation
      // Once the auth_audit_log table is created, we'll uncomment the database insert
      
      console.log('[AUTH_AUDIT]', {
        timestamp: new Date().toISOString(),
        ...event
      });

      // Future database implementation (after migration):
      /*
      await db.execute(sql`
        INSERT INTO auth_audit_log (user_id, event_type, ip_address, user_agent, metadata, created_at)
        VALUES (${event.userId}, ${event.eventType}, ${event.ipAddress}, ${event.userAgent}, 
                ${JSON.stringify(event.metadata)}, ${new Date()})
      `);
      */
    } catch (error) {
      // Audit failures should not break authentication
      console.error('[AUDIT_ERROR] Failed to log audit event:', error);
    }
  }

  /**
   * Extract client information from request
   */
  static extractClientInfo(req: Request): { ipAddress: string; userAgent: string } {
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    return { ipAddress, userAgent };
  }

  /**
   * Log a successful login
   */
  static async logLogin(req: Request, userId: string, method: 'password' | 'oauth' = 'password'): Promise<void> {
    const { ipAddress, userAgent } = this.extractClientInfo(req);
    
    await this.log({
      userId,
      eventType: method === 'oauth' ? 'OAUTH_LOGIN' : 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        method,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a failed login attempt
   */
  static async logFailedLogin(req: Request, email: string, reason: string): Promise<void> {
    const { ipAddress, userAgent } = this.extractClientInfo(req);
    
    await this.log({
      eventType: 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      metadata: {
        email, // Don't log passwords!
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a logout event
   */
  static async logLogout(req: Request, userId: string): Promise<void> {
    const { ipAddress, userAgent } = this.extractClientInfo(req);
    
    await this.log({
      userId,
      eventType: 'LOGOUT',
      ipAddress,
      userAgent,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a password reset request
   */
  static async logPasswordReset(req: Request, userId: string): Promise<void> {
    const { ipAddress, userAgent } = this.extractClientInfo(req);
    
    await this.log({
      userId,
      eventType: 'PASSWORD_RESET',
      ipAddress,
      userAgent,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log account lockout
   */
  static async logAccountLocked(req: Request, userId: string, reason: string): Promise<void> {
    const { ipAddress, userAgent } = this.extractClientInfo(req);
    
    await this.log({
      userId,
      eventType: 'ACCOUNT_LOCKED',
      ipAddress,
      userAgent,
      metadata: {
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }
}