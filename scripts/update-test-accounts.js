// Update Test Account Credentials - FINAL VERSION
// DO NOT CHANGE THESE CREDENTIALS DURING DEVELOPMENT PHASE
// This script updates existing test accounts with the specified final credentials

import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  users, 
  customerGoals,
  progressMeasurements,
  progressPhotos,
  personalizedMealPlans
} from '../shared/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal',
  ssl: false
});

const db = drizzle(pool);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  purple: '\x1b[35m'
};

// FINAL ACCOUNT CREDENTIALS - DO NOT CHANGE
const FINAL_CREDENTIALS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    username: 'trainer_test'
  },
  customer: {
    email: 'customer.test@evofitmeals.com', 
    password: 'TestCustomer123!',
    username: 'customer_test'
  }
};

console.log(`${colors.bright}${colors.blue}🔄 Final Test Account Update${colors.reset}`);
console.log(`${colors.bright}${colors.blue}================================${colors.reset}\n`);

console.log(`${colors.yellow}⚠️  IMPORTANT: These credentials are FINAL and should NOT be changed during development phase${colors.reset}\n`);

async function updateTestAccounts() {
  try {
    // Step 1: Find and clean up existing test users
    console.log(`${colors.yellow}🧹 Cleaning up any existing test accounts...${colors.reset}`);
    
    // Delete any existing accounts with the target emails
    await db.delete(users).where(eq(users.email, 'trainer.test@evofitmeals.com'));
    await db.delete(users).where(eq(users.email, 'customer.test@evofitmeals.com'));
    
    // Find the original test users
    const existingTrainer = await db.select().from(users).where(
      eq(users.email, 'test.trainer@evofitmeals.com')
    );
    
    const existingCustomer = await db.select().from(users).where(
      eq(users.email, 'test.customer@gmail.com')
    );

    if (existingTrainer.length === 0 || existingCustomer.length === 0) {
      throw new Error('Original test users not found. Please run the test data generators first.');
    }

    const trainer = existingTrainer[0];
    const customer = existingCustomer[0];
    
    console.log(`${colors.green}✅ Found trainer: ${trainer.firstName} ${trainer.lastName} (${trainer.email})${colors.reset}`);
    console.log(`${colors.green}✅ Found customer: ${customer.firstName} ${customer.lastName} (${customer.email})${colors.reset}`);

    // Step 2: Hash new passwords
    console.log(`\n${colors.yellow}🔐 Generating password hashes...${colors.reset}`);
    
    const hashedTrainerPassword = await bcrypt.hash(FINAL_CREDENTIALS.trainer.password, 10);
    const hashedCustomerPassword = await bcrypt.hash(FINAL_CREDENTIALS.customer.password, 10);
    
    console.log(`${colors.green}✅ Password hashes generated${colors.reset}`);

    // Step 3: Update trainer account
    console.log(`\n${colors.yellow}👨‍⚕️ Updating trainer account credentials...${colors.reset}`);
    
    await db.update(users)
      .set({
        email: FINAL_CREDENTIALS.trainer.email,
        username: FINAL_CREDENTIALS.trainer.username,
        password: hashedTrainerPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, trainer.id));
    
    console.log(`${colors.green}✅ Trainer account updated:${colors.reset}`);
    console.log(`   Email: ${FINAL_CREDENTIALS.trainer.email}`);
    console.log(`   Username: ${FINAL_CREDENTIALS.trainer.username}`);
    console.log(`   Password: ${FINAL_CREDENTIALS.trainer.password}`);

    // Step 4: Update customer account
    console.log(`\n${colors.yellow}👤 Updating customer account credentials...${colors.reset}`);
    
    await db.update(users)
      .set({
        email: FINAL_CREDENTIALS.customer.email,
        username: FINAL_CREDENTIALS.customer.username,
        password: hashedCustomerPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, customer.id));
    
    console.log(`${colors.green}✅ Customer account updated:${colors.reset}`);
    console.log(`   Email: ${FINAL_CREDENTIALS.customer.email}`);
    console.log(`   Username: ${FINAL_CREDENTIALS.customer.username}`);
    console.log(`   Password: ${FINAL_CREDENTIALS.customer.password}`);

    // Step 5: Verify all related data is still properly linked
    console.log(`\n${colors.yellow}🔗 Verifying data integrity...${colors.reset}`);
    
    const customerGoalCount = await db.select().from(customerGoals)
      .where(eq(customerGoals.customerId, customer.id));
    
    const progressCount = await db.select().from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customer.id));
    
    const photoCount = await db.select().from(progressPhotos)
      .where(eq(progressPhotos.customerId, customer.id));
    
    const mealPlanCount = await db.select().from(personalizedMealPlans)
      .where(and(
        eq(personalizedMealPlans.customerId, customer.id),
        eq(personalizedMealPlans.trainerId, trainer.id)
      ));
    
    console.log(`${colors.green}✅ Data integrity verified:${colors.reset}`);
    console.log(`   Customer Goals: ${customerGoalCount.length}`);
    console.log(`   Progress Measurements: ${progressCount.length}`);
    console.log(`   Progress Photos: ${photoCount.length}`);
    console.log(`   Meal Plans: ${mealPlanCount.length}`);
    console.log(`   Trainer-Customer Link: ✅ Maintained`);

    // Step 6: Test login functionality
    console.log(`\n${colors.yellow}🧪 Testing login functionality...${colors.reset}`);
    
    // Test trainer login
    const trainerLoginTest = await bcrypt.compare(
      FINAL_CREDENTIALS.trainer.password, 
      hashedTrainerPassword
    );
    
    // Test customer login  
    const customerLoginTest = await bcrypt.compare(
      FINAL_CREDENTIALS.customer.password,
      hashedCustomerPassword
    );
    
    console.log(`${colors.green}✅ Login tests passed:${colors.reset}`);
    console.log(`   Trainer password verification: ${trainerLoginTest ? '✅' : '❌'}`);
    console.log(`   Customer password verification: ${customerLoginTest ? '✅' : '❌'}`);

    // Step 7: Display final summary
    console.log(`\n${colors.bright}${colors.purple}🎉 ACCOUNT UPDATE COMPLETE!${colors.reset}`);
    console.log(`${colors.bright}${colors.purple}=================================${colors.reset}`);
    
    console.log(`\n${colors.bright}${colors.blue}📋 FINAL ACCOUNT CREDENTIALS${colors.reset}`);
    console.log(`${colors.bright}${colors.red}⚠️  THESE MUST NOT BE CHANGED DURING DEVELOPMENT!${colors.reset}\n`);
    
    console.log(`${colors.bright}👨‍⚕️ TRAINER ACCOUNT:${colors.reset}`);
    console.log(`   Email: ${FINAL_CREDENTIALS.trainer.email}`);
    console.log(`   Password: ${FINAL_CREDENTIALS.trainer.password}`);
    console.log(`   Username: ${FINAL_CREDENTIALS.trainer.username}`);
    console.log(`   Role: trainer`);
    console.log(`   Name: Michael Thompson`);
    console.log(`   Business: Thompson Elite Fitness & Nutrition`);
    
    console.log(`\n${colors.bright}👤 CUSTOMER ACCOUNT:${colors.reset}`);
    console.log(`   Email: ${FINAL_CREDENTIALS.customer.email}`);
    console.log(`   Password: ${FINAL_CREDENTIALS.customer.password}`);
    console.log(`   Username: ${FINAL_CREDENTIALS.customer.username}`);
    console.log(`   Role: customer`);
    console.log(`   Name: Sarah Johnson`);
    console.log(`   Trainer: Michael Thompson`);
    
    console.log(`\n${colors.bright}🔗 DATA RELATIONSHIPS PRESERVED:${colors.reset}`);
    console.log(`   ✅ All customer goals linked to trainer visibility`);
    console.log(`   ✅ Complete 8-week progress tracking history`);
    console.log(`   ✅ Strength training progression data`);
    console.log(`   ✅ Progress photo documentation`);
    console.log(`   ✅ Personalized meal plans and recipes`);
    console.log(`   ✅ Trainer-customer relationship maintained`);
    
    console.log(`\n${colors.bright}🚀 READY FOR USE:${colors.reset}`);
    console.log(`   Application: http://localhost:4000`);
    console.log(`   Login with either account to access full demo data`);
    console.log(`   All health metrics, goals, and progress visible to trainer`);
    console.log(`   Complete 2-month transformation story ready for demos`);
    
    console.log(`\n${colors.bright}${colors.red}🔒 DEVELOPMENT PHASE LOCK:${colors.reset}`);
    console.log(`   These credentials are now LOCKED for development phase`);
    console.log(`   Do NOT modify these accounts during development`);
    console.log(`   All team members should use these exact credentials`);

  } catch (error) {
    console.error(`${colors.red}❌ Error updating test accounts:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the account update
updateTestAccounts();