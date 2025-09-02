/**
 * Authentication Type Definitions
 * 
 * Type definitions for authentication-related objects to eliminate
 * TypeScript 'as any' violations and improve type safety.
 */

import { User } from '@shared/schema';

/**
 * Express Request with authenticated user
 * Extends Express Request to include user from Passport authentication
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: {
    intendedRole?: string;
    [key: string]: any;
  };
}

/**
 * Google OAuth user profile structure
 * Matches the structure returned by Google OAuth strategy
 */
export interface GoogleOAuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
  provider: 'google';
}

/**
 * PDF Export request user context
 * User information available in PDF export requests
 */
export interface PdfExportUser {
  id: string;
  email: string;
  role: 'admin' | 'trainer' | 'customer';
  name?: string;
}

/**
 * Security context for analytics middleware
 * Contains security-related metadata for request tracking
 */
export interface SecurityContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  requestId: string;
  timestamp: Date;
}

/**
 * Extended session interface for role-based redirects
 */
export interface ExtendedSession {
  intendedRole?: 'admin' | 'trainer' | 'customer';
  passport?: {
    user?: any;
  };
  [key: string]: any;
}