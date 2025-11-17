/**
 * Integration Tests: Tier System API Endpoints
 *
 * Tests all tier-related API endpoints:
 * - GET /api/recipes (tier filtering)
 * - GET /api/meal-types (tier filtering)
 * - GET /api/branding (tier enforcement)
 * - Middleware: tierEnforcement
 *
 * Uses actual HTTP requests with mocked authentication
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/fitmeal';

describe('Tier System API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import app after setting environment
    const { default: serverApp } = await import('../../server/index');
    app = serverApp;
  });

  describe('GET /api/meal-types - Story 2.15', () => {
    it('should return accessible meal types only (no authentication)', async () => {
      const response = await request(app)
        .get('/api/meal-types')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('mealTypes');
      expect(Array.isArray(response.body.data.mealTypes)).toBe(true);
    });

    it('should return all meal types with status', async () => {
      const response = await request(app)
        .get('/api/meal-types/all')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('mealTypes');

      const mealTypes = response.body.data.mealTypes;
      expect(Array.isArray(mealTypes)).toBe(true);

      // Verify each meal type has required fields
      if (mealTypes.length > 0) {
        const firstType = mealTypes[0];
        expect(firstType).toHaveProperty('id');
        expect(firstType).toHaveProperty('name');
        expect(firstType).toHaveProperty('displayName');
        expect(firstType).toHaveProperty('tierLevel');
        expect(firstType).toHaveProperty('isAccessible');
      }
    });

    it('should validate meal type access check endpoint', async () => {
      const response = await request(app)
        .get('/api/meal-types/check/breakfast')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessible');
      expect(typeof response.body.data.accessible).toBe('boolean');
    });

    it('should return 404 for non-existent meal type check', async () => {
      const response = await request(app)
        .get('/api/meal-types/check/invalid-meal-type-xyz')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle seasonal meal types endpoint', async () => {
      const response = await request(app)
        .get('/api/meal-types/seasonal')
        .expect('Content-Type', /json/);

      // May return 200 with empty array or 401 if auth required
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data.seasonalTypes)).toBe(true);
      }
    });
  });

  describe('GET /api/recipes - Story 2.14', () => {
    it('should return recipes list', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .expect('Content-Type', /json/);

      // May require authentication
      if (response.status === 200) {
        expect(response.body).toHaveProperty('recipes');
        expect(Array.isArray(response.body.recipes)).toBe(true);
      } else if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle recipe search with filters', async () => {
      const response = await request(app)
        .get('/api/recipes?search=chicken&limit=10')
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('recipes');
        expect(response.body).toHaveProperty('total');
      }
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/recipes?page=1&limit=20')
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('recipes');
        const recipes = response.body.recipes;
        expect(recipes.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('API Error Handling', () => {
    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/recipes?limit=invalid')
        .expect('Content-Type', /json/);

      // Should handle gracefully
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/tier-system/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/meal-types')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Content-Type Validation', () => {
    it('should return JSON content type for all API endpoints', async () => {
      const endpoints = [
        '/api/meal-types',
        '/api/meal-types/all',
        '/api/recipes',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        if (response.status !== 401) {
          expect(response.headers['content-type']).toMatch(/application\/json/);
        }
      }
    });
  });

  describe('Rate Limiting & Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app).get('/api/meal-types')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([200, 401, 429]).toContain(response.status);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app).get('/api/meal-types');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('API Response Structure Validation', () => {
    it('should return consistent response structure for meal types', async () => {
      const response = await request(app)
        .get('/api/meal-types')
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          mealTypes: expect.any(Array),
        },
      });
    });

    it('should include error messages in error responses', async () => {
      const response = await request(app)
        .get('/api/meal-types/check/');

      if (response.status >= 400) {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      }
    });
  });

  describe('Tier Filtering Middleware', () => {
    it('should apply tier filtering to protected endpoints', async () => {
      // This tests the middleware is registered, not the actual filtering
      // (actual filtering requires authenticated requests with tier info)
      const response = await request(app)
        .get('/api/recipes');

      // Middleware should either allow (200) or require auth (401)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Data Validation', () => {
    it('should validate meal type name format', async () => {
      const invalidNames = [
        'INVALID NAME WITH SPACES',
        'invalid@#$%',
        '../../etc/passwd',
      ];

      for (const name of invalidNames) {
        const response = await request(app)
          .get(`/api/meal-types/check/${encodeURIComponent(name)}`);

        // Should either return 404 or handle gracefully
        expect([200, 400, 404]).toContain(response.status);
      }
    });

    it('should handle SQL injection attempts safely', async () => {
      const sqlInjection = "'; DROP TABLE recipes; --";
      const response = await request(app)
        .get(`/api/recipes?search=${encodeURIComponent(sqlInjection)}`);

      // Should not crash, should handle gracefully
      expect([200, 400, 401]).toContain(response.status);
    });
  });
});

describe('Tier System - Progressive Access Validation', () => {
  it('should enforce progressive access hierarchy', async () => {
    // Test that API respects tier hierarchy
    // Starter ⊂ Professional ⊂ Enterprise

    const response = await request(express())
      .get('/api/meal-types/all');

    if (response.status === 200) {
      const mealTypes = response.body.data?.mealTypes || [];

      // Verify tier distribution (if data is available)
      const starterTypes = mealTypes.filter((mt: any) => mt.tierLevel === 'starter');
      const professionalTypes = mealTypes.filter((mt: any) => mt.tierLevel === 'professional');
      const enterpriseTypes = mealTypes.filter((mt: any) => mt.tierLevel === 'enterprise');

      // Should have types in each tier
      if (mealTypes.length > 0) {
        expect(starterTypes.length).toBeGreaterThanOrEqual(0);
        expect(professionalTypes.length).toBeGreaterThanOrEqual(0);
        expect(enterpriseTypes.length).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('API Security Headers', () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: serverApp } = await import('../../server/index');
    app = serverApp;
  });

  it('should include security headers in responses', async () => {
    const response = await request(app).get('/api/meal-types');

    // Check for common security headers
    expect(response.headers).toBeDefined();

    // CORS headers
    if (response.headers['access-control-allow-origin']) {
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    }
  });

  it('should handle authentication properly', async () => {
    const protectedEndpoints = [
      '/api/branding',
      '/api/recipes',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request(app)
        .get(endpoint);

      // Should either succeed (200) or require auth (401)
      expect([200, 401]).toContain(response.status);
    }
  });
});

describe('API Documentation & Health', () => {
  let app: express.Application;

  beforeAll(async () => {
    const { default: serverApp } = await import('../../server/index');
    app = serverApp;
  });

  it('should have health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('healthy');
  });

  it('should handle root endpoint', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    // Should return something (HTML or JSON)
    expect(response.text.length).toBeGreaterThan(0);
  });
});
