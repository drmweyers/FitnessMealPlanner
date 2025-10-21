/**
 * OpenAI Mock Responses for Integration Tests
 */

import { vi } from 'vitest';

/**
 * Mock OpenAI API responses
 */
export function mockOpenAIResponses() {
  // Mock recipe generation response
  const mockRecipeResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          recipes: [
            {
              name: 'Grilled Chicken Salad',
              description: 'A healthy and delicious grilled chicken salad',
              ingredients: [
                '2 chicken breasts',
                'Mixed greens',
                'Cherry tomatoes',
                'Cucumber',
                'Olive oil',
                'Lemon juice'
              ],
              instructions: [
                'Grill the chicken breasts until cooked through',
                'Let chicken rest and slice',
                'Prepare salad with mixed greens, tomatoes, and cucumber',
                'Top with sliced chicken',
                'Drizzle with olive oil and lemon juice'
              ],
              nutritionalInfo: {
                calories: 350,
                protein: 35,
                carbs: 15,
                fat: 18,
                fiber: 5
              },
              prepTime: 20,
              cookTime: 15,
              servings: 2,
              difficulty: 'Easy',
              tags: ['healthy', 'low-carb', 'high-protein']
            }
          ]
        })
      }
    }]
  };

  // Mock meal plan generation response
  const mockMealPlanResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          mealPlan: {
            week: 1,
            days: [
              {
                day: 'Monday',
                meals: {
                  breakfast: {
                    name: 'Oatmeal with Berries',
                    calories: 300,
                    protein: 10,
                    carbs: 45,
                    fat: 8
                  },
                  lunch: {
                    name: 'Grilled Chicken Salad',
                    calories: 350,
                    protein: 35,
                    carbs: 15,
                    fat: 18
                  },
                  dinner: {
                    name: 'Baked Salmon with Vegetables',
                    calories: 450,
                    protein: 40,
                    carbs: 20,
                    fat: 25
                  },
                  snacks: [
                    {
                      name: 'Greek Yogurt',
                      calories: 150,
                      protein: 15,
                      carbs: 10,
                      fat: 5
                    }
                  ]
                },
                totalCalories: 1250,
                totalProtein: 100,
                totalCarbs: 90,
                totalFat: 56
              }
            ]
          }
        })
      }
    }]
  };

  // Mock image generation response
  const mockImageResponse = {
    data: [
      {
        url: 'https://example.com/generated-food-image.jpg'
      }
    ]
  };

  return {
    recipeResponse: mockRecipeResponse,
    mealPlanResponse: mockMealPlanResponse,
    imageResponse: mockImageResponse,

    // Helper to setup all mocks
    setupMocks: () => {
      vi.mock('openai', () => ({
        default: vi.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: vi.fn()
                .mockResolvedValueOnce(mockRecipeResponse)
                .mockResolvedValueOnce(mockMealPlanResponse)
                .mockResolvedValue(mockRecipeResponse)
            }
          },
          images: {
            generate: vi.fn().mockResolvedValue(mockImageResponse)
          }
        }))
      }));
    }
  };
}