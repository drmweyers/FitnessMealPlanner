/**
 * Playwright Test Setup and Cleanup
 * Creates test accounts and sets up the testing environment
 */

import { config } from "dotenv";
config();

// Test account credentials - consistent across all tests
export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    role: 'admin',
    expectedPath: '/admin',
    dashboardText: 'Admin Dashboard'
  },
  trainer: {
    email: 'testtrainer@example.com',
    password: 'TrainerPassword123!',
    role: 'trainer',
    expectedPath: '/trainer',
    dashboardText: 'Trainer Dashboard'
  },
  customer: {
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
    role: 'customer',
    expectedPath: '/my-meal-plans',
    dashboardText: 'My Meal Plans'
  }
};

/**
 * Setup test environment and create necessary test accounts
 */
export async function setupTestEnvironment() {
  console.log('🚀 Setting up Playwright test environment...');
  
  try {
    // Dynamic import to ensure SSL certificate is configured first
    const { storage } = await import("../server/storage");
    const { hashPassword } = await import("../server/auth");
    
    // Create test accounts
    for (const [accountType, account] of Object.entries(TEST_ACCOUNTS)) {
      try {
        const existingUser = await storage.getUserByEmail(account.email);
        if (!existingUser) {
          const hashedPassword = await hashPassword(account.password);
          await storage.createUser({
            email: account.email,
            password: hashedPassword,
            role: account.role as any,
          });
          console.log(`✅ Created test ${accountType}: ${account.email}`);
        } else {
          console.log(`✅ Test ${accountType} already exists: ${account.email}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create test ${accountType}:`, error);
      }
    }
    
    console.log('✅ Test environment setup completed');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment() {
  console.log('🧹 Cleaning up test environment...');
  // Add any cleanup logic here if needed
  console.log('✅ Cleanup completed');
}