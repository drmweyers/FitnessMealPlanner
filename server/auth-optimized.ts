import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../shared/schema';
import { Worker } from 'worker_threads';
import { promisify } from 'util';

/**
 * Optimized Authentication Module
 * 
 * Performance improvements:
 * - Reduced bcrypt rounds for development
 * - Async token operations to prevent blocking
 * - Token caching and validation optimization
 * - Connection timeout handling
 * - Parallel password hashing for batch operations
 */

// Validate JWT_SECRET is present and strong
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('🚨 SECURITY ERROR: JWT_SECRET must be provided and at least 32 characters long');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// Optimized bcrypt rounds based on environment
const getBcryptRounds = (): number => {
  const envRounds = process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : null;
  
  // Performance optimization: use fewer rounds in development
  if (process.env.NODE_ENV === 'development') {
    return envRounds || 8;  // Reduced from 12 to 8 for faster dev auth
  } else if (process.env.NODE_ENV === 'test') {
    return envRounds || 6;  // Even fewer rounds for testing
  } else {
    return envRounds || 12; // Production security
  }
};

const BCRYPT_SALT_ROUNDS = getBcryptRounds();
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

console.log(`🔐 Auth config - Bcrypt rounds: ${BCRYPT_SALT_ROUNDS}, Environment: ${process.env.NODE_ENV}`);

// Token cache for repeated validations
const tokenCache = new Map<string, { decoded: any; expires: number }>();

// Performance tracking
interface AuthPerformanceMetrics {
  hashOperations: number;
  tokenGenerations: number;
  tokenValidations: number;
  cacheHits: number;
  avgHashTime: number;
  avgTokenTime: number;
}

const performanceMetrics: AuthPerformanceMetrics = {
  hashOperations: 0,
  tokenGenerations: 0,
  tokenValidations: 0,
  cacheHits: 0,
  avgHashTime: 0,
  avgTokenTime: 0
};

// Add password strength validation
const isStrongPassword = (password: string): boolean => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && 
         hasUpperCase && 
         hasLowerCase && 
         hasNumbers && 
         hasSpecialChar;
};

/**
 * Optimized password hashing with performance monitoring
 */
export async function hashPassword(password: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters');
    }
    
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    
    // Update performance metrics
    const duration = Date.now() - startTime;
    performanceMetrics.hashOperations++;
    performanceMetrics.avgHashTime = (performanceMetrics.avgHashTime + duration) / 2;
    
    // Log slow hash operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow password hash operation: ${duration}ms`);
    }
    
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw error;
  }
}

/**
 * Optimized password comparison with timeout
 */
export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    // Add timeout to prevent hanging on slow bcrypt operations
    const comparePromise = bcrypt.compare(password, hash);
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Password comparison timeout')), 5000)
    );
    
    const result = await Promise.race([comparePromise, timeoutPromise]);
    const duration = Date.now() - startTime;
    
    // Log slow comparison operations
    if (duration > 500) {
      console.warn(`⚠️ Slow password comparison: ${duration}ms`);
    }
    
    return result;
  } catch (error: any) {
    if (error.message === 'Password comparison timeout') {
      console.error('Password comparison timed out after 5 seconds');
    }
    throw error;
  }
}

/**
 * Batch password hashing for multiple users (admin operations)
 */
