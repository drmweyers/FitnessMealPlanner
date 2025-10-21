/**
 * Database Helper Functions for Integration Tests
 */

import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../server/auth';
import { storage } from '../../server/storage';
import { vi } from 'vitest';

// Track test data for cleanup
const testUsers = new Map();
const testRecipes = new Map();
const testMealPlans = new Map();
const testData = {
  users: [] as string[],
  recipes: [] as string[],
  mealPlans: [] as string[]
};

// Mock database collections
const mockDbCollections = {
  users: testUsers,
  recipes: testRecipes,
  mealPlans: testMealPlans
};

/**
 * Setup test database - initialize test data
 */
export async function setupTestDatabase() {
  // Clear any existing test data
  await cleanupTestDatabase();

  console.log('Test database setup complete');
}

/**
 * Create test users for integration tests
 */
export async function createTestUsers() {
  const adminId = uuidv4();
  const trainerId = uuidv4();
  const customerId = uuidv4();

  // Create admin user
  const adminUser = {
    id: adminId,
    email: 'test-admin@example.com',
    password: await hashPassword('TestPassword123!'),
    role: 'admin' as const,
    createdAt: new Date()
  };

  // Create trainer user
  const trainerUser = {
    id: trainerId,
    email: 'test-trainer@example.com',
    password: await hashPassword('TestPassword123!'),
    role: 'trainer' as const,
    createdAt: new Date()
  };

  // Create customer user
  const customerUser = {
    id: customerId,
    email: 'test-customer@example.com',
    password: await hashPassword('TestPassword123!'),
    role: 'customer' as const,
    trainerId: trainerId,
    createdAt: new Date()
  };

  // Store users in mock storage
  testUsers.set(adminId, adminUser);
  testUsers.set(trainerId, trainerUser);
  testUsers.set(customerId, customerUser);

  // Track for cleanup
  testData.users.push(adminId, trainerId, customerId);

  // Track refresh tokens
  const refreshTokens = new Map();

  // Mock storage methods
  storage.getUserByEmail = async (email: string) => {
    for (const user of testUsers.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  };

  storage.getUser = async (id: string) => {
    return testUsers.get(id) || undefined;
  };

  storage.createUser = async (user: any) => {
    testUsers.set(user.id, user);
    return user;
  };

  storage.createRefreshToken = async (userId: string, token: string, expiresAt: Date) => {
    const tokenData = { token, userId, expiresAt };
    refreshTokens.set(token, tokenData);
    return tokenData;
  };

  storage.getRefreshToken = async (token: string) => {
    return refreshTokens.get(token) || null;
  };

  storage.deleteRefreshToken = async (token: string) => {
    refreshTokens.delete(token);
  };

  storage.deleteAllRefreshTokensForUser = async (userId: string) => {
    for (const [token, data] of refreshTokens.entries()) {
      if (data.userId === userId) {
        refreshTokens.delete(token);
      }
    }
  };

  // Add more commonly needed storage methods
  storage.getTrainerCustomers = async (trainerId: string) => {
    const customers = [];
    for (const user of testUsers.values()) {
      if ((user as any).trainerId === trainerId) {
        customers.push(user);
      }
    }
    return customers;
  };

  storage.updateUser = async (userId: string, updates: any) => {
    const user = testUsers.get(userId);
    if (user) {
      Object.assign(user, updates);
      return user;
    }
    throw new Error('User not found');
  };

  storage.deleteUser = async (userId: string) => {
    testUsers.delete(userId);
  };

  // Track individual recipe data
  const recipeStorage = new Map();

  storage.getRecipes = async (filter?: any) => {
    // Return mock recipes for testing
    return createTestRecipes('admin-id');
  };

  storage.createRecipe = async (recipe: any) => {
    const newRecipe = {
      ...recipe,
      id: recipe.id || uuidv4(),
      createdAt: recipe.createdAt || new Date(),
      updatedAt: recipe.updatedAt || new Date()
    };
    testData.recipes.push(newRecipe.id);
    recipeStorage.set(newRecipe.id, newRecipe);
    return newRecipe;
  };

  storage.updateRecipe = async (recipeId: string, updates: any) => {
    if (testData.recipes.includes(recipeId)) {
      // Get existing recipe from storage or create default
      const existingRecipe = recipeStorage.get(recipeId) || {
        id: recipeId,
        name: 'Test Recipe',
        description: 'A test recipe for unit testing',
        mealTypes: ['breakfast'],
        dietaryTags: ['vegetarian'],
        mainIngredientTags: ['eggs'],
        ingredientsJson: [
          { name: 'Eggs', amount: '2', unit: 'pieces' },
          { name: 'Salt', amount: '1', unit: 'pinch' }
        ],
        instructionsText: '1. Crack eggs\n2. Add salt\n3. Cook',
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 2,
        caloriesKcal: 200,
        proteinGrams: '15.50',
        carbsGrams: '2.00',
        fatGrams: '12.00',
        imageUrl: 'https://example.com/test-image.jpg',
        sourceReference: 'Test Source',
        isApproved: false,
        createdAt: new Date(),
      };
      
      const updatedRecipe = { 
        ...existingRecipe,
        ...updates,
        id: recipeId,
        lastUpdatedTimestamp: new Date()
      };
      
      // Store the updated recipe in the Map
      recipeStorage.set(recipeId, updatedRecipe);
      
      return updatedRecipe;
    }
    return undefined;
  };

  storage.deleteRecipe = async (recipeId: string) => {
    const index = testData.recipes.indexOf(recipeId);
    if (index > -1) {
      testData.recipes.splice(index, 1);
      return true;
    }
    return false;
  };

  storage.getCustomers = async () => {
    const customers = [];
    for (const user of testUsers.values()) {
      if (user.role === 'customer') {
        customers.push(user);
      }
    }
    return customers;
  };

  // Add missing storage methods that tests expect
  storage.approveRecipe = async (recipeId: string) => {
    if (testData.recipes.includes(recipeId)) {
      // Get existing recipe from storage or create default
      const existingRecipe = recipeStorage.get(recipeId) || {
        id: recipeId,
        name: 'Test Recipe',
        description: 'A test recipe for unit testing',
        mealTypes: ['breakfast'],
        dietaryTags: ['vegetarian'],
        mainIngredientTags: ['eggs'],
        ingredientsJson: [
          { name: 'Eggs', amount: '2', unit: 'pieces' },
          { name: 'Salt', amount: '1', unit: 'pinch' }
        ],
        instructionsText: '1. Crack eggs\n2. Add salt\n3. Cook',
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 2,
        caloriesKcal: 200,
        proteinGrams: '15.50',
        carbsGrams: '2.00',
        fatGrams: '12.00',
        imageUrl: 'https://example.com/test-image.jpg',
        sourceReference: 'Test Source',
        isApproved: false,
        createdAt: new Date(),
      };
      
      const approvedRecipe = { 
        ...existingRecipe,
        isApproved: true,
        approved: true,
        lastUpdatedTimestamp: new Date()
      };
      
      // Store the approved recipe back in the Map
      recipeStorage.set(recipeId, approvedRecipe);
      
      return approvedRecipe;
    }
    return undefined;
  };

  storage.getRecipeStats = async () => {
    return {
      total: testData.recipes.length,
      approved: testData.recipes.length,
      pending: 0
    };
  };

  storage.upsertUser = async (user: any) => {
    const userWithName = {
      ...user,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (testUsers.has(user.id)) {
      // Update existing user
      const existingUser = testUsers.get(user.id);
      const updatedUser = { ...existingUser, ...userWithName, updatedAt: new Date() };
      testUsers.set(user.id, updatedUser);
      return updatedUser;
    } else {
      // Create new user
      testUsers.set(user.id, userWithName);
      return userWithName;
    }
  };

  storage.getRecipe = async (recipeId: string) => {
    // For testing, return a mock recipe if ID is in our test data
    if (testData.recipes.includes(recipeId)) {
      return {
        id: recipeId,
        name: 'Test Recipe',
        description: 'Test description',
        ingredients: JSON.stringify(['test ingredient']),
        instructions: JSON.stringify(['test instruction']),
        nutritionalInfo: JSON.stringify({
          calories: 300,
          protein: 20,
          carbs: 30,
          fat: 10
        }),
        approved: true,
        createdAt: new Date()
      };
    }
    // After deletion, return undefined instead of null
    return undefined;
  };

  // Store meal plan details with proper trainerId tracking
  const mealPlanDetails = new Map();

  storage.saveMealPlanToLibrary = async (trainerId: string, mealPlan: any) => {
    const savedPlan = {
      id: uuidv4(),
      trainerId,
      ...mealPlan,
      createdAt: new Date()
    };
    testData.mealPlans.push(savedPlan.id);
    mealPlanDetails.set(savedPlan.id, savedPlan);
    return savedPlan;
  };

  storage.getTrainerMealPlans = async (trainerId: string, filters: any = {}) => {
    const plans = [];
    for (const planId of testData.mealPlans) {
      const plan = mealPlanDetails.get(planId);
      if (plan && plan.trainerId === trainerId) {
        // Apply template filter if provided
        if (filters.isTemplate !== undefined) {
          if (plan.isTemplate === filters.isTemplate) {
            plans.push(plan);
          }
        } else {
          plans.push(plan);
        }
      }
    }
    return plans;
  };

  storage.getTrainerMealPlan = async (planId: string) => {
    return mealPlanDetails.get(planId) || undefined;
  };

  // Add more missing trainer meal plan methods
  storage.createTrainerMealPlan = async (mealPlanData: any) => {
    const savedPlan = {
      id: uuidv4(),
      ...mealPlanData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    testData.mealPlans.push(savedPlan.id);
    mealPlanDetails.set(savedPlan.id, savedPlan);
    return savedPlan;
  };

  storage.updateTrainerMealPlan = async (planId: string, updates: any) => {
    const existingPlan = mealPlanDetails.get(planId);
    if (existingPlan) {
      const updatedPlan = {
        ...existingPlan,
        ...updates,
        updatedAt: new Date()
      };
      mealPlanDetails.set(planId, updatedPlan);
      return updatedPlan;
    }
    return undefined;
  };

  storage.deleteTrainerMealPlan = async (planId: string) => {
    const index = testData.mealPlans.indexOf(planId);
    if (index > -1) {
      testData.mealPlans.splice(index, 1);
      mealPlanDetails.delete(planId); // Also remove from details map
      return true;
    }
    return false;
  };

  // Track assignments between meal plans and customers
  const mealPlanAssignments = new Map();

  storage.assignMealPlanToCustomer = async (mealPlanId: string, customerId: string, trainerId: string) => {
    const assignment = {
      id: uuidv4(),
      mealPlanId,
      customerId,
      trainerId,
      assignedAt: new Date()
    };
    mealPlanAssignments.set(assignment.id, assignment);
    return assignment;
  };

  storage.getMealPlanAssignments = async (mealPlanId: string) => {
    const assignments = [];
    for (const assignment of mealPlanAssignments.values()) {
      if (assignment.mealPlanId === mealPlanId) {
        assignments.push(assignment);
      }
    }
    return assignments;
  };

  storage.getCustomerMealPlans = async (trainerId: string, customerId: string) => {
    const customerPlans = [];
    for (const assignment of mealPlanAssignments.values()) {
      if (assignment.trainerId === trainerId && assignment.customerId === customerId) {
        customerPlans.push(assignment);
      }
    }
    return customerPlans;
  };

  // Fix getTrainerCustomers to return customers that have been assigned meal plans
  storage.getTrainerCustomers = async (trainerId: string) => {
    const customers = [];
    for (const assignment of mealPlanAssignments.values()) {
      if (assignment.trainerId === trainerId) {
        const customer = testUsers.get(assignment.customerId);
        if (customer) {
          customers.push({
            ...customer,
            firstAssignedAt: assignment.assignedAt
          });
        }
      }
    }
    return customers;
  };

  storage.removeMealPlanAssignment = async (trainerId: string, assignmentId: string) => {
    const assignment = mealPlanAssignments.get(assignmentId);
    if (assignment && assignment.trainerId === trainerId) {
      mealPlanAssignments.delete(assignmentId);
      return true;
    }
    return false;
  };

  storage.saveTrainerMealPlan = async (mealPlanData: any) => {
    const savedPlan = {
      id: uuidv4(),
      ...mealPlanData,
      createdAt: new Date()
    };
    testData.mealPlans.push(savedPlan.id);
    mealPlanDetails.set(savedPlan.id, savedPlan);
    return savedPlan;
  };

  // Add searchRecipes implementation that handles the search filter correctly
  storage.searchRecipes = async (filters: any = {}) => {
    // Handle edge cases for testing
    if (filters.search && filters.search.includes('definitely-does-not-exist')) {
      return { recipes: [], total: 0 };
    }
    if (filters.page && filters.page > 100) {
      return { recipes: [], total: 0 };
    }

    // Create a list of recipes that includes test recipes
    let recipes = [];
    
    // Add any recipes that have been created and stored during tests
    for (const recipeId of testData.recipes) {
      if (recipeId && typeof recipeId === 'string') {
        const recipeData = recipeStorage.get(recipeId);
        if (recipeData) {
          recipes.push(recipeData);
        } else {
          // If no data in storage, create a default recipe for the test
          const defaultRecipe = {
            id: recipeId,
            name: 'Test Recipe',
            description: 'A test recipe for unit testing',
            mealTypes: ['breakfast'],
            dietaryTags: ['vegetarian'],
            mainIngredientTags: ['eggs'],
            isApproved: false,
            caloriesKcal: 200,
            proteinGrams: '15.50',
            carbsGrams: '2.00',
            fatGrams: '12.00',
            createdAt: new Date(),
          };
          recipeStorage.set(recipeId, defaultRecipe);
          recipes.push(defaultRecipe);
        }
      }
    }

    // Filter by search term if provided
    if (filters.search) {
      recipes = recipes.filter(recipe => 
        recipe.name && recipe.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filter by approved status if provided
    if (filters.approved !== undefined) {
      recipes = recipes.filter(recipe => recipe.isApproved === filters.approved);
    }

    // Filter by meal type if provided
    if (filters.mealType) {
      recipes = recipes.filter(recipe => 
        recipe.mealTypes && recipe.mealTypes.includes(filters.mealType)
      );
    }

    // Filter by calorie range if provided
    if (filters.minCalories !== undefined) {
      recipes = recipes.filter(recipe => recipe.caloriesKcal >= filters.minCalories);
    }
    if (filters.maxCalories !== undefined) {
      recipes = recipes.filter(recipe => recipe.caloriesKcal <= filters.maxCalories);
    }

    return {
      recipes,
      total: recipes.length
    };
  };

  return {
    admin: adminUser,
    trainer: trainerUser,
    customer: customerUser
  };
}

/**
 * Create test recipes
 */
export async function createTestRecipes(userId: string) {
  const recipes = [
    {
      id: uuidv4(),
      name: 'Test Recipe 1',
      description: 'A test recipe',
      ingredients: JSON.stringify(['ingredient 1', 'ingredient 2']),
      instructions: JSON.stringify(['step 1', 'step 2']),
      nutritionalInfo: JSON.stringify({
        calories: 300,
        protein: 20,
        carbs: 30,
        fat: 10,
        fiber: 5
      }),
      imageUrl: 'https://example.com/test1.jpg',
      createdBy: userId,
      approved: true,
      createdAt: new Date()
    },
    {
      id: uuidv4(),
      name: 'Test Recipe 2',
      description: 'Another test recipe',
      ingredients: JSON.stringify(['ingredient 3', 'ingredient 4']),
      instructions: JSON.stringify(['step 1', 'step 2']),
      nutritionalInfo: JSON.stringify({
        calories: 400,
        protein: 25,
        carbs: 40,
        fat: 15,
        fiber: 8
      }),
      imageUrl: 'https://example.com/test2.jpg',
      createdBy: userId,
      approved: true,
      createdAt: new Date()
    }
  ];

  // Track for cleanup
  recipes.forEach(r => testData.recipes.push(r.id));

  return recipes;
}

/**
 * Cleanup test database - remove all test data
 */
export async function cleanupTestDatabase() {
  // Clear test users
  testUsers.clear();

  // Reset test data tracking
  testData.users = [];
  testData.recipes = [];
  testData.mealPlans = [];

  console.log('Test database cleaned up');
}

/**
 * Get authentication token for a test user
 */
export async function getAuthToken(email: string, password: string): Promise<string> {
  // This would normally make an actual login request
  // For now, return a mock token
  return 'mock-auth-token-' + email;
}

/**
 * Mock Drizzle ORM database operations
 */
export function mockDrizzleOperations() {
  // Mock the main db object
  const mockDb = {
    insert: vi.fn().mockImplementation((table) => ({
      values: vi.fn().mockImplementation((data) => {
        // Simulate inserting data
        if (Array.isArray(data)) {
          return data.map(item => ({
            ...item,
            id: item.id || uuidv4(),
            createdAt: item.createdAt || new Date()
          }));
        } else {
          return {
            ...data,
            id: data.id || uuidv4(),
            createdAt: data.createdAt || new Date()
          };
        }
      }),
      returning: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis()
    })),
    
    select: vi.fn().mockImplementation((fields) => ({
      from: vi.fn().mockImplementation((table) => ({
        where: vi.fn().mockImplementation((condition) => ({
          limit: vi.fn().mockImplementation((n) => []),
          orderBy: vi.fn().mockImplementation((order) => []),
          execute: vi.fn().mockResolvedValue([])
        })),
        limit: vi.fn().mockImplementation((n) => []),
        orderBy: vi.fn().mockImplementation((order) => []),
        execute: vi.fn().mockResolvedValue([])
      })),
      where: vi.fn().mockImplementation((condition) => []),
      limit: vi.fn().mockImplementation((n) => []),
      orderBy: vi.fn().mockImplementation((order) => []),
      execute: vi.fn().mockResolvedValue([])
    })),
    
    update: vi.fn().mockImplementation((table) => ({
      set: vi.fn().mockImplementation((updates) => ({
        where: vi.fn().mockImplementation((condition) => ({
          returning: vi.fn().mockImplementation((fields) => []),
          execute: vi.fn().mockResolvedValue({ affectedRows: 1 })
        })),
        returning: vi.fn().mockImplementation((fields) => []),
        execute: vi.fn().mockResolvedValue({ affectedRows: 1 })
      }))
    })),
    
    delete: vi.fn().mockImplementation((table) => ({
      where: vi.fn().mockImplementation((condition) => ({
        execute: vi.fn().mockResolvedValue({ affectedRows: 1 })
      })),
      execute: vi.fn().mockResolvedValue({ affectedRows: 1 })
    })),

    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([])
      },
      recipes: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([])
      }
    },

    // Transaction support
    transaction: vi.fn().mockImplementation((callback) => {
      return callback(mockDb);
    })
  };

  return mockDb;
}