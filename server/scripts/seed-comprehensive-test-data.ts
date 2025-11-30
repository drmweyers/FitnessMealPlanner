/**
 * Comprehensive Test Data Seeding Script
 *
 * Purpose: Populate FitnessMealPlanner with complete test data across all tiers
 *
 * Creates:
 * - 3 Trainer accounts (Starter, Professional, Enterprise)
 * - Customers at/near tier limits for each trainer
 * - Meal plans, progress measurements, grocery lists
 * - Proper tier subscriptions and usage tracking
 *
 * Usage: DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" npx tsx server/scripts/seed-comprehensive-test-data.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import {
  users,
  trainerSubscriptions,
  subscriptionItems,
  tierUsageTracking,
  customerInvitations,
  personalizedMealPlans,
  trainerMealPlans,
  mealPlanAssignments,
  progressMeasurements,
  groceryLists,
  groceryListItems,
  recipes
} from '@shared/schema';

// Configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

// Tier limits for testing
const TIER_LIMITS = {
  starter: { customers: 9, mealPlans: 50 },
  professional: { customers: 20, mealPlans: 200 },
  enterprise: { customers: 50, mealPlans: 500 }
};

// Test data configuration - creates customers at/near limits
const TEST_CONFIG = {
  starter: { customers: 10, mealPlansPerCustomer: 5 },      // Over limit to test enforcement
  professional: { customers: 21, mealPlansPerCustomer: 5 }, // Over limit to test enforcement
  enterprise: { customers: 25, mealPlansPerCustomer: 6 }    // Under limit
};

interface TrainerData {
  id: string;
  email: string;
  name: string;
  tier: 'starter' | 'professional' | 'enterprise';
  password: string;
}

interface CustomerData {
  id: string;
  email: string;
  name: string;
  trainerId: string;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function seedTrainers(): Promise<TrainerData[]> {
  console.log('\n📋 Creating Trainer Accounts...\n');

  const trainers: TrainerData[] = [
    {
      id: uuidv4(),
      email: 'trainer.starter@test.evofitmeals.com',
      name: 'Sarah Starter',
      tier: 'starter',
      password: 'TestTrainer123!'
    },
    {
      id: uuidv4(),
      email: 'trainer.professional@test.evofitmeals.com',
      name: 'Paul Professional',
      tier: 'professional',
      password: 'TestTrainer123!'
    },
    {
      id: uuidv4(),
      email: 'trainer.enterprise@test.evofitmeals.com',
      name: 'Emma Enterprise',
      tier: 'enterprise',
      password: 'TestTrainer123!'
    }
  ];

  for (const trainer of trainers) {
    // Check if trainer exists
    const existing = await db.select().from(users).where(eq(users.email, trainer.email));

    const hashedPassword = await hashPassword(trainer.password);

    if (existing.length > 0) {
      // Update existing trainer
      await db.update(users)
        .set({
          password: hashedPassword,
          name: trainer.name,
          role: 'trainer',
          updatedAt: new Date()
        })
        .where(eq(users.email, trainer.email));
      trainer.id = existing[0].id;
      console.log(`✅ Updated trainer: ${trainer.email} (${trainer.tier})`);
    } else {
      // Create new trainer
      await db.insert(users).values({
        id: trainer.id,
        email: trainer.email,
        password: hashedPassword,
        name: trainer.name,
        role: 'trainer',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Created trainer: ${trainer.email} (${trainer.tier})`);
    }
  }

  return trainers;
}

async function seedSubscriptions(trainers: TrainerData[]): Promise<void> {
  console.log('\n💳 Creating Stripe Subscriptions...\n');

  for (const trainer of trainers) {
    // Delete existing subscription for this trainer
    await db.delete(trainerSubscriptions).where(eq(trainerSubscriptions.trainerId, trainer.id));

    const subscriptionId = uuidv4();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Create subscription
    await db.insert(trainerSubscriptions).values({
      id: subscriptionId,
      trainerId: trainer.id,
      stripeCustomerId: `cus_test_${trainer.tier}_${trainer.id.substring(0, 8)}`,
      stripeSubscriptionId: `sub_test_${trainer.tier}_${trainer.id.substring(0, 8)}`,
      tier: trainer.tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now
    });

    // Create subscription item
    await db.insert(subscriptionItems).values({
      id: uuidv4(),
      subscriptionId: subscriptionId,
      kind: 'tier',
      stripePriceId: `price_${trainer.tier}_test`,
      stripeSubscriptionItemId: `si_test_${trainer.tier}_${subscriptionId.substring(0, 8)}`,
      status: 'active'
    });

    console.log(`✅ Created ${trainer.tier} subscription for ${trainer.email}`);
  }
}

async function seedCustomers(trainers: TrainerData[]): Promise<CustomerData[]> {
  console.log('\n👥 Creating Customer Accounts...\n');

  const allCustomers: CustomerData[] = [];

  for (const trainer of trainers) {
    const config = TEST_CONFIG[trainer.tier];
    const customers: CustomerData[] = [];

    for (let i = 1; i <= config.customers; i++) {
      const customer: CustomerData = {
        id: uuidv4(),
        email: `customer${i}.${trainer.tier}@test.evofitmeals.com`,
        name: `Customer ${i} (${trainer.tier})`,
        trainerId: trainer.id
      };

      // Check if customer exists
      const existing = await db.select().from(users).where(eq(users.email, customer.email));
      const hashedPassword = await hashPassword('TestCustomer123!');

      if (existing.length > 0) {
        await db.update(users)
          .set({
            password: hashedPassword,
            name: customer.name,
            role: 'customer',
            trainerId: trainer.id,
            updatedAt: new Date()
          })
          .where(eq(users.email, customer.email));
        customer.id = existing[0].id;
      } else {
        await db.insert(users).values({
          id: customer.id,
          email: customer.email,
          password: hashedPassword,
          name: customer.name,
          role: 'customer',
          trainerId: trainer.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      customers.push(customer);
      allCustomers.push(customer);
    }

    console.log(`✅ Created ${customers.length} customers for ${trainer.name} (${trainer.tier})`);
    console.log(`   Tier limit: ${TIER_LIMITS[trainer.tier].customers} | Created: ${customers.length}`);
  }

  return allCustomers;
}

async function seedMealPlans(trainers: TrainerData[], customers: CustomerData[]): Promise<void> {
  console.log('\n🍽️ Creating Meal Plans...\n');

  // Get some recipes for meal plan data
  const recipeList = await db.select().from(recipes).limit(20);

  const sampleMealPlanData = {
    planName: 'Test Meal Plan',
    duration: 7,
    mealsPerDay: 3,
    targetCalories: 2000,
    proteinTarget: 150,
    carbsTarget: 200,
    fatTarget: 70,
    days: [
      {
        day: 1,
        meals: [
          { mealType: 'breakfast', recipeId: recipeList[0]?.id || null, recipeName: 'Breakfast Item' },
          { mealType: 'lunch', recipeId: recipeList[1]?.id || null, recipeName: 'Lunch Item' },
          { mealType: 'dinner', recipeId: recipeList[2]?.id || null, recipeName: 'Dinner Item' }
        ]
      }
    ]
  };

  for (const trainer of trainers) {
    const config = TEST_CONFIG[trainer.tier];
    const trainerCustomers = customers.filter(c => c.trainerId === trainer.id);
    let totalMealPlans = 0;

    for (const customer of trainerCustomers) {
      for (let i = 1; i <= config.mealPlansPerCustomer; i++) {
        const mealPlanId = uuidv4();

        // Create personalized meal plan
        await db.insert(personalizedMealPlans).values({
          id: mealPlanId,
          trainerId: trainer.id,
          customerId: customer.id,
          mealPlanData: {
            ...sampleMealPlanData,
            planName: `Meal Plan ${i} for ${customer.name}`
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        totalMealPlans++;
      }
    }

    console.log(`✅ Created ${totalMealPlans} meal plans for ${trainer.name} (${trainer.tier})`);
    console.log(`   Tier limit: ${TIER_LIMITS[trainer.tier].mealPlans} | Created: ${totalMealPlans}`);
  }
}

async function seedProgressMeasurements(customers: CustomerData[]): Promise<void> {
  console.log('\n📊 Creating Progress Measurements...\n');

  let totalMeasurements = 0;

  for (const customer of customers) {
    // Create 3 measurements per customer (past 3 weeks)
    for (let weekAgo = 0; weekAgo < 3; weekAgo++) {
      const measurementDate = new Date();
      measurementDate.setDate(measurementDate.getDate() - (weekAgo * 7));

      await db.insert(progressMeasurements).values({
        id: uuidv4(),
        customerId: customer.id,
        trainerId: customer.trainerId,
        measurementDate: measurementDate,
        weight: 70 + Math.random() * 20,           // 70-90 kg
        bodyFatPercentage: 15 + Math.random() * 15, // 15-30%
        muscleMass: 30 + Math.random() * 10,        // 30-40 kg
        chest: 90 + Math.random() * 20,             // 90-110 cm
        waist: 75 + Math.random() * 20,             // 75-95 cm
        hips: 95 + Math.random() * 15,              // 95-110 cm
        arms: 30 + Math.random() * 10,              // 30-40 cm
        thighs: 55 + Math.random() * 10,            // 55-65 cm
        notes: `Week ${3 - weekAgo} progress check`,
        createdAt: measurementDate,
        updatedAt: measurementDate
      });

      totalMeasurements++;
    }
  }

  console.log(`✅ Created ${totalMeasurements} progress measurements across all customers`);
}

async function seedGroceryLists(customers: CustomerData[]): Promise<void> {
  console.log('\n🛒 Creating Grocery Lists...\n');

  let totalLists = 0;

  const groceryItems = [
    { name: 'Chicken Breast', quantity: 2, unit: 'lbs', category: 'protein' },
    { name: 'Brown Rice', quantity: 1, unit: 'kg', category: 'grains' },
    { name: 'Broccoli', quantity: 2, unit: 'heads', category: 'vegetables' },
    { name: 'Eggs', quantity: 12, unit: 'count', category: 'protein' },
    { name: 'Olive Oil', quantity: 1, unit: 'bottle', category: 'fats' },
    { name: 'Greek Yogurt', quantity: 500, unit: 'g', category: 'dairy' },
    { name: 'Salmon', quantity: 1, unit: 'lb', category: 'protein' },
    { name: 'Sweet Potatoes', quantity: 4, unit: 'count', category: 'vegetables' }
  ];

  for (const customer of customers.slice(0, 20)) { // Create for first 20 customers
    const groceryListId = uuidv4();

    await db.insert(groceryLists).values({
      id: groceryListId,
      customerId: customer.id,
      name: `Weekly Grocery List - ${customer.name}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add items to the grocery list
    for (const item of groceryItems) {
      await db.insert(groceryListItems).values({
        id: uuidv4(),
        groceryListId: groceryListId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: Math.random() > 0.5, // Randomly check some items
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    totalLists++;
  }

  console.log(`✅ Created ${totalLists} grocery lists with items`);
}

async function updateUsageTracking(trainers: TrainerData[], customers: CustomerData[]): Promise<void> {
  console.log('\n📈 Updating Usage Tracking...\n');

  for (const trainer of trainers) {
    const trainerCustomers = customers.filter(c => c.trainerId === trainer.id);
    const config = TEST_CONFIG[trainer.tier];
    const totalMealPlans = trainerCustomers.length * config.mealPlansPerCustomer;

    // Delete existing usage tracking
    await db.delete(tierUsageTracking).where(eq(tierUsageTracking.trainerId, trainer.id));

    // Create new usage tracking
    await db.insert(tierUsageTracking).values({
      id: uuidv4(),
      trainerId: trainer.id,
      customerCount: trainerCustomers.length,
      mealPlanCount: totalMealPlans,
      recipeCount: 0, // Not tracking custom recipes in this seed
      aiGenerationsUsed: Math.floor(Math.random() * 50),
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Updated usage tracking for ${trainer.name}:`);
    console.log(`   Customers: ${trainerCustomers.length}/${TIER_LIMITS[trainer.tier].customers}`);
    console.log(`   Meal Plans: ${totalMealPlans}/${TIER_LIMITS[trainer.tier].mealPlans}`);
  }
}

async function printSummary(trainers: TrainerData[], customers: CustomerData[]): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEEDING COMPLETE - SUMMARY');
  console.log('='.repeat(60));

  console.log('\n🔐 TEST CREDENTIALS:');
  console.log('-'.repeat(40));

  for (const trainer of trainers) {
    console.log(`\n${trainer.tier.toUpperCase()} TIER:`);
    console.log(`  Trainer: ${trainer.email} / TestTrainer123!`);

    const trainerCustomers = customers.filter(c => c.trainerId === trainer.id);
    console.log(`  Customers: ${trainerCustomers.length} (limit: ${TIER_LIMITS[trainer.tier].customers})`);
    console.log(`  Sample Customer: ${trainerCustomers[0]?.email} / TestCustomer123!`);
  }

  console.log('\n📊 DATA CREATED:');
  console.log('-'.repeat(40));
  console.log(`  Trainers: 3 (one per tier)`);
  console.log(`  Total Customers: ${customers.length}`);
  console.log(`  Subscriptions: 3 active`);
  console.log(`  Progress Measurements: ${customers.length * 3}`);
  console.log(`  Grocery Lists: ${Math.min(customers.length, 20)}`);

  console.log('\n🧪 TIER LIMIT TESTING:');
  console.log('-'.repeat(40));
  for (const trainer of trainers) {
    const trainerCustomers = customers.filter(c => c.trainerId === trainer.id);
    const config = TEST_CONFIG[trainer.tier];
    const totalMealPlans = trainerCustomers.length * config.mealPlansPerCustomer;

    const customerStatus = trainerCustomers.length > TIER_LIMITS[trainer.tier].customers ? '⚠️ OVER LIMIT' : '✅ OK';
    const mealPlanStatus = totalMealPlans > TIER_LIMITS[trainer.tier].mealPlans ? '⚠️ OVER LIMIT' : '✅ OK';

    console.log(`  ${trainer.tier}:`);
    console.log(`    Customers: ${trainerCustomers.length}/${TIER_LIMITS[trainer.tier].customers} ${customerStatus}`);
    console.log(`    Meal Plans: ${totalMealPlans}/${TIER_LIMITS[trainer.tier].mealPlans} ${mealPlanStatus}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Seeding complete! Test the tier enforcement in the UI.');
  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  console.log('\n🚀 Starting Comprehensive Test Data Seeding...');
  console.log('='.repeat(60));

  try {
    // Step 1: Create trainers
    const trainers = await seedTrainers();

    // Step 2: Create subscriptions
    await seedSubscriptions(trainers);

    // Step 3: Create customers
    const customers = await seedCustomers(trainers);

    // Step 4: Create meal plans
    await seedMealPlans(trainers, customers);

    // Step 5: Create progress measurements
    await seedProgressMeasurements(customers);

    // Step 6: Create grocery lists
    await seedGroceryLists(customers);

    // Step 7: Update usage tracking
    await updateUsageTracking(trainers, customers);

    // Step 8: Print summary
    await printSummary(trainers, customers);

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seeding
main().catch(console.error);
