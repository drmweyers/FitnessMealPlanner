import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../shared/schema';

// Validate JWT_SECRET is present and strong
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('🚨 SECURITY ERROR: JWT_SECRET must be provided and at least 32 characters long');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : 12;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

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

export async function hashPassword(password: string): Promise<string> {
  if (!isStrongPassword(password)) {
    throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User, expiresIn: string): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000), // issued at
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
    issuer: 'FitnessMealPlanner',
    audience: 'FitnessMealPlanner-Client'
  } as SignOptions);
}

export function generateTokens(user: User): { accessToken: string, refreshToken: string } {
    const accessToken = generateToken(user, ACCESS_TOKEN_EXPIRY);
    
    // Generate refresh token with different secret if available
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
    
    return { accessToken, refreshToken };
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'FitnessMealPlanner',
      audience: 'FitnessMealPlanner-Client'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'FitnessMealPlanner',
      audience: 'FitnessMealPlanner-Refresh'
    });
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
} 