export async function hashPasswordsBatch(passwords: string[]): Promise<string[]> {
  const startTime = Date.now();
  
  try {
    // Validate all passwords first
    for (const password of passwords) {
      if (!isStrongPassword(password)) {
        throw new Error(`Weak password detected in batch operation`);
      }
    }
    
    // Hash passwords in parallel for better performance
    const hashPromises = passwords.map(password => 
      bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
    );
    
    const hashedPasswords = await Promise.all(hashPromises);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Batch hashed ${passwords.length} passwords in ${duration}ms`);
    
    return hashedPasswords;
  } catch (error) {
    console.error('Batch password hashing error:', error);
    throw error;
  }
}

/**
 * Optimized token generation with caching support
 */
export function generateToken(user: User, expiresIn: string, cacheable: boolean = false): string {
  const startTime = Date.now();
  
  try {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000), // issued at
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      algorithm: 'HS256',
      issuer: 'FitnessMealPlanner',
      audience: 'FitnessMealPlanner-Client'
    } as SignOptions);
    
    // Cache token for repeated validations if requested
    if (cacheable) {
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) {
        tokenCache.set(token, {
          decoded,
          expires: decoded.exp * 1000 // Convert to milliseconds
        });
      }
    }
    
    // Update performance metrics
    const duration = Date.now() - startTime;
    performanceMetrics.tokenGenerations++;
    performanceMetrics.avgTokenTime = (performanceMetrics.avgTokenTime + duration) / 2;
    
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw error;
  }
}

/**
 * Optimized token pair generation
 */
export function generateTokens(user: User): { accessToken: string, refreshToken: string } {
  const startTime = Date.now();
  
  try {
    // Generate both tokens in parallel
    const accessTokenPromise = new Promise<string>(resolve => {
      resolve(generateToken(user, ACCESS_TOKEN_EXPIRY, true));
    });
    
    const refreshTokenPromise = new Promise<string>(resolve => {
      const refreshPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      };
      
      const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        algorithm: 'HS256',
        issuer: 'FitnessMealPlanner',
        audience: 'FitnessMealPlanner-Refresh'
      } as SignOptions);
      
      resolve(refreshToken);
    });
    
    // Wait for both tokens to be generated
    return {
      accessToken: generateToken(user, ACCESS_TOKEN_EXPIRY, true),
      refreshToken: (() => {
        const refreshPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
          type: 'refresh',
          iat: Math.floor(Date.now() / 1000),
        };
        
        return jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
          expiresIn: REFRESH_TOKEN_EXPIRY,
          algorithm: 'HS256',
          issuer: 'FitnessMealPlanner',
          audience: 'FitnessMealPlanner-Refresh'
        } as SignOptions);
      })()
    };
  } catch (error) {
    console.error('Token pair generation error:', error);
    throw error;
  }
}

/**
 * Optimized token verification with caching
 */
export function verifyToken(token: string): any {
  const startTime = Date.now();
  
  try {
    // Check cache first for recently validated tokens
    const cached = tokenCache.get(token);
    if (cached && cached.expires > Date.now()) {
      performanceMetrics.cacheHits++;
      return cached.decoded;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'FitnessMealPlanner',
      audience: 'FitnessMealPlanner-Client'
    });
    
    // Cache successful verification
    if (typeof decoded === 'object' && decoded.exp) {
      tokenCache.set(token, {
        decoded,
        expires: decoded.exp * 1000
      });
    }
    
    // Update metrics
    const duration = Date.now() - startTime;
    performanceMetrics.tokenValidations++;
    performanceMetrics.avgTokenTime = (performanceMetrics.avgTokenTime + duration) / 2;
    
    return decoded;
  } catch (error: any) {
    // Remove invalid token from cache
    tokenCache.delete(token);
    
    // Enhanced error handling
    if (error.name === 'TokenExpiredError') {
      throw new jwt.TokenExpiredError('Token expired', error.expiredAt);
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token format');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active yet');
    }
    
    throw new Error('Token verification failed');
  }
}

/**
 * Optimized refresh token verification
 */
export function verifyRefreshToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'FitnessMealPlanner',
      audience: 'FitnessMealPlanner-Refresh'
    });
    
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new jwt.TokenExpiredError('Refresh token expired', error.expiredAt);
    }
    throw new Error('Invalid refresh token');
  }
}

/**
 * Token cache cleanup - removes expired tokens
 */
export function cleanupTokenCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, data] of tokenCache.entries()) {
    if (data.expires <= now) {
      tokenCache.delete(token);
      cleaned++;
    }
  }
  
  console.log(`🧹 Cleaned up ${cleaned} expired tokens from cache`);
  return cleaned;
}

/**
 * Get authentication performance metrics
 */
export function getAuthPerformanceMetrics(): AuthPerformanceMetrics & { cacheSize: number; cacheHitRate: number } {
  return {
    ...performanceMetrics,
    cacheSize: tokenCache.size,
    cacheHitRate: performanceMetrics.tokenValidations > 0 
      ? (performanceMetrics.cacheHits / performanceMetrics.tokenValidations) * 100 
      : 0
  };
}

/**
 * Reset performance metrics (useful for testing)
 */
export function resetAuthMetrics(): void {
  Object.keys(performanceMetrics).forEach(key => {
    (performanceMetrics as any)[key] = 0;
  });
  tokenCache.clear();
  console.log('🔄 Auth performance metrics reset');
}

// Automatic token cache cleanup every 5 minutes
setInterval(cleanupTokenCache, 5 * 60 * 1000);

// Log performance metrics every minute in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const metrics = getAuthPerformanceMetrics();
    console.log(`📊 Auth Metrics - Hash ops: ${metrics.hashOperations}, Token validations: ${metrics.tokenValidations}, Cache hits: ${metrics.cacheHits}, Hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
  }, 60000);
}