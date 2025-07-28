import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../shared/schema';

console.log('JWT_SECRET in use:', process.env.JWT_SECRET);

// Use environment variables with strong defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
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
  };
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: expiresIn
  } as SignOptions);
}

export function generateTokens(user: User): { accessToken: string, refreshToken: string } {
    const accessToken = generateToken(user, ACCESS_TOKEN_EXPIRY);
    const refreshToken = generateToken(user, REFRESH_TOKEN_EXPIRY);
    return { accessToken, refreshToken };
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
} 