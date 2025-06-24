import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifyToken } from '../auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'admin' | 'trainer' | 'customer';
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required: No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded?.id) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

export const requireTrainerOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'trainer') {
      return res.status(403).json({ error: 'Trainer or admin access required' });
    }
    next();
  });
}; 