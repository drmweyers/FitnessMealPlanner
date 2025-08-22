import { Page } from '@playwright/test';
import { apiRequest } from '../../../client/src/lib/queryClient';

/**
 * Test Data Helpers for Meal Plan Assignment Tests
 * 
 * Provides utilities to set up test data, create mock meal plans,
 * and manage test state for comprehensive E2E testing.
 */

export interface TestMealPlan {
  id?: string;
  planName: string;
  fitnessGoal: string;
  days: number;
  mealsPerDay: number;
  dailyCalorieTarget: number;
  description?: string;
  recipes: any[];
}

export interface TestCustomer {
  id?: string;
  email: string;
  password?: string;
  role: 'customer';
}

export interface TestTrainer {
  id?: string;
  email: string;
  password?: string;
  role: 'trainer';
}

export class MealPlanTestData {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Create a test meal plan with realistic data
   */
  static createTestMealPlan(index: number = 1): TestMealPlan {
    const mealPlans = [
      {
        planName: `Weight Loss Plan ${index}`,
        fitnessGoal: 'weight_loss',
        days: 7,
        mealsPerDay: 3,
        dailyCalorieTarget: 1800,
        description: 'A balanced meal plan designed for sustainable weight loss',
        recipes: this.createTestRecipes(21) // 7 days * 3 meals
      },
      {
        planName: `Muscle Building Plan ${index}`,
        fitnessGoal: 'muscle_gain',
        days: 7,
        mealsPerDay: 4,
        dailyCalorieTarget: 2500,
        description: 'High protein meal plan for muscle building and strength gains',
        recipes: this.createTestRecipes(28) // 7 days * 4 meals
      },
      {
        planName: `Maintenance Plan ${index}`,
        fitnessGoal: 'maintenance',
        days: 5,
        mealsPerDay: 3,
        dailyCalorieTarget: 2000,
        description: 'Balanced nutrition for maintaining current fitness level',
        recipes: this.createTestRecipes(15) // 5 days * 3 meals
      },
      {
        planName: `Athletic Performance Plan ${index}`,
        fitnessGoal: 'athletic_performance',
        days: 7,
        mealsPerDay: 5,
        dailyCalorieTarget: 3000,
        description: 'Optimized nutrition for peak athletic performance',
        recipes: this.createTestRecipes(35) // 7 days * 5 meals
      }
    ];

    const planIndex = (index - 1) % mealPlans.length;
    return mealPlans[planIndex];
  }

  /**
   * Create test recipes for meal plans
   */
  static createTestRecipes(count: number) {
    const recipeTemplates = [
      {
        name: 'Grilled Chicken Breast',
        cookingTime: 25,
        servings: 1,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        instructions: ['Season chicken breast', 'Grill for 6-8 minutes per side', 'Rest for 5 minutes before serving'],
        ingredients: ['1 chicken breast (150g)', 'Salt and pepper', 'Olive oil spray']
      },
      {
        name: 'Quinoa Salad Bowl',
        cookingTime: 15,
        servings: 1,
        calories: 220,
        protein: 8,
        carbs: 39,
        fat: 6,
        instructions: ['Cook quinoa according to package directions', 'Mix with vegetables', 'Add dressing and serve'],
        ingredients: ['1/2 cup quinoa', 'Mixed vegetables', 'Olive oil dressing']
      },
      {
        name: 'Salmon with Sweet Potato',
        cookingTime: 30,
        servings: 1,
        calories: 350,
        protein: 25,
        carbs: 30,
        fat: 15,
        instructions: ['Roast sweet potato at 400°F', 'Pan-sear salmon', 'Serve together with greens'],
        ingredients: ['1 salmon fillet (120g)', '1 medium sweet potato', 'Mixed greens']
      },
      {
        name: 'Greek Yogurt Parfait',
        cookingTime: 5,
        servings: 1,
        calories: 180,
        protein: 15,
        carbs: 20,
        fat: 5,
        instructions: ['Layer yogurt and berries', 'Top with granola', 'Serve immediately'],
        ingredients: ['1 cup Greek yogurt', '1/2 cup mixed berries', '2 tbsp granola']
      },
      {
        name: 'Turkey and Avocado Wrap',
        cookingTime: 10,
        servings: 1,
        calories: 320,
        protein: 25,
        carbs: 28,
        fat: 12,
        instructions: ['Lay out tortilla', 'Add turkey and vegetables', 'Roll tightly and slice'],
        ingredients: ['1 whole wheat tortilla', '100g sliced turkey', '1/2 avocado', 'Lettuce and tomato']
      }
    ];

    const recipes = [];
    for (let i = 0; i < count; i++) {
      const template = recipeTemplates[i % recipeTemplates.length];
      recipes.push({
        ...template,
        id: `test-recipe-${i + 1}`,
        name: `${template.name} ${Math.floor(i / recipeTemplates.length) + 1}`,
        mealType: this.getMealType(i % 5), // Distribute across meal types
        day: Math.floor(i / 5) + 1 // Group by days
      });
    }

    return recipes;
  }

