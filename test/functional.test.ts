import { describe, it, expect } from 'vitest';

describe('Application Functional Tests', () => {
  describe('Recipe API Functionality', () => {
    it('should validate API endpoints are working', async () => {
      const response = await fetch('http://localhost:5000/api/recipes?limit=1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('recipes');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.recipes)).toBe(true);
    });

    it('should validate filtering functionality', async () => {
      const response = await fetch('http://localhost:5000/api/recipes?minCalories=300&maxCalories=400');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      if (data.recipes.length > 0) {
        data.recipes.forEach((recipe: any) => {
          expect(recipe.caloriesKcal).toBeGreaterThanOrEqual(300);
          expect(recipe.caloriesKcal).toBeLessThanOrEqual(400);
        });
      }
    });

    it('should validate authentication protection', async () => {
      const response = await fetch('http://localhost:5000/api/admin/recipes');
      expect(response.status).toBe(401);
    });

    it('should validate input validation', async () => {
      const response = await fetch('http://localhost:5000/api/recipes?minCalories=invalid');
      expect(response.status).toBe(400);
    });
  });
});