/**
 * Test Data Setup for Business Logic Tests
 * 
 * This script ensures proper test data exists for comprehensive business logic testing
 */

import { storage } from '../../server/storage.ts';
import { hashPassword } from '../../server/auth.ts';

export interface TestAccountData {
  email: string;
  password: string;
  role: 'admin' | 'trainer' | 'customer';
}

export const TEST_ACCOUNTS: TestAccountData[] = [
  {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    role: 'admin'
  },
  {
    email: 'testtrainer@example.com',
    password: 'TrainerPassword123!',
    role: 'trainer'
  },
  {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
    role: 'customer'
  }
];

/**
 * Create or verify test accounts exist with correct credentials
 */
export async function ensureTestAccounts(): Promise<void> {
  console.log('🔧 Setting up test accounts...');
  
  for (const account of TEST_ACCOUNTS) {
    try {
      // Check if user exists
      const existingUser = await storage.getUserByEmail(account.email);
      
      if (!existingUser) {
        // Create new user
        const hashedPassword = await hashPassword(account.password);
        await storage.createUser({
          email: account.email,
          password: hashedPassword,
          role: account.role
        });
        console.log(`✅ Created ${account.role} account: ${account.email}`);
      } else {
        console.log(`ℹ️  ${account.role} account exists: ${account.email}`);
      }
    } catch (error) {
      console.error(`❌ Error setting up ${account.email}:`, error);
      throw error;
    }
  }
}

/**
 * Create test recipes with different approval states
 */
export async function ensureTestRecipes(): Promise<void> {
  console.log('🍽️ Setting up test recipes...');
  
  const testRecipes = [
    {
      name: 'Test Approved Recipe',
      description: 'This recipe is approved for testing',
      mealTypes: ['breakfast'],
      dietaryTags: ['vegetarian'],
      mainIngredientTags: ['eggs'],
      ingredientsJson: [
        { name: 'eggs', amount: '2', unit: 'pieces' },
        { name: 'toast', amount: '2', unit: 'slices' }
      ],
      instructionsText: 'Cook eggs and serve with toast',
      prepTimeMinutes: 10,
      cookTimeMinutes: 5,
      servings: 1,
      caloriesKcal: 300,
      proteinGrams: '15.0',
      carbsGrams: '20.0',
      fatGrams: '12.0',
      isApproved: true,
      sourceReference: 'Test Recipe'
    },
    {
      name: 'Test Unapproved Recipe',
      description: 'This recipe is unapproved for testing',
      mealTypes: ['lunch'],
      dietaryTags: ['high-protein'],
      mainIngredientTags: ['chicken'],
      ingredientsJson: [
        { name: 'chicken breast', amount: '150', unit: 'g' },
        { name: 'rice', amount: '100', unit: 'g' }
      ],
      instructionsText: 'Cook chicken and serve with rice',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      servings: 1,
      caloriesKcal: 400,
      proteinGrams: '35.0',
      carbsGrams: '30.0',
      fatGrams: '8.0',
      isApproved: false,
      sourceReference: 'Test Recipe'
    }
  ];
  
  for (const recipe of testRecipes) {
    try {
      // Check if recipe exists
      const existingRecipes = await storage.getRecipesByName(recipe.name);
      
      if (existingRecipes.length === 0) {
        await storage.createRecipe(recipe);
        console.log(`✅ Created test recipe: ${recipe.name} (approved: ${recipe.isApproved})`);
      } else {
        console.log(`ℹ️  Test recipe exists: ${recipe.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating recipe ${recipe.name}:`, error);
      // Don't throw - recipes are optional for core business logic tests
    }
  }
}

/**
 * Setup complete test environment
 */
export async function setupTestEnvironment(): Promise<void> {
  try {
    console.log('🚀 Setting up test environment for business logic validation...');
    
    await ensureTestAccounts();
    await ensureTestRecipes();
    
    console.log('✅ Test environment setup complete!');
    console.log('');
    console.log('📋 Available test accounts:');
    TEST_ACCOUNTS.forEach(account => {
      console.log(`  ${account.role.toUpperCase()}: ${account.email} / ${account.password}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestEnvironment().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}