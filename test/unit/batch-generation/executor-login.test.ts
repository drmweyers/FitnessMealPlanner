import { describe, it, expect } from 'vitest';
import { extractToken } from '../../../scripts/batch-utils/auth-helpers';

describe('batch-generation: executor-login', () => {
  it('extracts token from new format: { data: { accessToken } }', () => {
    const response = { status: 'success', data: { accessToken: 'tok_abc123' } };
    expect(extractToken(response)).toBe('tok_abc123');
  });

  it('extracts token from legacy format: { token }', () => {
    const response = { token: 'tok_legacy456' };
    expect(extractToken(response)).toBe('tok_legacy456');
  });

  it('throws when no token found in response', () => {
    const response = { status: 'error', message: 'Invalid credentials' };
    expect(() => extractToken(response)).toThrow('No token');
  });

  it('prefers data.accessToken over top-level token', () => {
    const response = { token: 'old', data: { accessToken: 'new' } };
    expect(extractToken(response)).toBe('new');
  });

  it('handles null/undefined response gracefully', () => {
    expect(() => extractToken(null)).toThrow();
    expect(() => extractToken(undefined)).toThrow();
  });
});