  /**
   * Get meal type based on index
   */
  static getMealType(index: number): string {
    const mealTypes = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'];
    return mealTypes[index % mealTypes.length];
  }

  /**
   * Create test customer data
   */
  static createTestCustomer(index: number = 1): TestCustomer {
    return {
      email: `test.customer${index}@evofitmeals.com`,
      password: `TestCustomer${index}23!`,
      role: 'customer'
    };
  }

  /**
   * Create test trainer data
   */
  static createTestTrainer(index: number = 1): TestTrainer {
    return {
      email: `test.trainer${index}@evofitmeals.com`,
      password: `TestTrainer${index}23!`,
      role: 'trainer'
    };
  }

  /**
   * Set up test data via API calls
   */
  async setupTestData(mealPlanCount: number = 3, customerCount: number = 2) {
    console.log(`🛠️ Setting up test data: ${mealPlanCount} meal plans, ${customerCount} customers`);

    try {
      // Get authentication token (assumes trainer is logged in)
      const token = await this.page.evaluate(() => localStorage.getItem('token'));
      
      if (!token) {
        console.log('⚠️ No auth token found, skipping API test data setup');
        return { success: false, message: 'No authentication token' };
      }

      // Create test meal plans
      const mealPlans = [];
      for (let i = 1; i <= mealPlanCount; i++) {
        const mealPlan = MealPlanTestData.createTestMealPlan(i);
        
        // Save meal plan via API
        const response = await fetch('/api/trainer/meal-plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            mealPlanData: mealPlan,
            notes: `Test meal plan ${i} for E2E testing`,
            tags: ['test', 'e2e', mealPlan.fitnessGoal],
            isTemplate: false
          })
        });

