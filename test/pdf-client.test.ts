/**
 * Client-side PDF Utilities Tests
 * 
 * Tests for client/src/utils/pdfExport.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  extractRecipeCardsFromMealPlan, 
  exportSingleMealPlanToPDF, 
  exportMultipleMealPlansToPDF 
} from '../client/src/utils/pdfExport';

// Mock jsPDF
const mockPDF = {
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297)
    }
  },
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  setFillColor: vi.fn(),
  setTextColor: vi.fn(),
  save: vi.fn()
};

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => mockPDF)
}));

describe('Client-side PDF Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractRecipeCardsFromMealPlan', () => {
    const mockMealPlan = {
      mealPlanData: {
        planName: 'Test Meal Plan',
        fitnessGoal: 'muscle_building',
        dailyCalorieTarget: 2500,
        days: 7,
        clientName: 'John Doe',
        generatedBy: 'Test Trainer',
        createdAt: new Date('2024-01-01')
      },
      meals: [
        {
          recipe: {
            name: 'Protein Oatmeal',
            description: 'High-protein breakfast',
            caloriesKcal: 450,
            proteinGrams: '35',
            carbsGrams: '55',
            fatGrams: '12',
            prepTimeMinutes: 15,
            servings: 1,
            dietaryTags: ['high-protein', 'vegetarian'],
            ingredientsJson: [
              { name: 'Oats', amount: '1', unit: 'cup' },
              { name: 'Protein powder', amount: '1', unit: 'scoop' }
            ],
            instructionsText: '1. Cook oats. 2. Add protein powder.'
          },
          mealType: 'breakfast',
          day: 1,
          mealNumber: 1
        },
        {
          recipe: {
            name: 'Chicken Rice Bowl',
            description: 'Balanced meal',
            caloriesKcal: 550,
            proteinGrams: '45',
            carbsGrams: '50',
            fatGrams: '15',
            prepTimeMinutes: 30,
            servings: 1,
            dietaryTags: ['high-protein'],
            ingredientsJson: [
              { name: 'Chicken breast', amount: '6', unit: 'oz' },
              { name: 'Rice', amount: '1', unit: 'cup' }
            ],
            instructionsText: '1. Cook chicken. 2. Prepare rice. 3. Combine.'
          },
          mealType: 'lunch',
          day: 1,
          mealNumber: 2
        }
      ]
    };

    it('should extract recipe data from meal plan correctly', () => {
      const result = extractRecipeCardsFromMealPlan(mockMealPlan);

      expect(result.planName).toBe('Test Meal Plan');
      expect(result.fitnessGoal).toBe('muscle_building');
      expect(result.dailyCalorieTarget).toBe(2500);
      expect(result.days).toBe(7);
      expect(result.clientName).toBe('John Doe');
      expect(result.generatedBy).toBe('Test Trainer');
      expect(result.recipes).toHaveLength(2);
    });

    it('should handle meal plan without mealPlanData wrapper', () => {
      const simpleMealPlan = {
        planName: 'Simple Plan',
        fitnessGoal: 'weight_loss',
        dailyCalorieTarget: 1800,
        days: 5,
        meals: mockMealPlan.meals
      };

      const result = extractRecipeCardsFromMealPlan(simpleMealPlan);

      expect(result.planName).toBe('Simple Plan');
      expect(result.fitnessGoal).toBe('weight_loss');
      expect(result.recipes).toHaveLength(2);
    });

    it('should apply default values for missing properties', () => {
      const minimalMealPlan = {
        meals: [mockMealPlan.meals[0]]
      };

      const result = extractRecipeCardsFromMealPlan(minimalMealPlan);

      expect(result.planName).toBe('Meal Plan');
      expect(result.fitnessGoal).toBe('General Fitness');
      expect(result.dailyCalorieTarget).toBe(0);
      expect(result.days).toBe(7);
      expect(result.generatedBy).toBe('Trainer');
    });

    it('should correctly map recipe properties', () => {
      const result = extractRecipeCardsFromMealPlan(mockMealPlan);
      const firstRecipe = result.recipes[0];

      expect(firstRecipe.recipeName).toBe('Protein Oatmeal');
      expect(firstRecipe.description).toBe('High-protein breakfast');
      expect(firstRecipe.calories).toBe(450);
      expect(firstRecipe.protein).toBe('35');
      expect(firstRecipe.carbs).toBe('55');
      expect(firstRecipe.fat).toBe('12');
      expect(firstRecipe.prepTime).toBe(15);
      expect(firstRecipe.servings).toBe(1);
      expect(firstRecipe.mealType).toBe('breakfast');
      expect(firstRecipe.day).toBe(1);
      expect(firstRecipe.mealNumber).toBe(1);
      expect(firstRecipe.dietaryTags).toEqual(['high-protein', 'vegetarian']);
      expect(firstRecipe.ingredients).toHaveLength(2);
      expect(firstRecipe.instructions).toBe('1. Cook oats. 2. Add protein powder.');
    });
  });

  describe('exportSingleMealPlanToPDF', () => {
    const mockMealPlan = {
      mealPlanData: {
        planName: 'Test Plan',
        fitnessGoal: 'muscle_building',
        dailyCalorieTarget: 2500,
        days: 7
      },
      meals: [
        {
          recipe: {
            name: 'Test Recipe',
            description: 'Test description',
            caloriesKcal: 400,
            proteinGrams: '30',
            carbsGrams: '40',
            fatGrams: '15',
            prepTimeMinutes: 20,
            servings: 1,
            dietaryTags: ['test'],
            ingredientsJson: [{ name: 'Test ingredient', amount: '1', unit: 'cup' }],
            instructionsText: 'Test instructions'
          },
          mealType: 'breakfast',
          day: 1,
          mealNumber: 1
        }
      ]
    };

    it('should successfully export PDF with default options', async () => {
      await exportSingleMealPlanToPDF(mockMealPlan);

      expect(mockPDF.save).toHaveBeenCalledWith(
        expect.stringMatching(/.*_recipes_\d{4}-\d{2}-\d{2}\.pdf/)
      );
    });

    it('should apply custom options', async () => {
      const options = {
        includeNutrition: false,
        cardSize: 'large' as const
      };

      await exportSingleMealPlanToPDF(mockMealPlan, options);

      expect(mockPDF.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPDF.save.mockImplementationOnce(() => {
        throw new Error('PDF generation failed');
      });

      await expect(exportSingleMealPlanToPDF(mockMealPlan)).rejects.toThrow(
        'Failed to export meal plan to PDF. Please try again.'
      );
      
      // Reset mock for other tests
      mockPDF.save.mockRestore();
    });

    it('should create appropriate filename', async () => {
      const mealPlanWithSpecialChars = {
        ...mockMealPlan,
        mealPlanData: {
          ...mockMealPlan.mealPlanData,
          planName: 'Plan with Spaces & Special Characters!'
        }
      };

      await exportSingleMealPlanToPDF(mealPlanWithSpecialChars);

      expect(mockPDF.save).toHaveBeenCalledWith(
        expect.stringMatching(/plan_with_spaces___special_characters__recipes_.*\.pdf/)
      );
    });
  });

  describe('exportMultipleMealPlansToPDF', () => {
    const mockMealPlans = [
      {
        mealPlanData: {
          planName: 'Plan 1',
          fitnessGoal: 'muscle_building',
          days: 7
        },
        meals: [
          {
            recipe: {
              name: 'Recipe 1',
              description: 'Description 1',
              caloriesKcal: 400,
              proteinGrams: '30',
              carbsGrams: '40',
              fatGrams: '15',
              prepTimeMinutes: 20,
              servings: 1,
              dietaryTags: [],
              ingredientsJson: [],
              instructionsText: 'Instructions 1'
            },
            mealType: 'breakfast',
            day: 1,
            mealNumber: 1
          }
        ]
      },
      {
        mealPlanData: {
          planName: 'Plan 2',
          fitnessGoal: 'weight_loss',
          days: 5
        },
        meals: [
          {
            recipe: {
              name: 'Recipe 2',
              description: 'Description 2',
              caloriesKcal: 300,
              proteinGrams: '25',
              carbsGrams: '30',
              fatGrams: '10',
              prepTimeMinutes: 15,
              servings: 1,
              dietaryTags: [],
              ingredientsJson: [],
              instructionsText: 'Instructions 2'
            },
            mealType: 'lunch',
            day: 1,
            mealNumber: 2
          }
        ]
      }
    ];

    it('should export multiple meal plans successfully', async () => {
      await exportMultipleMealPlansToPDF(mockMealPlans);

      expect(mockPDF.addPage).toHaveBeenCalled();
      expect(mockPDF.save).toHaveBeenCalledWith(
        expect.stringMatching(/meal_plans_collection_\d{4}-\d{2}-\d{2}\.pdf/)
      );
    });

    it('should use customer name in filename when provided', async () => {
      const options = { customerName: 'John Doe' };

      await exportMultipleMealPlansToPDF(mockMealPlans, options);

      expect(mockPDF.save).toHaveBeenCalledWith(
        expect.stringMatching(/john_doe_meal_plans_\d{4}-\d{2}-\d{2}\.pdf/)
      );
    });

    it('should handle custom options', async () => {
      const options = {
        includeNutrition: false,
        cardSize: 'small' as const,
        customerName: 'Test Customer'
      };

      await exportMultipleMealPlansToPDF(mockMealPlans, options);

      expect(mockPDF.save).toHaveBeenCalled();
    });

    it('should create title page with collection info', async () => {
      const options = { customerName: 'Jane Smith' };

      await exportMultipleMealPlansToPDF(mockMealPlans, options);

      expect(mockPDF.text).toHaveBeenCalledWith(
        'Recipe Collection',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'center' })
      );

      expect(mockPDF.text).toHaveBeenCalledWith(
        'For: Jane Smith',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'center' })
      );
    });

    it('should handle errors gracefully', async () => {
      mockPDF.text.mockImplementationOnce(() => {
        throw new Error('PDF creation failed');
      });

      await expect(exportMultipleMealPlansToPDF(mockMealPlans)).rejects.toThrow(
        'Failed to export meal plans to PDF. Please try again.'
      );
      
      // Reset mock for other tests
      mockPDF.text.mockRestore();
    });

    it('should handle empty meal plans array', async () => {
      await exportMultipleMealPlansToPDF([]);

      // Should still create a PDF with title page
      expect(mockPDF.save).toHaveBeenCalled();
    });
  });
});