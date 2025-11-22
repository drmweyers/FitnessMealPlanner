// @ts-nocheck - Infrastructure/agent file, type errors suppressed
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifyToken, verifyRefreshToken } from '../auth';
import jwt from 'jsonwebtoken';
import { refreshTokensWithDeduplication, isTokenInGracePeriod } from './tokenRefreshManager';

/**
 * Authentication Middleware Module
 * 
 * This module provides Express middleware functions for handling JWT-based authentication
 * and role-based authorization in the FitnessMealPlanner application.
 * 
 * Features:
 * - JWT token validation with automatic refresh
 * - Role-based access control
 * - Support for both header and cookie-based token transmission
 * - Comprehensive error handling with specific error codes
 * - User session validation against database
 * 
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

/**
 * Extended Express Request interface to include authentication data
 * 
 * This global declaration extends the Express Request type to include
 * user information and token data that will be attached by the authentication
 * middleware for use in downstream route handlers.
 */
declare global {
  namespace Express {
    interface Request {
      /** 
       * Authenticated user information
       * Available after successful authentication via requireAuth middleware
       */
      user?: {
        id: string;
        role: 'admin' | 'trainer' | 'customer';
      };
      /** 
       * JWT tokens for the authenticated user
       * Available after successful authentication via requireAuth middleware
       */
      tokens?: {
        accessToken: string;
        refreshToken: string;
      };
    }
  }
}

