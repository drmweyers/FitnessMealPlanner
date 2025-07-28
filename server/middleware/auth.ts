import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifyToken, generateTokens } from '../auth';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user and tokens
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'admin' | 'trainer' | 'customer';
      };
      tokens?: {
        accessToken: string;
        refreshToken: string;
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    // If no token in header, try cookie
    if (!token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
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
          // Verify refresh token
          const refreshDecoded = await verifyToken(refreshToken);

          // Validate refresh token in storage
          const storedToken = await storage.getRefreshToken(refreshToken);
          if (!storedToken || new Date() > new Date(storedToken.expiresAt)) {
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

          // Generate new token pair
          const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

          // Store new refresh token
          const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          await storage.createRefreshToken(user.id, newRefreshToken, refreshTokenExpires);

          // Delete old refresh token
          await storage.deleteRefreshToken(refreshToken);

          // Set new cookies
          res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
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