/**
 * Core PDF Export Functionality Tests
 *
 * Direct unit tests for the PDF export utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pdfExport from '@/utils/pdfExport';
import jsPDF from 'jspdf';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockAddPage = vi.fn();
const mockRect = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFont = vi.fn();
const mockSetLineWidth = vi.fn();

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    text: mockText,
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    addPage: mockAddPage,
    rect: mockRect,
    setDrawColor: mockSetDrawColor,
    setFillColor: mockSetFillColor,
    setTextColor: mockSetTextColor,
    setLineWidth: mockSetLineWidth,
    save: mockSave,
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297)
      }
    }
  }))
}));

describe('PDF Export Core Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractRecipeCardsFromMealPlan', () => {
    it('should extract recipe data correctly from meal plan', () => {
      const mealPlan = {
        planName: 'Test Plan',
        fitnessGoal: 'Weight Loss',
        dailyCalorieTarget: 2000,
        days: 7,
        clientName: 'Test Client',
        generatedBy: 'Trainer',
        createdAt: new Date('2024-01-01'),
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Breakfast',
            recipe: {
              name: 'Protein Pancakes',
              description: 'Delicious protein pancakes',
              caloriesKcal: 350,
              proteinGrams: '25',
              carbsGrams: '30',
              fatGrams: '10',
              prepTimeMinutes: 15,
              servings: 2,
              dietaryTags: ['High Protein'],
              ingredientsJson: [
                { name: 'Oats', amount: '1', unit: 'cup' },
                { name: 'Eggs', amount: '2', unit: '' }
              ],
              instructionsText: 'Mix and cook'
            }
          }
        ]
      };

      const result = pdfExport.extractRecipeCardsFromMealPlan(mealPlan);

      expect(result.planName).toBe('Test Plan');
      expect(result.fitnessGoal).toBe('Weight Loss');
      expect(result.dailyCalorieTarget).toBe(2000);
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].recipeName).toBe('Protein Pancakes');
      expect(result.recipes[0].calories).toBe(350);
    });

    it('should handle meal plans with nested mealPlanData', () => {
      const mealPlan = {
        mealPlanData: {
          planName: 'Nested Plan',
          fitnessGoal: 'Muscle Gain',
          dailyCalorieTarget: 3000,
          days: 5
        },
        meals: []
      };

      const result = pdfExport.extractRecipeCardsFromMealPlan(mealPlan);

      expect(result.planName).toBe('Nested Plan');
      expect(result.fitnessGoal).toBe('Muscle Gain');
      expect(result.dailyCalorieTarget).toBe(3000);
      expect(result.days).toBe(5);
    });

    it('should use fallback values when data is missing', () => {
      const mealPlan = {
        meals: []
      };

      const result = pdfExport.extractRecipeCardsFromMealPlan(mealPlan);

      expect(result.planName).toBe('Meal Plan');
      expect(result.fitnessGoal).toBe('General Fitness');
      expect(result.dailyCalorieTarget).toBe(0);
      expect(result.days).toBe(7);
    });

    it('should handle empty ingredients gracefully', () => {
      const mealPlan = {
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Lunch',
            recipe: {
              name: 'Simple Salad',
              caloriesKcal: 200,
              proteinGrams: '10',
              carbsGrams: '20',
              fatGrams: '5',
              prepTimeMinutes: 10,
              servings: 1,
              ingredientsJson: null,
              instructionsText: 'Toss together'
            }
          }
        ]
      };

      const result = pdfExport.extractRecipeCardsFromMealPlan(mealPlan);

      expect(result.recipes[0].ingredients).toEqual([]);
    });
  });

  describe('exportSingleMealPlanToPDF', () => {
    it('should export a single meal plan to PDF', async () => {
      const mealPlan = {
        planName: 'Test Export Plan',
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Breakfast',
            recipe: {
              name: 'Test Recipe',
              caloriesKcal: 300,
              proteinGrams: '20',
              carbsGrams: '30',
              fatGrams: '10',
              prepTimeMinutes: 20,
              servings: 1,
              ingredientsJson: []
            }
          }
        ]
      };

      await pdfExport.exportSingleMealPlanToPDF(mealPlan);

      // Check PDF was created and saved
      expect(mockSave).toHaveBeenCalled();
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Test Export Plan'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should use provided options for PDF generation', async () => {
      const mealPlan = {
        planName: 'Options Test Plan',
        meals: []
      };

      await pdfExport.exportSingleMealPlanToPDF(mealPlan, {
        includeNutrition: false,
        cardSize: 'small'
      });

      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle PDF generation errors gracefully', async () => {
      mockSave.mockImplementationOnce(() => {
        throw new Error('PDF save failed');
      });

      const mealPlan = {
        planName: 'Error Test Plan',
        meals: []
      };

      await expect(
        pdfExport.exportSingleMealPlanToPDF(mealPlan)
      ).rejects.toThrow('Failed to export meal plan to PDF');
    });
  });

  describe('exportMultipleMealPlansToPDF', () => {
    it('should export multiple meal plans to a single PDF', async () => {
      const mealPlans = [
        {
          planName: 'Plan 1',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'Breakfast',
              recipe: {
                name: 'Recipe 1',
                caloriesKcal: 250,
                proteinGrams: '15',
                carbsGrams: '25',
                fatGrams: '8',
                prepTimeMinutes: 15,
                servings: 1,
                ingredientsJson: []
              }
            }
          ]
        },
        {
          planName: 'Plan 2',
          meals: [
            {
              day: 1,
              mealNumber: 1,
              mealType: 'Lunch',
              recipe: {
                name: 'Recipe 2',
                caloriesKcal: 350,
                proteinGrams: '25',
                carbsGrams: '35',
                fatGrams: '12',
                prepTimeMinutes: 25,
                servings: 2,
                ingredientsJson: []
              }
            }
          ]
        }
      ];

      await pdfExport.exportMultipleMealPlansToPDF(mealPlans);

      // Should save once at the end
      expect(mockSave).toHaveBeenCalledTimes(1);

      // Should add text for collection title
      expect(mockText).toHaveBeenCalledWith(
        'Recipe Collection',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );

      // Should add pages for multiple plans
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('should include customer name when provided', async () => {
      const mealPlans = [
        {
          planName: 'Customer Plan',
          meals: []
        }
      ];

      await pdfExport.exportMultipleMealPlansToPDF(mealPlans, {
        customerName: 'John Doe'
      });

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('John Doe'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle empty meal plans array', async () => {
      await pdfExport.exportMultipleMealPlansToPDF([]);

      // Should still create a PDF even with no plans
      expect(mockSave).toHaveBeenCalled();
    });

    it('should respect card size options', async () => {
      const mealPlans = [
        {
          planName: 'Size Test',
          meals: Array(10).fill(null).map((_, i) => ({
            day: Math.floor(i / 3) + 1,
            mealNumber: (i % 3) + 1,
            mealType: ['Breakfast', 'Lunch', 'Dinner'][i % 3],
            recipe: {
              name: `Recipe ${i}`,
              caloriesKcal: 300,
              proteinGrams: '20',
              carbsGrams: '30',
              fatGrams: '10',
              prepTimeMinutes: 20,
              servings: 1,
              ingredientsJson: []
            }
          }))
        }
      ];

      await pdfExport.exportMultipleMealPlansToPDF(mealPlans, {
        cardSize: 'large'
      });

      // With large cards and multiple recipes, should add pages
      expect(mockAddPage).toHaveBeenCalled();
    });

    it('should generate safe filenames', async () => {
      const mealPlans = [
        {
          planName: 'Plan/with\\special*chars?',
          meals: []
        }
      ];

      await pdfExport.exportMultipleMealPlansToPDF(mealPlans, {
        customerName: 'Customer/with*special'
      });

      // Filename should be sanitized
      const saveCall = mockSave.mock.calls[0][0];
      expect(saveCall).not.toMatch(/[\/\\*?]/);
      expect(saveCall).toContain('customer_with_special');
    });
  });

  describe('Recipe Card Drawing', () => {
    it('should include all recipe information when space allows', async () => {
      const mealPlan = {
        planName: 'Detailed Recipe Plan',
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Breakfast',
            recipe: {
              name: 'Complete Recipe',
              description: 'A complete recipe with all details',
              caloriesKcal: 400,
              proteinGrams: '30',
              carbsGrams: '40',
              fatGrams: '15',
              prepTimeMinutes: 30,
              servings: 2,
              dietaryTags: ['High Protein', 'Low Sugar', 'Gluten Free'],
              ingredientsJson: [
                { name: 'Chicken', amount: '200', unit: 'g' },
                { name: 'Rice', amount: '100', unit: 'g' },
                { name: 'Vegetables', amount: '150', unit: 'g' }
              ],
              instructionsText: 'Cook everything properly'
            }
          }
        ]
      };

      await pdfExport.exportSingleMealPlanToPDF(mealPlan, {
        cardSize: 'large',
        includeNutrition: true
      });

      // Check that nutrition info is included
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('NUTRITION'),
        expect.any(Number),
        expect.any(Number)
      );

      // Check that ingredients are included
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('INGREDIENTS'),
        expect.any(Number),
        expect.any(Number)
      );

      // Check dietary tags are included
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('High Protein'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should truncate long recipe names', async () => {
      const mealPlan = {
        planName: 'Long Name Plan',
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Lunch',
            recipe: {
              name: 'This is a very long recipe name that should be truncated for display purposes',
              caloriesKcal: 300,
              proteinGrams: '20',
              carbsGrams: '30',
              fatGrams: '10',
              prepTimeMinutes: 20,
              servings: 1,
              ingredientsJson: []
            }
          }
        ]
      };

      await pdfExport.exportSingleMealPlanToPDF(mealPlan);

      // Check that text was truncated
      const textCalls = mockText.mock.calls;
      const nameCall = textCalls.find(call =>
        typeof call[0] === 'string' && call[0].includes('...')
      );
      expect(nameCall).toBeDefined();
    });

    it('should handle missing nutrition data gracefully', async () => {
      const mealPlan = {
        planName: 'Missing Data Plan',
        meals: [
          {
            day: 1,
            mealNumber: 1,
            mealType: 'Dinner',
            recipe: {
              name: 'Incomplete Recipe',
              // Missing most nutrition data
              caloriesKcal: 0,
              prepTimeMinutes: 0,
              servings: 0
            }
          }
        ]
      };

      await expect(
        pdfExport.exportSingleMealPlanToPDF(mealPlan)
      ).resolves.not.toThrow();

      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('Performance with Large Data Sets', () => {
    it('should handle large number of recipes efficiently', async () => {
      const largeMealPlan = {
        planName: 'Large Dataset Plan',
        meals: Array(100).fill(null).map((_, i) => ({
          day: Math.floor(i / 3) + 1,
          mealNumber: (i % 3) + 1,
          mealType: ['Breakfast', 'Lunch', 'Dinner'][i % 3],
          recipe: {
            name: `Recipe ${i}`,
            caloriesKcal: 300 + i,
            proteinGrams: `${20 + i}`,
            carbsGrams: `${30 + i}`,
            fatGrams: `${10 + i}`,
            prepTimeMinutes: 15 + i,
            servings: 1,
            ingredientsJson: Array(5).fill(null).map((_, j) => ({
              name: `Ingredient ${j}`,
              amount: `${100 + j}`,
              unit: 'g'
            }))
          }
        }))
      };

      const startTime = performance.now();
      await pdfExport.exportSingleMealPlanToPDF(largeMealPlan);
      const endTime = performance.now();

      expect(mockSave).toHaveBeenCalled();
      expect(mockAddPage).toHaveBeenCalled(); // Should paginate
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});