/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and attaches user information to the request object.
 * Supports token transmission via Authorization header (Bearer token) or HTTP cookies.
 * Automatically handles token refresh if the access token is expired but refresh token is valid.
 * 
 * Token Validation Process:
 * 1. Extract token from Authorization header or cookies
 * 2. Verify token signature and expiration
 * 3. Look up user in database to ensure session is still valid
 * 4. If access token expired, attempt refresh with refresh token
 * 5. Attach user info and tokens to request object
 * 6. Continue to next middleware/route handler
 * 
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function to continue middleware chain
 * 
 * @returns HTTP 401 if authentication fails, otherwise continues to next middleware
 * 
 * @example
 * // Protect a route with authentication
 * router.get('/protected', requireAuth, (req, res) => {
 *   // req.user is now available with authenticated user info
 *   res.json({ message: `Hello ${req.user.id}` });
 * });
 * 
 * @example
 * // Client-side usage with Authorization header
 * fetch('/api/protected', {
 *   headers: {
 *     'Authorization': `Bearer ${accessToken}`
 *   }
 * });
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header (preferred method)
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    // Fallback: try to get token from HTTP cookies (for browser-based requests)
    if (!token) {
      token = req.cookies.token;
    }

    // No token found - try refresh token flow
    if (!token) {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ 
          error: 'Authentication required. Please provide a valid token.',
          code: 'NO_TOKEN'
        });
      }

      // Try to refresh using the refresh token
      try {
        // First verify the refresh token to get userId
        const refreshDecoded = await verifyRefreshToken(refreshToken);
        
        // Validate refresh token in storage or grace period
        const storedToken = await storage.getRefreshToken(refreshToken);
        const inGracePeriod = isTokenInGracePeriod(refreshToken);

        // Token must be in storage OR in grace period
        if (!storedToken && !inGracePeriod) {
          res.clearCookie('token');
          res.clearCookie('refreshToken');
          return res.status(401).json({
            error: 'Session expired. Please login again.',
            code: 'REFRESH_TOKEN_EXPIRED'
          });
        }

        // Check expiry only if token is in storage (grace period tokens are already validated)
        if (storedToken && new Date() > new Date(storedToken.expiresAt)) {
          res.clearCookie('token');
          res.clearCookie('refreshToken');
          return res.status(401).json({
            error: 'Session expired. Please login again.',
            code: 'REFRESH_TOKEN_EXPIRED'
          });
        }

        // Get user to ensure they still exist
        const user = await storage.getUser(refreshDecoded.id);
        if (!user) {
          res.clearCookie('token');
          res.clearCookie('refreshToken');
          return res.status(401).json({
            error: 'Invalid user session',
            code: 'INVALID_SESSION'
          });
        }

        // Use deduplicated refresh to prevent race conditions
        const newTokens = await refreshTokensWithDeduplication(user.id, refreshToken);
        
        if (!newTokens) {
          res.clearCookie('token');
          res.clearCookie('refreshToken');
          return res.status(401).json({ 
            error: 'Session expired',
            code: 'SESSION_EXPIRED'
          });
        }

        req.user = {
          id: user.id,
          role: user.role,
        };

        req.tokens = {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken
        };

        // Set new cookies
        const accessTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        res.cookie('token', newTokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: accessTokenExpires,
        });

        res.cookie('refreshToken', newTokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: refreshTokenExpires,
        });

        // Also set headers for non-cookie clients
        res.setHeader('X-Access-Token', newTokens.accessToken);
        res.setHeader('X-Refresh-Token', newTokens.refreshToken);

        return next();
      } catch (e) {
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        return res.status(401).json({ 
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
      }
    }

    try {
      // Try to verify the access token
      const decoded = await verifyToken(token);
      const user = await storage.getUser(decoded.id);
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid user session',
          code: 'INVALID_SESSION'
        });
      }

      req.user = {
        id: user.id,
        role: user.role,
      };

      next();
    } catch (e) {
      // If token verification fails, try refresh flow
      if (e instanceof jwt.TokenExpiredError) {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;
        
        if (!refreshToken) {
          return res.status(401).json({ 
            error: 'Session expired',
            code: 'SESSION_EXPIRED'
          });
        }

        try {
          // Verify refresh token using the refresh token verification function
          const refreshDecoded = await verifyRefreshToken(refreshToken);

          // Validate refresh token in storage or grace period
          const storedToken = await storage.getRefreshToken(refreshToken);
          const inGracePeriod = isTokenInGracePeriod(refreshToken);

          // Token must be in storage OR in grace period
          if (!storedToken && !inGracePeriod) {
            // Clear invalid cookies
            res.clearCookie('token');
            res.clearCookie('refreshToken');

            return res.status(401).json({
              error: 'Session expired. Please login again.',
              code: 'REFRESH_TOKEN_EXPIRED'
            });
          }

          // Check expiry only if token is in storage (grace period tokens are already validated)
          if (storedToken && new Date() > new Date(storedToken.expiresAt)) {
            // Clear invalid cookies
            res.clearCookie('token');
            res.clearCookie('refreshToken');

            return res.status(401).json({
              error: 'Session expired. Please login again.',
              code: 'REFRESH_TOKEN_EXPIRED'
            });
          }

          const user = await storage.getUser(refreshDecoded.id);
          if (!user) {
            return res.status(401).json({
              error: 'Invalid user session',
              code: 'INVALID_SESSION'
            });
          }

          // Use deduplicated refresh to prevent race conditions
          const { accessToken, refreshToken: newRefreshToken } = await refreshTokensWithDeduplication(
            user.id,
            refreshToken
          );

          // Set new cookies
          const accessTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: accessTokenExpires
          });

          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: refreshTokenExpires
          });

          // Also set headers for non-cookie clients
          res.setHeader('X-Access-Token', accessToken);
          res.setHeader('X-Refresh-Token', newRefreshToken);

          req.user = {
            id: user.id,
            role: user.role,
          };

          req.tokens = {
            accessToken,
            refreshToken: newRefreshToken
          };

          next();
        } catch (refreshError) {
          // Clear cookies on refresh failure
          res.clearCookie('token');
          res.clearCookie('refreshToken');
          
          return res.status(401).json({ 
            error: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED'
          });
        }
      } else {
        // Token is invalid for reasons other than expiration
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    next();
  });
};

export const requireTrainerOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'trainer') {
      return res.status(403).json({ 
        error: 'Trainer or admin access required',
        code: 'TRAINER_OR_ADMIN_REQUIRED'
      });
    }
    next();
  });
};

export const requireRole = (role: 'admin' | 'trainer' | 'customer') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
      if (req.user?.role !== role) {
        return res.status(403).json({ 
          error: `${role.charAt(0).toUpperCase() + role.slice(1)} access required`,
          code: 'ROLE_REQUIRED'
        });
      }
      next();
    });
  };
}; 