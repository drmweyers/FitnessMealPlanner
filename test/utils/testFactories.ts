/**
 * Test Data Factories
 *
 * Factory functions for generating test data objects consistently
 * across all test suites. Provides realistic, valid data for testing
 * and easy customization of specific fields.
 */

import type {
  User,
  InsertUser,
  Recipe,
  InsertRecipe,
  MealPlan,
  MealPlanGeneration,
  RecipeFilter,
  CreateMeasurement,
  UploadProgressPhoto,
  CreateInvitation,
  AcceptInvitation,
  GroceryList,
  GroceryListItem,
} from '../../shared/schema';

/**
 * Counter for generating unique IDs in tests
 */
let testIdCounter = 1;

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `test-id-${testIdCounter++}`;
}

/**
 * Reset the test ID counter (useful for deterministic tests)
 */
export function resetTestIdCounter(): void {
  testIdCounter = 1;
}

/**
 * User Factory
 */
export const UserFactory = {
  build: (overrides: Partial<User> = {}): User => ({
    id: generateTestId(),
    email: `user${testIdCounter}@test.com`,
    password: 'hashedpassword123',
    role: 'customer',
    googleId: null,
    name: `Test User ${testIdCounter}`,
    profilePicture: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  buildAdmin: (overrides: Partial<User> = {}): User =>
    UserFactory.build({
      role: 'admin',
      email: 'admin@test.com',
      name: 'Test Admin',
      ...overrides,
    }),

  buildTrainer: (overrides: Partial<User> = {}): User =>
    UserFactory.build({
      role: 'trainer',
      email: `trainer${testIdCounter}@test.com`,
      name: `Test Trainer ${testIdCounter}`,
      ...overrides,
    }),

  buildCustomer: (overrides: Partial<User> = {}): User =>
    UserFactory.build({
      role: 'customer',
      email: `customer${testIdCounter}@test.com`,
      name: `Test Customer ${testIdCounter}`,
      ...overrides,
    }),

  buildMany: (count: number, overrides: Partial<User> = {}): User[] =>
    Array.from({ length: count }, () => UserFactory.build(overrides)),
};

/**
 * Recipe Factory
 */
export const RecipeFactory = {
  build: (overrides: Partial<Recipe> = {}): Recipe => ({
    id: generateTestId(),
    name: `Test Recipe ${testIdCounter}`,
    description: `A delicious test recipe number ${testIdCounter}`,
    mealTypes: ['lunch'],
    dietaryTags: ['healthy'],
    mainIngredientTags: ['chicken'],
    ingredientsJson: [
      { name: 'Chicken breast', amount: '200', unit: 'g' },
      { name: 'Rice', amount: '150', unit: 'g' },
      { name: 'Vegetables', amount: '100', unit: 'g' },
    ],
    instructionsText: 'Cook the chicken, prepare the rice, and steam the vegetables.',
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    servings: 2,
    caloriesKcal: 450,
    proteinGrams: '35',
    carbsGrams: '40',
    fatGrams: '12',
    imageUrl: `https://example.com/recipe-${testIdCounter}.jpg`,
    sourceReference: null,
    creationTimestamp: new Date(),
    lastUpdatedTimestamp: new Date(),
    isApproved: true,
    ...overrides,
  }),

  buildInsert: (overrides: Partial<InsertRecipe> = {}): InsertRecipe => {
    const recipe = RecipeFactory.build(overrides);
    const { id, creationTimestamp, lastUpdatedTimestamp, ...insertData } = recipe;
    return insertData;
  },

  buildMany: (count: number, overrides: Partial<Recipe> = {}): Recipe[] =>
    Array.from({ length: count }, () => RecipeFactory.build(overrides)),

  buildWithMealType: (mealType: string, overrides: Partial<Recipe> = {}): Recipe =>
    RecipeFactory.build({
      mealTypes: [mealType],
      name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Recipe ${testIdCounter}`,
      ...overrides,
    }),

  buildHighProtein: (overrides: Partial<Recipe> = {}): Recipe =>
    RecipeFactory.build({
      dietaryTags: ['high-protein'],
      proteinGrams: '45',
      name: `High Protein Recipe ${testIdCounter}`,
      ...overrides,
    }),

  buildVegan: (overrides: Partial<Recipe> = {}): Recipe =>
    RecipeFactory.build({
      dietaryTags: ['vegan'],
      mainIngredientTags: ['tofu', 'vegetables'],
      ingredientsJson: [
        { name: 'Tofu', amount: '200', unit: 'g' },
        { name: 'Quinoa', amount: '150', unit: 'g' },
        { name: 'Mixed vegetables', amount: '200', unit: 'g' },
      ],
      name: `Vegan Recipe ${testIdCounter}`,
      ...overrides,
    }),
};

/**
 * Meal Plan Factory
 */
export const MealPlanFactory = {
  buildGeneration: (overrides: Partial<MealPlanGeneration> = {}): MealPlanGeneration => ({
    planName: `Test Meal Plan ${testIdCounter}`,
    fitnessGoal: 'weight_loss',
    dailyCalorieTarget: 2000,
    days: 7,
    mealsPerDay: 3,
    maxIngredients: 20,
    description: `A comprehensive meal plan for testing purposes ${testIdCounter}`,
    ...overrides,
  }),

  buildMealPlan: (overrides: Partial<MealPlan> = {}): MealPlan => ({
    id: generateTestId(),
    planName: `Generated Test Plan ${testIdCounter}`,
    fitnessGoal: 'weight_loss',
    description: `Generated meal plan ${testIdCounter}`,
    dailyCalorieTarget: 2000,
    clientName: 'Test Client',
    days: 7,
    mealsPerDay: 3,
    generatedBy: generateTestId(),
    createdAt: new Date(),
    meals: Array.from({ length: 21 }, (_, i) => ({
      day: Math.floor(i / 3) + 1,
      mealNumber: (i % 3) + 1,
      mealType: ['breakfast', 'lunch', 'dinner'][i % 3],
      recipe: RecipeFactory.build(),
    })),
    ...overrides,
  }),

  buildWeightLoss: (overrides: Partial<MealPlanGeneration> = {}): MealPlanGeneration =>
    MealPlanFactory.buildGeneration({
      fitnessGoal: 'weight_loss',
      dailyCalorieTarget: 1800,
      planName: `Weight Loss Plan ${testIdCounter}`,
      ...overrides,
    }),

  buildMuscleGain: (overrides: Partial<MealPlanGeneration> = {}): MealPlanGeneration =>
    MealPlanFactory.buildGeneration({
      fitnessGoal: 'muscle_gain',
      dailyCalorieTarget: 2800,
      planName: `Muscle Gain Plan ${testIdCounter}`,
      ...overrides,
    }),

  buildShortTerm: (overrides: Partial<MealPlanGeneration> = {}): MealPlanGeneration =>
    MealPlanFactory.buildGeneration({
      days: 3,
      planName: `Short Term Plan ${testIdCounter}`,
      ...overrides,
    }),
};

/**
 * Recipe Filter Factory
 */
export const FilterFactory = {
  build: (overrides: Partial<RecipeFilter> = {}): RecipeFilter => ({
    page: 1,
    limit: 12,
    ...overrides,
  }),

  buildSearch: (searchTerm: string, overrides: Partial<RecipeFilter> = {}): RecipeFilter =>
    FilterFactory.build({
      search: searchTerm,
      ...overrides,
    }),

  buildMealType: (mealType: string, overrides: Partial<RecipeFilter> = {}): RecipeFilter =>
    FilterFactory.build({
      mealType,
      ...overrides,
    }),

  buildDietary: (dietaryTag: string, overrides: Partial<RecipeFilter> = {}): RecipeFilter =>
    FilterFactory.build({
      dietaryTag,
      ...overrides,
    }),

  buildCalorieRange: (min: number, max: number, overrides: Partial<RecipeFilter> = {}): RecipeFilter =>
    FilterFactory.build({
      minCalories: min,
      maxCalories: max,
      ...overrides,
    }),

  buildProteinRange: (min: number, max: number, overrides: Partial<RecipeFilter> = {}): RecipeFilter =>
    FilterFactory.build({
      minProtein: min,
      maxProtein: max,
      ...overrides,
    }),
};

/**
 * Progress Tracking Factory
 */
export const ProgressFactory = {
  buildMeasurement: (overrides: Partial<CreateMeasurement> = {}): CreateMeasurement => ({
    measurementDate: new Date().toISOString(),
    weightKg: 70 + Math.random() * 20, // 70-90kg
    weightLbs: 154 + Math.random() * 44, // ~154-198lbs
    neckCm: 35 + Math.random() * 5,
    shouldersCm: 110 + Math.random() * 20,
    chestCm: 95 + Math.random() * 15,
    waistCm: 80 + Math.random() * 15,
    hipsCm: 95 + Math.random() * 15,
    bicepLeftCm: 30 + Math.random() * 8,
    bicepRightCm: 30 + Math.random() * 8,
    thighLeftCm: 55 + Math.random() * 10,
    thighRightCm: 55 + Math.random() * 10,
    calfLeftCm: 35 + Math.random() * 5,
    calfRightCm: 35 + Math.random() * 5,
    bodyFatPercentage: 15 + Math.random() * 15,
    muscleMassKg: 25 + Math.random() * 15,
    notes: `Test measurement ${testIdCounter}`,
    ...overrides,
  }),

  buildPhoto: (overrides: Partial<UploadProgressPhoto> = {}): UploadProgressPhoto => ({
    photoDate: new Date().toISOString(),
    photoType: 'front',
    caption: `Progress photo ${testIdCounter}`,
    isPrivate: true,
    ...overrides,
  }),

  buildWeightLossProgression: (weeks: number): CreateMeasurement[] =>
    Array.from({ length: weeks }, (_, i) => {
      const baseWeight = 80;
      const weightLoss = i * 0.5; // Lose 0.5kg per week
      const date = new Date();
      date.setDate(date.getDate() - (weeks - i - 1) * 7);

      return ProgressFactory.buildMeasurement({
        measurementDate: date.toISOString(),
        weightKg: baseWeight - weightLoss,
        weightLbs: (baseWeight - weightLoss) * 2.20462,
        notes: `Week ${i + 1} measurement`,
      });
    }),
};

/**
 * Invitation Factory
 */
export const InvitationFactory = {
  buildCreate: (overrides: Partial<CreateInvitation> = {}): CreateInvitation => ({
    customerEmail: `customer${testIdCounter}@test.com`,
    message: `Welcome to our fitness program! ${testIdCounter}`,
    ...overrides,
  }),

  buildAccept: (overrides: Partial<AcceptInvitation> = {}): AcceptInvitation => ({
    token: `invitation-token-${testIdCounter}`,
    password: 'StrongPassword123!',
    firstName: `Test${testIdCounter}`,
    lastName: `User${testIdCounter}`,
    ...overrides,
  }),
};

/**
 * Grocery List Factory
 */
export const GroceryFactory = {
  buildList: (overrides: Partial<GroceryList> = {}): GroceryList => ({
    id: generateTestId(),
    customerId: generateTestId(),
    mealPlanId: generateTestId(),
    name: `Test Grocery List ${testIdCounter}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  buildItem: (overrides: Partial<GroceryListItem> = {}): GroceryListItem => ({
    id: generateTestId(),
    groceryListId: generateTestId(),
    name: `Test Item ${testIdCounter}`,
    category: 'produce',
    quantity: 1,
    unit: 'pcs',
    isChecked: false,
    priority: 'medium',
    notes: null,
    estimatedPrice: null,
    brand: null,
    recipeId: null,
    recipeName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  buildShoppingList: (itemCount: number = 10): { list: GroceryList; items: GroceryListItem[] } => {
    const list = GroceryFactory.buildList();
    const categories = ['produce', 'meat', 'dairy', 'pantry', 'beverages'];
    const items = Array.from({ length: itemCount }, (_, i) =>
      GroceryFactory.buildItem({
        groceryListId: list.id,
        name: `Shopping Item ${i + 1}`,
        category: categories[i % categories.length] as any,
        quantity: Math.floor(Math.random() * 5) + 1,
        isChecked: Math.random() > 0.7, // 30% checked
      })
    );

    return { list, items };
  },
};

/**
 * Test Data Sets - Predefined collections for common test scenarios
 */
export const TestDataSets = {
  /**
   * Small dataset for quick tests
   */
  small: {
    users: UserFactory.buildMany(3),
    recipes: RecipeFactory.buildMany(5),
    mealPlans: [MealPlanFactory.buildWeightLoss(), MealPlanFactory.buildMuscleGain()],
  },

  /**
   * Medium dataset for integration tests
   */
  medium: {
    users: [
      ...UserFactory.buildMany(2, { role: 'customer' }),
      ...UserFactory.buildMany(2, { role: 'trainer' }),
      UserFactory.buildAdmin(),
    ],
    recipes: [
      ...RecipeFactory.buildMany(3, { mealTypes: ['breakfast'] }),
      ...RecipeFactory.buildMany(5, { mealTypes: ['lunch'] }),
      ...RecipeFactory.buildMany(4, { mealTypes: ['dinner'] }),
      ...RecipeFactory.buildMany(2, { mealTypes: ['snack'] }),
    ],
    mealPlans: [
      MealPlanFactory.buildWeightLoss(),
      MealPlanFactory.buildMuscleGain(),
      MealPlanFactory.buildShortTerm(),
    ],
  },

  /**
   * Large dataset for performance and stress tests
   */
  large: {
    users: [
      ...UserFactory.buildMany(50, { role: 'customer' }),
      ...UserFactory.buildMany(10, { role: 'trainer' }),
      ...UserFactory.buildMany(2, { role: 'admin' }),
    ],
    recipes: [
      ...RecipeFactory.buildMany(20, { mealTypes: ['breakfast'] }),
      ...RecipeFactory.buildMany(30, { mealTypes: ['lunch'] }),
      ...RecipeFactory.buildMany(25, { mealTypes: ['dinner'] }),
      ...RecipeFactory.buildMany(15, { mealTypes: ['snack'] }),
    ],
    mealPlans: Array.from({ length: 20 }, () => MealPlanFactory.buildGeneration()),
  },

  /**
   * Edge case dataset with boundary values
   */
  edgeCases: {
    recipes: [
      RecipeFactory.build({ caloriesKcal: 1, servings: 1, prepTimeMinutes: 1 }), // Minimum values
      RecipeFactory.build({ caloriesKcal: 2000, servings: 20, prepTimeMinutes: 300 }), // Large values
      RecipeFactory.build({ name: 'A', description: '' }), // Minimal text
      RecipeFactory.build({
        name: 'Very Long Recipe Name That Tests Character Limits'.repeat(3),
        description: 'Very long description '.repeat(50),
      }),
    ],
    mealPlans: [
      MealPlanFactory.buildGeneration({ dailyCalorieTarget: 800, days: 1 }), // Minimum
      MealPlanFactory.buildGeneration({ dailyCalorieTarget: 5001, days: 30 }), // Maximum
    ],
  },
};

/**
 * Utility functions for test data manipulation
 */
export const TestUtils = {
  /**
   * Create a realistic meal plan with varied recipes
   */
  createRealisticMealPlan: (days: number = 7): MealPlan => {
    const breakfasts = RecipeFactory.buildMany(days, { mealTypes: ['breakfast'] });
    const lunches = RecipeFactory.buildMany(days, { mealTypes: ['lunch'] });
    const dinners = RecipeFactory.buildMany(days, { mealTypes: ['dinner'] });

    const meals = [];
    for (let day = 1; day <= days; day++) {
      meals.push(
        { day, mealNumber: 1, mealType: 'breakfast', recipe: breakfasts[day - 1] },
        { day, mealNumber: 2, mealType: 'lunch', recipe: lunches[day - 1] },
        { day, mealNumber: 3, mealType: 'dinner', recipe: dinners[day - 1] }
      );
    }

    return MealPlanFactory.buildMealPlan({ meals, days });
  },

  /**
   * Create a progression of measurements showing weight loss
   */
  createWeightLossProgression: (startWeight: number, targetWeight: number, weeks: number) => {
    const weightDiff = startWeight - targetWeight;
    const weeklyLoss = weightDiff / weeks;

    return Array.from({ length: weeks }, (_, i) => {
      const currentWeight = startWeight - (weeklyLoss * (i + 1));
      const date = new Date();
      date.setDate(date.getDate() - (weeks - i - 1) * 7);

      return ProgressFactory.buildMeasurement({
        measurementDate: date.toISOString(),
        weightKg: currentWeight,
        weightLbs: currentWeight * 2.20462,
        notes: `Week ${i + 1}: Lost ${(weeklyLoss * (i + 1)).toFixed(1)}kg`,
      });
    });
  },

  /**
   * Generate random but valid test data
   */
  randomChoice: <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  },

  randomInt: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomFloat: (min: number, max: number, decimals: number = 2): number => {
    return Number((Math.random() * (max - min) + min).toFixed(decimals));
  },
};