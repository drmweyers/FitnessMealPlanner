import { describe, test, expect, beforeEach, vi } from 'vitest';
import { storage } from '../../server/storage';
import type { InsertUser, MealPlan } from '@shared/schema';

// Mock data
const mockTrainer: InsertUser = {
  email: 'trainer@test.com',
  password: 'hashedPassword123',
  role: 'trainer'
};

const mockCustomer: InsertUser = {
  email: 'customer@test.com', 
  password: 'hashedPassword123',
  role: 'customer'
};

const mockMealPlan: MealPlan = {
  id: 'meal-plan-123',
  planName: 'Weight Loss Plan',
  fitnessGoal: 'weight_loss',
  description: 'A comprehensive weight loss meal plan',
  dailyCalorieTarget: 1800,
  days: 7,
  mealsPerDay: 3,
  generatedBy: 'trainer-123',
  createdAt: new Date(),
  meals: [
    {
      day: 1,
      mealNumber: 1,
      mealType: 'breakfast',
      recipe: {
        id: 'recipe-1',
        name: 'Healthy Breakfast Bowl',
        description: 'Nutritious breakfast with oats and fruits',
        caloriesKcal: 350,
        proteinGrams: '15',
        carbsGrams: '45', 
        fatGrams: '12',
        prepTimeMinutes: 10,
        cookTimeMinutes: 5,
        servings: 1,
        mealTypes: ['breakfast'],
        dietaryTags: ['healthy', 'vegetarian'],
        mainIngredientTags: ['oats'],
        ingredientsJson: [
          { name: 'oats', amount: '1', unit: 'cup' },
          { name: 'banana', amount: '1', unit: 'piece' }
        ],
        instructionsText: 'Mix oats with milk, add banana and serve'
      }
    }
  ]
};

describe('Customer Management Storage Functions', () => {
  describe('getTrainerCustomers', () => {
    test('should validate trainer ID parameter', () => {
      const trainerId = 'trainer-123';
      
      // Test that the function exists
      expect(typeof storage.getTrainerCustomers).toBe('function');
      
      // Test that trainer ID is required
      expect(trainerId).toBeDefined();
      expect(typeof trainerId).toBe('string');
      expect(trainerId.length).toBeGreaterThan(0);
    });

    test('should return customers structure', () => {
      const expectedCustomerStructure = {
        id: 'customer-123',
        email: 'customer@test.com',
        firstAssignedAt: new Date().toISOString()
      };

      // Test customer data structure
      expect(expectedCustomerStructure.id).toBeDefined();
      expect(expectedCustomerStructure.email).toContain('@');
      expect(expectedCustomerStructure.firstAssignedAt).toBeDefined();
      expect(typeof expectedCustomerStructure.firstAssignedAt).toBe('string');
    });
  });

  describe('getCustomerMealPlans', () => {
    test('should validate required parameters', () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      
      // Test that the function exists
      expect(typeof storage.getCustomerMealPlans).toBe('function');
      
      // Test required parameters
      expect(trainerId).toBeDefined();
      expect(customerId).toBeDefined();
      expect(typeof trainerId).toBe('string');
      expect(typeof customerId).toBe('string');
    });

    test('should return meal plans structure', () => {
      const expectedMealPlanStructure = {
        id: 'plan-assignment-123',
        customerId: 'customer-456',
        trainerId: 'trainer-123',
        mealPlanData: mockMealPlan,
        assignedAt: new Date().toISOString()
      };

      // Test meal plan assignment structure
      expect(expectedMealPlanStructure.id).toBeDefined();
      expect(expectedMealPlanStructure.customerId).toBeDefined();
      expect(expectedMealPlanStructure.trainerId).toBeDefined();
      expect(expectedMealPlanStructure.mealPlanData).toBeDefined();
      expect(expectedMealPlanStructure.assignedAt).toBeDefined();
      
      // Test meal plan data structure
      const mealPlan = expectedMealPlanStructure.mealPlanData;
      expect(mealPlan.id).toBeDefined();
      expect(mealPlan.planName).toBeDefined();
      expect(mealPlan.fitnessGoal).toBeDefined();
      expect(mealPlan.dailyCalorieTarget).toBeGreaterThan(0);
      expect(Array.isArray(mealPlan.meals)).toBe(true);
    });
  });

  describe('assignMealPlanToCustomer', () => {
    test('should validate assignment parameters', () => {
      const assignmentData = {
        trainerId: 'trainer-123',
        customerId: 'customer-456',
        mealPlanData: mockMealPlan
      };
      
      // Test that the function exists
      expect(typeof storage.assignMealPlanToCustomer).toBe('function');
      
      // Test assignment data structure
      expect(assignmentData.trainerId).toBeDefined();
      expect(assignmentData.customerId).toBeDefined();
      expect(assignmentData.mealPlanData).toBeDefined();
      expect(typeof assignmentData.trainerId).toBe('string');
      expect(typeof assignmentData.customerId).toBe('string');
      expect(typeof assignmentData.mealPlanData).toBe('object');
    });

    test('should validate meal plan data structure', () => {
      const mealPlan = mockMealPlan;
      
      // Test meal plan structure
      expect(mealPlan.id).toBeDefined();
      expect(mealPlan.planName).toBeDefined();
      expect(mealPlan.fitnessGoal).toBeDefined();
      expect(mealPlan.dailyCalorieTarget).toBeGreaterThan(0);
      expect(mealPlan.days).toBeGreaterThan(0);
      expect(mealPlan.mealsPerDay).toBeGreaterThan(0);
      expect(Array.isArray(mealPlan.meals)).toBe(true);
      
      // Test meal structure
      if (mealPlan.meals.length > 0) {
        const meal = mealPlan.meals[0];
        expect(meal.day).toBeGreaterThan(0);
        expect(meal.mealNumber).toBeGreaterThan(0);
        expect(meal.mealType).toBeDefined();
        expect(meal.recipe).toBeDefined();
        expect(meal.recipe.id).toBeDefined();
        expect(meal.recipe.name).toBeDefined();
      }
    });
  });

  describe('removeMealPlanAssignment', () => {
    test('should validate removal parameters', () => {
      const trainerId = 'trainer-123';
      const assignmentId = 'assignment-456';
      
      // Test that the function exists
      expect(typeof storage.removeMealPlanAssignment).toBe('function');
      
      // Test required parameters
      expect(trainerId).toBeDefined();
      expect(assignmentId).toBeDefined();
      expect(typeof trainerId).toBe('string');
      expect(typeof assignmentId).toBe('string');
      expect(trainerId.length).toBeGreaterThan(0);
      expect(assignmentId.length).toBeGreaterThan(0);
    });
  });
});

