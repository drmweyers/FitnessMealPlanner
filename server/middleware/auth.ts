import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { verifyToken } from '../auth';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required: No token provided' });
    }
    
    const token = authHeader.substring(7);
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

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Add user info to request
    req.user = { id: user.id, role: user.role };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
} 