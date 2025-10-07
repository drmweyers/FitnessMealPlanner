/**
 * Authentication Test Helpers
 * 
 * Provides utilities for testing authentication in unit tests.
 * This module contains helper functions to create JWT tokens and
 * authenticate requests properly in test environments.
 */

import jwt from 'jsonwebtoken';

/**
 * Test user interface for authentication
 */
export interface TestUser {
  id: string;
  email: string;
  role: 'admin' | 'trainer' | 'customer';
  name?: string;
}

/**
 * Creates a valid JWT token for testing
 * @param user - User object containing id, email, and role
 * @param secret - JWT secret (defaults to test secret)
 * @returns Valid JWT token string
 */
export function createTestToken(user: TestUser, secret: string = 'test-jwt-secret'): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, secret, {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'FitnessMealPlanner',
    audience: 'FitnessMealPlanner-Client'
  });
}

/**
 * Default test users for common scenarios
 */
export const TEST_USERS = {
  admin: {
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'admin' as const,
    name: 'Test Admin'
  },
  trainer: {
    id: 'trainer-123',
    email: 'trainer@test.com',
    role: 'trainer' as const,
    name: 'Test Trainer'
  },
  customer: {
    id: 'customer-123',
    email: 'customer@test.com',
    role: 'customer' as const,
    name: 'Test Customer'
  }
};

/**
 * Creates authentication header for supertest requests
 * @param user - User to authenticate as
 * @param secret - JWT secret (defaults to test secret)
 * @returns Object with Authorization header
 */
export function createAuthHeader(user: TestUser, secret: string = 'test-jwt-secret') {
  const token = createTestToken(user, secret);
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Verifies a test token and returns decoded payload
 * @param token - JWT token to verify
 * @param secret - JWT secret (defaults to test secret)
 * @returns Decoded token payload
 */
export function verifyTestToken(token: string, secret: string = 'test-jwt-secret') {
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'FitnessMealPlanner',
    audience: 'FitnessMealPlanner-Client'
  });
}