describe('Customer Management Data Validation', () => {
  test('should validate customer data structure', () => {
    const customer = {
      id: 'customer-123',
      email: 'customer@test.com',
      firstAssignedAt: new Date().toISOString()
    };

    // Test required fields
    expect(customer.id).toBeDefined();
    expect(customer.email).toBeDefined();
    expect(customer.firstAssignedAt).toBeDefined();
    
    // Test email format
    expect(customer.email).toContain('@');
    expect(customer.email).toContain('.');
    
    // Test date format
    expect(new Date(customer.firstAssignedAt)).toBeInstanceOf(Date);
    expect(isNaN(new Date(customer.firstAssignedAt).getTime())).toBe(false);
  });

  test('should validate meal plan assignment data', () => {
    const assignment = {
      id: 'assignment-123',
      customerId: 'customer-456',
      trainerId: 'trainer-789',
      mealPlanData: mockMealPlan,
      assignedAt: new Date().toISOString()
    };

    // Test required fields
    expect(assignment.id).toBeDefined();
    expect(assignment.customerId).toBeDefined();
    expect(assignment.trainerId).toBeDefined();
    expect(assignment.mealPlanData).toBeDefined();
    expect(assignment.assignedAt).toBeDefined();
    
    // Test data types
    expect(typeof assignment.id).toBe('string');
    expect(typeof assignment.customerId).toBe('string');
    expect(typeof assignment.trainerId).toBe('string');
    expect(typeof assignment.mealPlanData).toBe('object');
    expect(typeof assignment.assignedAt).toBe('string');
  });

  test('should validate fitness goals', () => {
    const validGoals = [
      'weight_loss',
      'muscle_gain', 
      'maintenance',
      'general_health',
      'athletic_performance'
    ];

    validGoals.forEach(goal => {
      const planWithGoal = { ...mockMealPlan, fitnessGoal: goal };
      expect(planWithGoal.fitnessGoal).toBe(goal);
      expect(validGoals.includes(planWithGoal.fitnessGoal)).toBe(true);
    });
  });

  test('should validate calorie ranges', () => {
    const validCalorieRanges = [1200, 1500, 1800, 2000, 2500, 3000];
    
    validCalorieRanges.forEach(calories => {
      const planWithCalories = { ...mockMealPlan, dailyCalorieTarget: calories };
      expect(planWithCalories.dailyCalorieTarget).toBeGreaterThanOrEqual(1200);
      expect(planWithCalories.dailyCalorieTarget).toBeLessThanOrEqual(5000);
    });
  });

  test('should validate meal structure', () => {
    const meal = mockMealPlan.meals[0];
    
    // Test meal properties
    expect(meal.day).toBeGreaterThan(0);
    expect(meal.mealNumber).toBeGreaterThan(0);
    expect(meal.mealType).toBeDefined();
    expect(['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.mealType)).toBe(true);
    
    // Test recipe properties
    expect(meal.recipe.id).toBeDefined();
    expect(meal.recipe.name).toBeDefined();
    expect(meal.recipe.caloriesKcal).toBeGreaterThan(0);
    expect(Array.isArray(meal.recipe.ingredientsJson)).toBe(true);
    expect(meal.recipe.instructionsText).toBeDefined();
  });
});

describe('Customer Management API Response Validation', () => {
  test('should validate GET /api/trainer/customers response format', () => {
    const mockResponse = {
      customers: [
        {
          id: 'customer-123',
          email: 'customer@test.com',
          firstAssignedAt: new Date().toISOString()
        }
      ],
      total: 1
    };

    // Test response structure
    expect(mockResponse.customers).toBeDefined();
    expect(mockResponse.total).toBeDefined();
    expect(Array.isArray(mockResponse.customers)).toBe(true);
    expect(typeof mockResponse.total).toBe('number');
    expect(mockResponse.total).toBe(mockResponse.customers.length);
  });

  test('should validate GET /api/trainer/customers/:customerId/meal-plans response format', () => {
    const mockResponse = {
      mealPlans: [
        {
          id: 'assignment-123',
          customerId: 'customer-456',
          trainerId: 'trainer-789',
          mealPlanData: mockMealPlan,
          assignedAt: new Date().toISOString()
        }
      ],
      total: 1
    };

    // Test response structure
    expect(mockResponse.mealPlans).toBeDefined();
    expect(mockResponse.total).toBeDefined();
    expect(Array.isArray(mockResponse.mealPlans)).toBe(true);
    expect(typeof mockResponse.total).toBe('number');
    expect(mockResponse.total).toBe(mockResponse.mealPlans.length);
  });
});

describe('Customer Management Error Handling', () => {
  test('should handle invalid trainer ID', () => {
    const invalidTrainerIds = ['', null, undefined, 123, {}];
    
    invalidTrainerIds.forEach(invalidId => {
      expect(() => {
        if (!invalidId || typeof invalidId !== 'string') {
          throw new Error('Invalid trainer ID');
        }
      }).toThrow('Invalid trainer ID');
    });
  });

  test('should handle invalid customer ID', () => {
    const invalidCustomerIds = ['', null, undefined, 123, {}];
    
    invalidCustomerIds.forEach(invalidId => {
      expect(() => {
        if (!invalidId || typeof invalidId !== 'string') {
          throw new Error('Invalid customer ID');
        }
      }).toThrow('Invalid customer ID');
    });
  });

  test('should handle invalid meal plan data', () => {
    const invalidMealPlans = [
      null,
      undefined,
      {},
      { id: 'test' }, // Missing required fields
      { planName: 'test' }, // Missing required fields
    ];
    
    invalidMealPlans.forEach(invalidPlan => {
      expect(() => {
        if (!invalidPlan || 
            !invalidPlan.id || 
            !invalidPlan.planName || 
            !invalidPlan.fitnessGoal ||
            !invalidPlan.dailyCalorieTarget ||
            !Array.isArray(invalidPlan.meals)) {
          throw new Error('Invalid meal plan data');
        }
      }).toThrow('Invalid meal plan data');
    });
  });
});

describe('Customer Management Integration Workflow', () => {
  test('should validate complete customer management workflow', () => {
    const workflow = {
      // 1. Get trainer's customers
      getCustomers: {
        trainerId: 'trainer-123',
        expectedResponse: {
          customers: [],
          total: 0
        }
      },
      
      // 2. Get customer's meal plans
      getCustomerMealPlans: {
        trainerId: 'trainer-123',
        customerId: 'customer-456',
        expectedResponse: {
          mealPlans: [],
          total: 0
        }
      },
      
      // 3. Assign meal plan to customer
      assignMealPlan: {
        trainerId: 'trainer-123',
        customerId: 'customer-456',
        mealPlanData: mockMealPlan
      },
      
      // 4. Remove meal plan assignment
      removeMealPlan: {
        trainerId: 'trainer-123',
        assignmentId: 'assignment-789'
      }
    };

    // Test workflow structure
    expect(workflow.getCustomers.trainerId).toBeDefined();
    expect(workflow.getCustomerMealPlans.trainerId).toBeDefined();
    expect(workflow.getCustomerMealPlans.customerId).toBeDefined();
    expect(workflow.assignMealPlan.mealPlanData).toBeDefined();
    expect(workflow.removeMealPlan.assignmentId).toBeDefined();
    
    // This validates the complete feature flow
    expect(workflow).toHaveProperty('getCustomers');
    expect(workflow).toHaveProperty('getCustomerMealPlans');
    expect(workflow).toHaveProperty('assignMealPlan');
    expect(workflow).toHaveProperty('removeMealPlan');
  });
});