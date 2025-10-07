/**
 * Test Setup and Database Configuration for Unit Tests
 * 
 * Provides database setup/teardown, test utilities, and configuration
 * for the comprehensive trainer-customer relationship unit test suite.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '../../server/db';
import { 
  users,
  customerInvitations,
  personalizedMealPlans,
  personalizedRecipes,
  progressMeasurements,
  progressPhotos,
  customerGoals,
  goalMilestones,
  trainerMealPlans,
  mealPlanAssignments,
  passwordResetTokens,
  refreshTokens 
} from '../../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Test Database Configuration
 */
export class TestDatabase {
  private static instance: TestDatabase;
  private isSetup = false;

  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  /**
   * Initialize test database with schema and test data
   */
  async setup(): Promise<void> {
    if (this.isSetup) return;

    console.log('🔧 Setting up test database...');

    try {
      // Create all tables if they don't exist
      await this.createTables();
      
      // Seed with test data
      await this.seedTestData();
      
      this.isSetup = true;
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up test database
   */
  async teardown(): Promise<void> {
    if (!this.isSetup) return;

    console.log('🧹 Cleaning up test database...');

    try {
      // Clean all tables in reverse dependency order
      await this.cleanTables();
      
      this.isSetup = false;
      console.log('✅ Test database cleanup complete');
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Reset database state between tests
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting test database state...');
    
    try {
      await this.cleanTables();
      await this.seedTestData();
      console.log('✅ Test database reset complete');
    } catch (error) {
      console.error('❌ Test database reset failed:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    // Note: In actual implementation, this would use Drizzle migrations
    // For testing, we assume tables already exist or are created by migrations
    console.log('📋 Ensuring database tables exist...');
    
    // Check if main tables exist
    const tableChecks = [
      'users',
      'customer_invitations', 
      'personalized_meal_plans',
      'personalized_recipes',
      'progress_measurements',
      'progress_photos',
      'customer_goals',
      'goal_milestones',
      'trainer_meal_plans',
      'meal_plan_assignments',
      'password_reset_tokens',
      'refresh_tokens'
    ];

    for (const table of tableChecks) {
      try {
        await db.execute(sql`SELECT 1 FROM ${sql.identifier(table)} LIMIT 1`);
      } catch (error) {
        console.warn(`⚠️  Table ${table} may not exist or be accessible`);
      }
    }
  }

  /**
   * Clean all test data from tables
   */
  private async cleanTables(): Promise<void> {
    // Delete in reverse dependency order to avoid foreign key constraints
    const cleanupOrder = [
      goalMilestones,
      customerGoals,
      progressPhotos,
      progressMeasurements,
      mealPlanAssignments,
      trainerMealPlans,
      personalizedRecipes,
      personalizedMealPlans,
      customerInvitations,
      refreshTokens,
      passwordResetTokens,
      users,
    ];

    for (const table of cleanupOrder) {
      try {
        await db.delete(table);
      } catch (error) {
        console.warn(`⚠️  Could not clean table ${table.toString()}:`, error);
      }
    }
  }

  /**
   * Seed database with test data
   */
  private async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test data...');

    // Create test users
    await this.seedUsers();
    
    // Create test relationships
    await this.seedRelationships();
    
    // Create test progress data
    await this.seedProgressData();
    
    console.log('✅ Test data seeding complete');
  }

  private async seedUsers(): Promise<void> {
    const testUsers = [
      {
        id: 'admin-test-123',
        email: 'admin.test@example.com',
        password: '$2b$10$hashedpassword',
        role: 'admin' as const,
        name: 'Test Admin',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'trainer-test-123',
        email: 'trainer.test@example.com', 
        password: '$2b$10$hashedpassword',
        role: 'trainer' as const,
        name: 'Test Trainer',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'customer-test-123',
        email: 'customer.test@example.com',
        password: '$2b$10$hashedpassword', 
        role: 'customer' as const,
        name: 'Test Customer',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 'customer-test-456', 
        email: 'customer2.test@example.com',
        password: '$2b$10$hashedpassword',
        role: 'customer' as const,
        name: 'Test Customer 2',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
      },
    ];

    for (const user of testUsers) {
      try {
        await db.insert(users).values(user);
      } catch (error) {
        // Ignore duplicate key errors during testing
        if (!error.message.includes('duplicate key')) {
          throw error;
        }
      }
    }
  }

  private async seedRelationships(): Promise<void> {
    // Create customer invitation
    await db.insert(customerInvitations).values({
      id: 'invitation-test-123',
      trainerId: 'trainer-test-123',
      customerEmail: 'newcustomer.test@example.com',
      token: 'test-invitation-token-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    // Create meal plan assignment
    const testMealPlan = {
      id: 'test-plan-123',
      planName: 'Test Weight Loss Plan',
      fitnessGoal: 'weight_loss',
      description: 'Test meal plan for unit tests',
      dailyCalorieTarget: 1800,
      days: 7,
      mealsPerDay: 4,
      generatedBy: 'trainer-test-123',
      createdAt: new Date(),
      meals: [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: 'test-recipe-123',
            name: 'Test Breakfast',
            description: 'Test breakfast recipe',
            caloriesKcal: 350,
            proteinGrams: '25.0',
            carbsGrams: '30.0',
            fatGrams: '8.0',
            prepTimeMinutes: 15,
            cookTimeMinutes: 10,
            servings: 1,
            mealTypes: ['breakfast'],
            dietaryTags: ['test'],
            mainIngredientTags: ['test'],
            ingredientsJson: [
              { name: 'Test Ingredient', amount: '1', unit: 'cup' },
            ],
            instructionsText: 'Test instructions',
            imageUrl: null,
          },
        },
      ],
    };

    await db.insert(personalizedMealPlans).values({
      id: 'assignment-test-123',
      customerId: 'customer-test-123',
      trainerId: 'trainer-test-123',
      mealPlanData: testMealPlan,
      assignedAt: new Date(),
    });
  }

  private async seedProgressData(): Promise<void> {
    // Create progress measurement
    await db.insert(progressMeasurements).values({
      id: 'measurement-test-123',
      customerId: 'customer-test-123',
      measurementDate: new Date('2024-01-15'),
      weightKg: '75.5',
      weightLbs: '166.4',
      bodyFatPercentage: '18.5',
      chestCm: '98.0',
      waistCm: '85.0',
      notes: 'Test measurement',
      createdAt: new Date('2024-01-15'),
    });

    // Create customer goal
    await db.insert(customerGoals).values({
      id: 'goal-test-123',
      customerId: 'customer-test-123',
      goalType: 'weight_loss',
      goalName: 'Test Weight Loss Goal',
      description: 'Test goal for unit tests',
      targetValue: '155.0',
      targetUnit: 'lbs',
      currentValue: '166.4',
      startingValue: '175.0',
      startDate: new Date('2024-01-01'),
      targetDate: new Date('2024-06-01'),
      status: 'active',
      progressPercentage: 43,
      notes: 'Test goal notes',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    });
  }
}

/**
 * Test Utilities
 */
export class TestUtils {
  /**
   * Generate test user data
   */
  static createTestUser(overrides: Partial<any> = {}) {
    return {
      id: `test-user-${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: '$2b$10$hashedpassword',
      role: 'customer',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate test meal plan data
   */
  static createTestMealPlan(overrides: Partial<any> = {}) {
    return {
      id: `test-plan-${Date.now()}`,
      planName: 'Test Meal Plan',
      fitnessGoal: 'weight_loss',
      description: 'Test meal plan description',
      dailyCalorieTarget: 1800,
      days: 7,
      mealsPerDay: 3,
      generatedBy: 'test-trainer-123',
      createdAt: new Date(),
      meals: [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: 'test-recipe-1',
            name: 'Test Recipe',
            description: 'Test recipe description',
            caloriesKcal: 350,
            proteinGrams: '25.0',
            carbsGrams: '30.0',
            fatGrams: '8.0',
            prepTimeMinutes: 15,
            servings: 1,
            mealTypes: ['breakfast'],
            ingredientsJson: [{ name: 'Test', amount: '1', unit: 'cup' }],
            instructionsText: 'Test instructions',
          },
        },
      ],
      ...overrides,
    };
  }

  /**
   * Generate test measurement data
   */
  static createTestMeasurement(customerId: string, overrides: Partial<any> = {}) {
    return {
      id: `test-measurement-${Date.now()}`,
      customerId,
      measurementDate: new Date(),
      weightKg: '75.0',
      weightLbs: '165.3',
      bodyFatPercentage: '18.0',
      notes: 'Test measurement',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate test goal data
   */
  static createTestGoal(customerId: string, overrides: Partial<any> = {}) {
    return {
      id: `test-goal-${Date.now()}`,
      customerId,
      goalType: 'weight_loss',
      goalName: 'Test Goal',
      targetValue: '150.0',
      targetUnit: 'lbs',
      currentValue: '165.0',
      startingValue: '175.0',
      startDate: new Date('2024-01-01'),
      targetDate: new Date('2024-06-01'),
      status: 'active',
      progressPercentage: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Wait for a specified amount of time
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create test JWT token payload
   */
  static createTestTokenPayload(overrides: Partial<any> = {}) {
    return {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'customer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      ...overrides,
    };
  }

  /**
   * Generate random test data
   */
  static randomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static randomEmail(): string {
    return `test${this.randomString(8)}@example.com`;
  }

  static randomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Test Environment Configuration
 */
export const testConfig = {
  database: {
    // Use test database or in-memory database
    url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    pool: {
      min: 1,
      max: 5,
    },
  },
  auth: {
    jwtSecret: 'test-jwt-secret-key',
    refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
    accessTokenExpiry: 15 * 60 * 1000, // 15 minutes
  },
  api: {
    rateLimitWindow: 1000, // 1 second for testing
    rateLimitMax: 100, // Higher limit for tests
  },
  storage: {
    s3Bucket: 'test-bucket',
    uploadSizeLimit: 5 * 1024 * 1024, // 5MB
  },
};

/**
 * Global test setup and teardown
 */
export const setupTestEnvironment = () => {
  const testDb = TestDatabase.getInstance();

  beforeAll(async () => {
    console.log('🚀 Starting test suite...');
    await testDb.setup();
  });

  afterAll(async () => {
    console.log('🏁 Finishing test suite...');
    await testDb.teardown();
  });

  beforeEach(async () => {
    // Reset database state between tests for isolation
    await testDb.reset();
  });

  afterEach(() => {
    // Clean up any test-specific state
    // Mock functions are automatically reset by vitest
  });
};

/**
 * Database connection health check for tests
 */
export const checkTestDatabaseHealth = async (): Promise<boolean> => {
  try {
    // Simple query to check database connectivity
    await db.execute(sql`SELECT 1 as health_check`);
    return true;
  } catch (error) {
    console.error('❌ Test database health check failed:', error);
    return false;
  }
};

/**
 * Mock factory for consistent test mocks
 */
export class MockFactory {
  static createMockDbQuery(returnValue: any = []) {
    return {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      having: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue(returnValue),
    };
  }

  static createMockInsertQuery(returnValue: any = { id: 'test-id' }) {
    return {
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([returnValue]),
    };
  }

  static createMockUpdateQuery(returnValue: any = { id: 'test-id' }) {
    return {
      table: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([returnValue]),
    };
  }

  static createMockDeleteQuery(returnValue: any = { id: 'test-id' }) {
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([returnValue]),
    };
  }
}

// Export the vi function for use in tests
export { vi } from 'vitest';