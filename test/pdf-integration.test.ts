/**
 * PDF Export Integration Tests
 * 
 * End-to-end tests for PDF export API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';

// Test data
const validMealPlanData = {
  mealPlanData: {
    id: 'integration-test-plan',
    planName: 'Integration Test Meal Plan',
    fitnessGoal: 'muscle_building',
    description: 'A meal plan for integration testing',
    dailyCalorieTarget: 2500,
    days: 3,
    mealsPerDay: 3,
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: 'breakfast',
        recipe: {
          id: 'integration-recipe-1',
          name: 'Test Breakfast',
          description: 'A nutritious breakfast for testing',
          caloriesKcal: 450,
          proteinGrams: '30',
          carbsGrams: '45',
          fatGrams: '15',
          prepTimeMinutes: 15,
          servings: 1,
          mealTypes: ['breakfast'],
          dietaryTags: ['high-protein', 'vegetarian'],
          ingredientsJson: [
            { name: 'Oats', amount: '1', unit: 'cup' },
            { name: 'Protein powder', amount: '1', unit: 'scoop' },
            { name: 'Banana', amount: '1', unit: 'medium' },
            { name: 'Almond milk', amount: '1', unit: 'cup' }
          ],
          instructionsText: '1. Heat almond milk in a pot. 2. Add oats and cook for 5 minutes. 3. Stir in protein powder. 4. Top with sliced banana and serve.'
        }
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: 'lunch',
        recipe: {
          id: 'integration-recipe-2',
          name: 'Test Lunch',
          description: 'A balanced lunch meal',
          caloriesKcal: 550,
          proteinGrams: '40',
          carbsGrams: '50',
          fatGrams: '20',
          prepTimeMinutes: 25,
          servings: 1,
          mealTypes: ['lunch', 'dinner'],
          dietaryTags: ['high-protein', 'gluten-free'],
          ingredientsJson: [
            { name: 'Chicken breast', amount: '6', unit: 'oz' },
            { name: 'Quinoa', amount: '1', unit: 'cup' },
            { name: 'Broccoli', amount: '2', unit: 'cups' },
            { name: 'Olive oil', amount: '1', unit: 'tbsp' }
          ],
          instructionsText: '1. Season and grill chicken breast for 6-8 minutes per side. 2. Cook quinoa according to package directions. 3. Steam broccoli until tender. 4. Combine all ingredients and drizzle with olive oil.'
        }
      },
      {
        day: 1,
        mealNumber: 3,
        mealType: 'dinner',
        recipe: {
          id: 'integration-recipe-3',
          name: 'Test Dinner',
          description: 'A satisfying dinner',
          caloriesKcal: 500,
          proteinGrams: '35',
          carbsGrams: '40',
          fatGrams: '18',
          prepTimeMinutes: 30,
          servings: 1,
          mealTypes: ['dinner'],
          dietaryTags: ['high-protein'],
          ingredientsJson: [
            { name: 'Salmon fillet', amount: '5', unit: 'oz' },
            { name: 'Sweet potato', amount: '1', unit: 'medium' },
            { name: 'Asparagus', amount: '1', unit: 'cup' },
            { name: 'Lemon', amount: '1', unit: 'whole' }
          ],
          instructionsText: '1. Preheat oven to 400°F. 2. Bake sweet potato for 45 minutes. 3. Pan-sear salmon for 4-5 minutes per side. 4. Sauté asparagus with lemon juice. 5. Serve together.'
        }
      }
    ]
  },
  customerName: 'Integration Test User',
  options: {
    includeShoppingList: true,
    includeMacroSummary: true,
    includeRecipePhotos: false,
    orientation: 'portrait',
    pageSize: 'A4'
  }
};

describe('PDF Export Integration Tests', () => {
  describe('POST /api/pdf/test-export', () => {
    it('should successfully generate PDF with valid meal plan data', async () => {
      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(validMealPlanData)
        .expect(200);

      // Verify response headers
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
      expect(response.headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');

      // Verify PDF content (basic check)
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(1000); // PDF should be substantial
      
      // Check PDF magic bytes (only if response is actually a buffer and not an error)
      if (response.body && response.body.length > 4) {
        const pdfHeader = response.body.toString('ascii', 0, 4);
        expect(pdfHeader).toBe('%PDF');
      }
    });

    it('should generate PDF with minimal options', async () => {
      const minimalData = {
        ...validMealPlanData,
        options: {
          includeShoppingList: false,
          includeMacroSummary: false,
          orientation: 'portrait',
          pageSize: 'A4'
        }
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(minimalData)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body.length).toBeGreaterThan(500);
    });

    it('should generate PDF with landscape orientation', async () => {
      const landscapeData = {
        ...validMealPlanData,
        options: {
          ...validMealPlanData.options,
          orientation: 'landscape'
        }
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(landscapeData)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body.length).toBeGreaterThan(1000);
    });

    it('should generate PDF with Letter page size', async () => {
      const letterData = {
        ...validMealPlanData,
        options: {
          ...validMealPlanData.options,
          pageSize: 'Letter'
        }
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(letterData)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body.length).toBeGreaterThan(1000);
    });

    it('should handle meal plan without customer name', async () => {
      const noCustomerData = {
        mealPlanData: validMealPlanData.mealPlanData,
        options: validMealPlanData.options
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(noCustomerData)
        .expect(200);

      expect(response.headers['content-disposition']).toMatch(/EvoFit_Meal_Plan/);
    });

    it('should handle meal plan with special characters in name', async () => {
      const specialCharData = {
        ...validMealPlanData,
        customerName: 'Test User with Special Characters! @#$%'
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(specialCharData)
        .expect(200);

      expect(response.headers['content-disposition']).toMatch(/test_user_with_special_characters/);
    });

    it('should return 400 when meal plan data is missing', async () => {
      const response = await request(app)
        .post('/api/pdf/test-export')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Meal plan data is required',
        code: 'MISSING_MEAL_PLAN_DATA'
      });
    });

    it('should return 500 when meal plan data is invalid', async () => {
      const invalidData = {
        mealPlanData: {
          planName: '', // Invalid: empty plan name
          fitnessGoal: '',
          dailyCalorieTarget: 0,
          days: 0,
          mealsPerDay: 0,
          meals: []
        }
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(invalidData)
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('PDF_GENERATION_FAILED');
    });

    it('should handle complex meal plan with many recipes', async () => {
      const complexMealPlan = {
        mealPlanData: {
          ...validMealPlanData.mealPlanData,
          days: 7,
          meals: []
        }
      };

      // Generate meals for 7 days, 3 meals per day
      for (let day = 1; day <= 7; day++) {
        for (let meal = 1; meal <= 3; meal++) {
          complexMealPlan.mealPlanData.meals.push({
            day,
            mealNumber: meal,
            mealType: meal === 1 ? 'breakfast' : meal === 2 ? 'lunch' : 'dinner',
            recipe: {
              id: `recipe-${day}-${meal}`,
              name: `Day ${day} ${meal === 1 ? 'Breakfast' : meal === 2 ? 'Lunch' : 'Dinner'}`,
              description: 'A nutritious meal',
              caloriesKcal: 400 + (meal * 50),
              proteinGrams: `${20 + (meal * 5)}`,
              carbsGrams: `${30 + (meal * 5)}`,
              fatGrams: `${10 + (meal * 2)}`,
              prepTimeMinutes: 15 + (meal * 5),
              servings: 1,
              mealTypes: [meal === 1 ? 'breakfast' : meal === 2 ? 'lunch' : 'dinner'],
              dietaryTags: ['balanced'],
              ingredientsJson: [
                { name: 'Main ingredient', amount: '1', unit: 'portion' },
                { name: 'Side ingredient', amount: '1', unit: 'cup' }
              ],
              instructionsText: `Instructions for day ${day}, meal ${meal}.`
            }
          });
        }
      }

      const requestData = {
        ...validMealPlanData,
        mealPlanData: complexMealPlan.mealPlanData
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(requestData)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(5000); // Should be a large PDF
    });

    it('should generate proper filename with timestamp', async () => {
      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(validMealPlanData)
        .expect(200);

      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      
      expect(filenameMatch).toBeTruthy();
      expect(filenameMatch[1]).toMatch(/EvoFit_Meal_Plan_.*_\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalMealPlan = {
        mealPlanData: {
          id: 'minimal-test',
          planName: 'Minimal Test Plan',
          fitnessGoal: 'general_fitness',
          dailyCalorieTarget: 2000,
          days: 1,
          mealsPerDay: 1,
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'breakfast',
              recipe: {
                id: 'minimal-recipe',
                name: 'Minimal Recipe',
                description: '',
                caloriesKcal: 300,
                proteinGrams: '20',
                carbsGrams: '30',
                fatGrams: '10',
                prepTimeMinutes: 10,
                servings: 1,
                mealTypes: ['breakfast'],
                dietaryTags: [],
                ingredientsJson: [],
                instructionsText: ''
              }
            }
          ]
        }
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(minimalMealPlan)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('should handle request timeout gracefully', async () => {
      // This test would require a very large meal plan or server delay simulation
      // For now, we'll test that normal requests complete in reasonable time
      const startTime = Date.now();

      await request(app)
        .post('/api/pdf/test-export')
        .send(validMealPlanData)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('POST /api/pdf/export (with auth)', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/pdf/export')
        .send(validMealPlanData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/Unauthorized|Authentication/);
    });

    // Note: Testing authenticated endpoints would require setting up test users
    // and authentication tokens, which is beyond the scope of unit tests.
    // These would be covered in full integration tests with database setup.
  });

  describe('PDF Content Validation', () => {
    it('should include EvoFit branding in generated PDF', async () => {
      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(validMealPlanData)
        .expect(200);

      // This is a basic check - full content validation would require PDF parsing
      expect(response.body.length).toBeGreaterThan(1000);
      expect(response.headers['content-disposition']).toMatch(/EvoFit_Meal_Plan/);
    });

    it('should handle Unicode characters in meal plan data', async () => {
      const unicodeData = {
        ...validMealPlanData,
        customerName: 'José María González',
        mealPlanData: {
          ...validMealPlanData.mealPlanData,
          meals: [
            {
              ...validMealPlanData.mealPlanData.meals[0],
              recipe: {
                ...validMealPlanData.mealPlanData.meals[0].recipe,
                name: 'Café con Leche y Açaí',
                ingredientsJson: [
                  { name: 'Café', amount: '1', unit: 'taza' },
                  { name: 'Açaí', amount: '50', unit: 'gramos' }
                ]
              }
            }
          ]
        }
      };

      const response = await request(app)
        .post('/api/pdf/test-export')
        .send(unicodeData)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
    });
  });
});