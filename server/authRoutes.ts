import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { storage } from './storage';
import { hashPassword, comparePasswords, generateTokens, verifyToken } from './auth';
import { users } from '../shared/schema';
import crypto from 'crypto';

const authRouter = Router();

// Enhanced registration schema with stronger validation
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['admin', 'trainer', 'customer']),
});

// Rate limiting for failed attempts (implement proper rate limiting middleware in production)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkLoginAttempts(email: string): boolean {
  const attempts = loginAttempts.get(email);
  if (!attempts) return true;
  
  if (Date.now() - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(email);
    return true;
  }
  
  return attempts.count < MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(email: string) {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: Date.now() };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
}

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);

    // Check for existing user
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        status: 'error',
        message: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // For admin registration, require an existing admin token
    if (role === 'admin') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ 
          status: 'error',
          message: 'Admin registration requires authorization',
          code: 'ADMIN_AUTH_REQUIRED'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ 
          status: 'error',
          message: 'Only existing admins can create new admin accounts',
          code: 'ADMIN_ONLY'
        });
      }
    }

    const hashedPassword = await hashPassword(password);
    
    const newUser = await storage.createUser({
      email,
      password: hashedPassword,
      role,
    });

    const { accessToken, refreshToken } = generateTokens(newUser);
    
    const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await storage.createRefreshToken(newUser.id, refreshToken, refreshTokenExpires);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: refreshTokenExpires,
    });

    res.status(201).json({ 
      status: 'success',
      data: {
        accessToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        status: 'error',
        message: fromZodError(error).toString(),
        code: 'VALIDATION_ERROR'
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Check login attempts
    if (!checkLoginAttempts(email)) {
      return res.status(429).json({ 
        status: 'error',
        message: 'Too many failed attempts. Please try again later.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      recordLoginAttempt(email);
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      recordLoginAttempt(email);
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Reset login attempts on successful login
    loginAttempts.delete(email);

    const { accessToken, refreshToken } = generateTokens(user);

    const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await storage.createRefreshToken(user.id, refreshToken, refreshTokenExpires);

    const accessTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Set the main access token as a secure, HttpOnly cookie
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'lax' for better cross-site dev compatibility
      expires: accessTokenExpires,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'lax' for better cross-site dev compatibility
      expires: refreshTokenExpires,
    });

    res.json({ 
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        status: 'error',
        message: fromZodError(error).toString(),
        code: 'VALIDATION_ERROR'
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

authRouter.post('/refresh_token', async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res.status(401).json({ status: 'error', message: 'Refresh token not found', code: 'NO_REFRESH_TOKEN' });
  }

  try {
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ status: 'error', message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    const storedToken = await storage.getRefreshToken(refreshToken);
    if (!storedToken) {
      return res.status(403).json({ status: 'error', message: 'Refresh token not found in store', code: 'INVALID_REFRESH_TOKEN' });
    }

    if (new Date() > new Date(storedToken.expiresAt)) {
        await storage.deleteRefreshToken(refreshToken);
        return res.status(403).json({ status: 'error', message: 'Refresh token expired', code: 'EXPIRED_REFRESH_TOKEN' });
    }

    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const { accessToken } = generateTokens(user);

    res.json({
      status: 'success',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
        await storage.deleteRefreshToken(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'admin' | 'trainer' | 'customer';
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }

  req.user = decoded;
  next();
}

export function requireRole(role: 'admin' | 'trainer' | 'customer') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    requireAuth(req, res, () => {
        requireRole('admin')(req, res, next);
    });
}

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

export default authRouter;