        if (response.ok) {
          const result = await response.json();
          mealPlans.push(result);
          console.log(`✅ Created meal plan: ${mealPlan.planName}`);
        } else {
          console.log(`❌ Failed to create meal plan: ${mealPlan.planName}`);
        }
      }

      // Create test customers (this would typically be done through invitation flow)
      const customers = [];
      for (let i = 1; i <= customerCount; i++) {
        const customer = MealPlanTestData.createTestCustomer(i);
        
        // Send invitation
        const inviteResponse = await fetch('/api/invitations/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            customerEmail: customer.email,
            message: `E2E test invitation for ${customer.email}`
          })
        });

        if (inviteResponse.ok) {
          customers.push(customer);
          console.log(`✅ Invited customer: ${customer.email}`);
        } else {
          console.log(`❌ Failed to invite customer: ${customer.email}`);
        }
      }

      console.log(`🎉 Test data setup completed: ${mealPlans.length} meal plans, ${customers.length} customer invitations`);
      
      return {
        success: true,
        mealPlans,
        customers,
        message: 'Test data setup completed successfully'
      };

    } catch (error) {
      console.error('❌ Error setting up test data:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to set up test data'
      };
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');

    try {
      const token = await this.page.evaluate(() => localStorage.getItem('token'));
      
      if (!token) {
        console.log('⚠️ No auth token found for cleanup');
        return;
      }

      // Get all meal plans and delete test ones
      const mealPlansResponse = await fetch('/api/trainer/meal-plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (mealPlansResponse.ok) {
        const { mealPlans } = await mealPlansResponse.json();
        
        for (const plan of mealPlans) {
          // Delete plans with test tags or names
          if (plan.tags?.includes('test') || plan.tags?.includes('e2e') || 
              (plan.mealPlanData as any)?.planName?.includes('Test')) {
            
            const deleteResponse = await fetch(`/api/trainer/meal-plans/${plan.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (deleteResponse.ok) {
              console.log(`✅ Deleted test meal plan: ${(plan.mealPlanData as any)?.planName}`);
            }
          }
        }
      }

      console.log('🎉 Test data cleanup completed');

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Wait for test data to be visible in UI
   */
  async waitForTestDataInUI(expectedMealPlanCount: number = 3, timeout: number = 10000) {
    console.log(`⏳ Waiting for ${expectedMealPlanCount} meal plans to appear in UI...`);

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const mealPlanCards = this.page.locator('.card, [data-testid="meal-plan-card"]');
      const count = await mealPlanCards.count();
      
      if (count >= expectedMealPlanCount) {
        console.log(`✅ Found ${count} meal plans in UI`);
        return true;
      }
      
      await this.page.waitForTimeout(500);
    }
    
    console.log(`⚠️ Timeout waiting for meal plans in UI`);
    return false;
  }

  /**
   * Verify test meal plan exists
   */
  async verifyTestMealPlanExists(planName: string): Promise<boolean> {
    const mealPlanCard = this.page.locator(`.card:has-text("${planName}"), [data-testid="meal-plan-card"]:has-text("${planName}")`);
    return await mealPlanCard.count() > 0;
  }

  /**
   * Get mock API responses for offline testing
   */
  static getMockAPIResponses() {
    return {
      mealPlans: {
        mealPlans: [
          {
            id: 'mock-plan-1',
            trainerId: 'mock-trainer-1',
            mealPlanData: MealPlanTestData.createTestMealPlan(1),
            notes: 'Mock meal plan for testing',
            tags: ['test', 'mock'],
            isTemplate: false,
            createdAt: new Date().toISOString(),
            assignmentCount: 0
          },
          {
            id: 'mock-plan-2',
            trainerId: 'mock-trainer-1',
            mealPlanData: MealPlanTestData.createTestMealPlan(2),
            notes: 'Another mock meal plan',
            tags: ['test', 'mock'],
            isTemplate: false,
            createdAt: new Date().toISOString(),
            assignmentCount: 1
          }
        ]
      },
      customers: {
        customers: [
          {
            id: 'mock-customer-1',
            email: 'mock.customer1@test.com',
            role: 'customer',
            firstAssignedAt: new Date().toISOString()
          },
          {
            id: 'mock-customer-2',
            email: 'mock.customer2@test.com',
            role: 'customer',
            firstAssignedAt: new Date().toISOString()
          }
        ]
      },
      assignmentSuccess: {
        success: true,
        message: 'Meal plan assigned successfully',
        assignment: {
          id: 'mock-assignment-1',
          customerId: 'mock-customer-1',
          mealPlanId: 'mock-plan-1',
          assignedAt: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Setup mock API responses for testing
   */
  async setupMockAPIResponses() {
    console.log('🎭 Setting up mock API responses...');

    const mockResponses = MealPlanTestData.getMockAPIResponses();

    // Mock meal plans endpoint
    await this.page.route('/api/trainer/meal-plans', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.mealPlans)
        });
      } else {
        await route.continue();
      }
    });

    // Mock customers endpoint
    await this.page.route('/api/trainer/customers', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.customers)
        });
      } else {
        await route.continue();
      }
    });

    // Mock assignment endpoint
    await this.page.route('/api/trainer/meal-plans/*/assign', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses.assignmentSuccess)
        });
      } else {
        await route.continue();
      }
    });

    console.log('✅ Mock API responses configured');
  }

  /**
   * Reset page state for clean test runs
   */
  async resetPageState() {
    console.log('🔄 Resetting page state...');
    
    // Clear any modals or overlays
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    
    // Clear local storage except auth token
    await this.page.evaluate(() => {
      const token = localStorage.getItem('token');
      localStorage.clear();
      if (token) {
        localStorage.setItem('token', token);
      }
    });
    
    // Navigate to trainer dashboard
    await this.page.goto('/trainer', { waitUntil: 'networkidle' });
    
    console.log('✅ Page state reset completed');
  }
}