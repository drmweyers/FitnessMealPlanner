#!/usr/bin/env npx tsx
/**
 * Comprehensive Test Data Seeding Script for FitnessMealPlanner
 * 
 * Purpose: Populate database with test data at all levels to validate
 * the 3-tier Stripe subscription system limits.
 * 
 * Tier Limits:
 * - Starter: 9 customers, 50 meal plans
 * - Professional: 20 customers, 200 meal plans  
 * - Enterprise: 50 customers, 500 meal plans
 * 
 * Usage:
 *   npm run seed:comprehensive-test
 * 
 * Note: Reads DATABASE_URL from .env file
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, sql } from 'drizzle-orm';
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
  recipeFavorites,
  recipes,
} from '../../shared/schema';

// Configuration
const TIERS = {
  starter: {
    email: 'trainer.starter@evofitmeals.com',
    password: 'StarterPass123!',
    name: 'Starter',
    customerLimit: 9,
    mealPlanLimit: 50,
    customersToCreate: 10, // 9 + 1 to test limit
    mealPlansToCreate: 50,
  },
  professional: {
    email: 'trainer.professional@evofitmeals.com',
    password: 'ProfessionalPass123!',
    name: 'Professional',
    customerLimit: 20,
    mealPlanLimit: 200,
    customersToCreate: 21, // 20 + 1 to test limit
    mealPlansToCreate: 100,
  },
  enterprise: {
    email: 'trainer.enterprise@evofitmeals.com',
    password: 'EnterprisePass123!',
    name: 'Enterprise',
    customerLimit: 50,
    mealPlanLimit: 500,
    customersToCreate: 25, // Under limit
    mealPlansToCreate: 150,
  },
};

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5433/fitmeal';

// SSL Certificate handling (matches server/db.ts)
const normalizeCertificate = (rawCertificate: string): string => {
  const trimmed = rawCertificate.trim();
  if (!trimmed.startsWith("-----BEGIN CERTIFICATE-----")) {
    return trimmed;
  }
  const header = "-----BEGIN CERTIFICATE-----";
  const footer = "-----END CERTIFICATE-----";
  const body = trimmed
    .replace(header, "")
    .replace(footer, "")
    .replace(/[\s\r\n]+/g, "");
  const chunkedBody = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `${header}\n${chunkedBody}\n${footer}\n`;
};

const getSslConfig = () => {
  const sslMode = process.env.DB_SSL_MODE?.toLowerCase();
  const databaseUrl = connectionString;
  const caCertificate = process.env.DATABASE_CA_CERT;
  const caCertificateFile = process.env.NODE_EXTRA_CA_CERTS;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (sslMode === "disable") {
    console.log("DB_SSL_MODE=disable detected - SSL disabled");
    return false;
  }

  if (caCertificate) {
    console.log("Using DATABASE_CA_CERT for SSL verification");
    return { rejectUnauthorized: true, ca: normalizeCertificate(caCertificate) };
  }

  if (isDevelopment) {
    if (databaseUrl.includes("localhost") || databaseUrl.includes("postgres:5432")) {
      console.log("Local database detected - SSL disabled");
      return false;
    }
    console.log("Remote development database - SSL enabled with relaxed validation");
    return { rejectUnauthorized: false };
  }

  // Production environments
  console.log("Database SSL mode: Production");
  
  if (caCertificateFile) {
    console.log(`Using NODE_EXTRA_CA_CERTS: ${caCertificateFile}`);
    return { rejectUnauthorized: true };
  }

  if (sslMode === "require") {
    console.warn("DB_SSL_MODE=require but no CA certificate provided. Falling back to relaxed SSL validation.");
    return { rejectUnauthorized: false };
  }

  console.log("No CA certificate provided. Using relaxed SSL validation for production.");
  return { rejectUnauthorized: false };
};

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE TEST DATA SEEDING SCRIPT');
  console.log('  FitnessMealPlanner - 3-Tier System Testing');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const pool = new Pool({ 
    connectionString,
    ssl: getSslConfig(),
  });
  const db = drizzle(pool);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully\n');

    // Step 1: Create Trainers
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Creating Trainer Accounts');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const trainerIds: Record<string, string> = {};

    for (const [tierName, config] of Object.entries(TIERS)) {
      const trainerId = await createOrGetTrainer(db, config, tierName as keyof typeof TIERS);
      trainerIds[tierName] = trainerId;
      console.log(`  ✅ ${tierName.toUpperCase()} trainer: ${config.email}`);
    }
    console.log('');

    // Step 2: Create Subscriptions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Creating Tier Subscriptions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [tierName, trainerId] of Object.entries(trainerIds)) {
      await createSubscription(db, trainerId, tierName as keyof typeof TIERS);
      console.log(`  ✅ ${tierName.toUpperCase()} subscription activated`);
    }
    console.log('');

    // Step 3: Create Customers
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Creating Customer Accounts');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const customersByTrainer: Record<string, string[]> = {};

    for (const [tierName, config] of Object.entries(TIERS)) {
      const trainerId = trainerIds[tierName];
      const customerIds = await createCustomers(
        db,
        trainerId,
        tierName,
        config.customersToCreate
      );
      customersByTrainer[tierName] = customerIds;
      console.log(`  ✅ ${tierName.toUpperCase()}: ${customerIds.length} customers created`);
    }
    console.log('');

    // Step 4: Create Meal Plans
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Creating Meal Plans');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [tierName, config] of Object.entries(TIERS)) {
      const trainerId = trainerIds[tierName];
      const customerIds = customersByTrainer[tierName];
      await createMealPlans(db, trainerId, customerIds, config.mealPlansToCreate);
      console.log(`  ✅ ${tierName.toUpperCase()}: ${config.mealPlansToCreate} meal plans created`);
    }
    console.log('');

    // Step 5: Create Progress Data
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Creating Progress Measurements');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [tierName, customerIds] of Object.entries(customersByTrainer)) {
      let measurementsCount = 0;
      for (const customerId of customerIds.slice(0, 10)) { // First 10 customers per tier
        await createProgressMeasurements(db, customerId);
        measurementsCount += 5;
      }
      console.log(`  ✅ ${tierName.toUpperCase()}: ${measurementsCount} measurements created`);
    }
    console.log('');

    // Step 6: Create Grocery Lists
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: Creating Grocery Lists');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [tierName, customerIds] of Object.entries(customersByTrainer)) {
      let listsCount = 0;
      for (const customerId of customerIds.slice(0, 10)) {
        await createGroceryLists(db, customerId);
        listsCount += 2;
      }
      console.log(`  ✅ ${tierName.toUpperCase()}: ${listsCount} grocery lists created`);
    }
    console.log('');

    // Step 7: Update Usage Tracking
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 7: Updating Usage Tracking');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [tierName, config] of Object.entries(TIERS)) {
      const trainerId = trainerIds[tierName];
      const customerCount = customersByTrainer[tierName].length;
      await updateUsageTracking(db, trainerId, customerCount, config.mealPlansToCreate);
      console.log(`  ✅ ${tierName.toUpperCase()}: Usage tracking updated`);
    }
    console.log('');

    // Print Summary
    await printSummary(pool);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createOrGetTrainer(
  db: any, 
  config: typeof TIERS.starter, 
  tier: keyof typeof TIERS
): Promise<string> {
  const existing = await db.select().from(users).where(eq(users.email, config.email));

  if (existing.length > 0) {
    // Update password and return existing ID
    const hashedPassword = await bcrypt.hash(config.password, 10);
    await db.update(users)
      .set({ password: hashedPassword, name: config.name, updatedAt: new Date() })
      .where(eq(users.email, config.email));
    return existing[0].id;
  }

  const hashedPassword = await bcrypt.hash(config.password, 10);
  const [trainer] = await db.insert(users).values({
    email: config.email,
    password: hashedPassword,
    name: config.name,
    role: 'trainer',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return trainer.id;
}

async function createSubscription(db: any, trainerId: string, tier: keyof typeof TIERS) {
  // Delete existing subscription
  await db.delete(trainerSubscriptions).where(eq(trainerSubscriptions.trainerId, trainerId));

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [subscription] = await db.insert(trainerSubscriptions).values({
    trainerId,
    stripeCustomerId: `cus_test_${tier}_${trainerId.slice(0, 8)}`,
    stripeSubscriptionId: `sub_test_${tier}_${trainerId.slice(0, 8)}`,
    tier,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  // Create subscription item
  await db.insert(subscriptionItems).values({
    subscriptionId: subscription.id,
    kind: 'tier',
    stripePriceId: `price_${tier}_test`,
    stripeSubscriptionItemId: `si_test_${tier}_${subscription.id.slice(0, 8)}`,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
}

async function createCustomers(
  db: any, 
  trainerId: string, 
  tierName: string, 
  count: number
): Promise<string[]> {
  const customerIds: string[] = [];
  const password = 'CustomerPass123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  for (let i = 1; i <= count; i++) {
    const email = `customer${i}.${tierName}@test.evofitmeals.com`;

    // Check if exists
    const existing = await db.select().from(users).where(eq(users.email, email));

    let customerId: string;
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const [customer] = await db.insert(users).values({
        email,
        password: hashedPassword,
        name: `Test Customer ${i} (${tierName})`,
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      customerId = customer.id;
    }

    customerIds.push(customerId);

    // Create trainer-customer relationship via invitation
    const existingInvitation = await db.select()
      .from(customerInvitations)
      .where(and(
        eq(customerInvitations.trainerId, trainerId),
        eq(customerInvitations.customerEmail, email)
      ));

    if (existingInvitation.length === 0) {
      await db.insert(customerInvitations).values({
        trainerId,
        customerEmail: email,
        token: uuidv4(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        usedAt: new Date(), // Mark as used
        createdAt: new Date(),
      });
    }
  }

  return customerIds;
}

async function createMealPlans(
  db: any, 
  trainerId: string, 
  customerIds: string[], 
  count: number
) {
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const fitnessGoals = ['weight_loss', 'muscle_gain', 'maintenance', 'athletic_performance'];

  for (let i = 0; i < count; i++) {
    const customerId = customerIds[i % customerIds.length];
    const planName = `Test Meal Plan ${i + 1}`;

    const mealPlanData = {
      id: uuidv4(),
      planName,
      fitnessGoal: fitnessGoals[i % fitnessGoals.length],
      dailyCalorieTarget: 1800 + (i % 10) * 100,
      days: 7,
      mealsPerDay: 3,
      generatedBy: trainerId,
      createdAt: new Date(),
      meals: Array.from({ length: 21 }, (_, j) => ({
        day: Math.floor(j / 3) + 1,
        mealNumber: (j % 3) + 1,
        mealType: mealTypes[j % 3],
        manual: `Sample meal ${j + 1}`,
        manualNutrition: {
          calories: 400 + (j % 5) * 50,
          protein: 25 + (j % 5) * 5,
          carbs: 45 + (j % 5) * 5,
          fat: 15 + (j % 3) * 5,
        },
      })),
    };

    // Create trainer meal plan
    const [trainerPlan] = await db.insert(trainerMealPlans).values({
      trainerId,
      mealPlanData,
      isTemplate: i % 5 === 0, // Every 5th is a template
      tags: ['test', fitnessGoals[i % fitnessGoals.length]],
      notes: `Auto-generated test plan ${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Assign to customer
    await db.insert(personalizedMealPlans).values({
      customerId,
      trainerId,
      mealPlanData,
      assignedAt: new Date(),
    });

    // Create assignment record
    await db.insert(mealPlanAssignments).values({
      mealPlanId: trainerPlan.id,
      customerId,
      assignedBy: trainerId,
      assignedAt: new Date(),
      notes: 'Auto-assigned during test seeding',
    });
  }
}

async function createProgressMeasurements(db: any, customerId: string) {
  const now = new Date();

  for (let i = 0; i < 5; i++) {
    const measurementDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

    await db.insert(progressMeasurements).values({
      customerId,
      measurementDate,
      weightKg: (75 - i * 0.5).toFixed(2),
      weightLbs: ((75 - i * 0.5) * 2.205).toFixed(2),
      waistCm: (85 - i * 0.3).toFixed(1),
      chestCm: (100 + i * 0.2).toFixed(1),
      bodyFatPercentage: (18 - i * 0.2).toFixed(1),
      notes: `Week ${5 - i} measurement`,
      createdAt: measurementDate,
    }).onConflictDoNothing();
  }
}

async function createGroceryLists(db: any, customerId: string) {
  const categories = ['produce', 'meat', 'dairy', 'pantry', 'beverages'];
  const items = [
    { name: 'Chicken Breast', category: 'meat', quantity: 2, unit: 'lbs' },
    { name: 'Brown Rice', category: 'pantry', quantity: 1, unit: 'bag' },
    { name: 'Broccoli', category: 'produce', quantity: 3, unit: 'heads' },
    { name: 'Greek Yogurt', category: 'dairy', quantity: 2, unit: 'containers' },
    { name: 'Eggs', category: 'dairy', quantity: 1, unit: 'dozen' },
    { name: 'Olive Oil', category: 'pantry', quantity: 1, unit: 'bottle' },
    { name: 'Spinach', category: 'produce', quantity: 2, unit: 'bags' },
    { name: 'Almonds', category: 'pantry', quantity: 1, unit: 'bag' },
  ];

  for (let listNum = 1; listNum <= 2; listNum++) {
    const [list] = await db.insert(groceryLists).values({
      customerId,
      name: `Weekly Groceries ${listNum}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Add items
    for (const item of items.slice(0, 5 + listNum)) {
      await db.insert(groceryListItems).values({
        groceryListId: list.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        isChecked: Math.random() > 0.5,
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

async function updateUsageTracking(
  db: any, 
  trainerId: string, 
  customerCount: number, 
  mealPlanCount: number
) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Delete existing tracking
  await db.delete(tierUsageTracking).where(eq(tierUsageTracking.trainerId, trainerId));

  await db.insert(tierUsageTracking).values({
    trainerId,
    periodStart,
    periodEnd,
    customersCount: customerCount,
    mealPlansCount: mealPlanCount,
    aiGenerationsCount: Math.floor(Math.random() * 50),
    exportsCsvCount: Math.floor(Math.random() * 20),
    exportsExcelCount: Math.floor(Math.random() * 10),
    exportsPdfCount: Math.floor(Math.random() * 30),
    createdAt: now,
    updatedAt: now,
  });
}

async function printSummary(pool: Pool) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SEEDING COMPLETE - SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Query summary data
  const result = await pool.query(`
    SELECT 
      u.email,
      u.role,
      ts.tier,
      ts.status,
      COALESCE(tut.customers_count, 0) as customers_count,
      COALESCE(tut.meal_plans_count, 0) as meal_plans_count
    FROM users u
    LEFT JOIN trainer_subscriptions ts ON u.id = ts.trainer_id
    LEFT JOIN tier_usage_tracking tut ON u.id = tut.trainer_id
    WHERE u.role = 'trainer'
    AND u.email LIKE '%@evofitmeals.com'
    ORDER BY 
      CASE ts.tier
        WHEN 'starter' THEN 1
        WHEN 'professional' THEN 2
        WHEN 'enterprise' THEN 3
      END
  `);

  console.log('TRAINER SUBSCRIPTIONS:');
  console.table(result.rows);

  // Count totals
  const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'trainer') as trainers,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') as customers,
      (SELECT COUNT(*) FROM trainer_meal_plans) as trainer_meal_plans,
      (SELECT COUNT(*) FROM personalized_meal_plans) as assigned_meal_plans,
      (SELECT COUNT(*) FROM progress_measurements) as measurements,
      (SELECT COUNT(*) FROM grocery_lists) as grocery_lists
  `);

  console.log('');
  console.log('TOTAL DATA COUNTS:');
  console.table(totals.rows);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('TRAINERS:');
  console.log('  Starter:      trainer.starter@evofitmeals.com / StarterPass123!');
  console.log('  Professional: trainer.professional@evofitmeals.com / ProfessionalPass123!');
  console.log('  Enterprise:   trainer.enterprise@evofitmeals.com / EnterprisePass123!');
  console.log('');
  console.log('CUSTOMERS (pattern):');
  console.log('  customer{N}.{tier}@test.evofitmeals.com / CustomerPass123!');
  console.log('  Example: customer1.starter@test.evofitmeals.com');
  console.log('');
  console.log('TIER LIMITS:');
  console.log('  Starter:      9 customers, 50 meal plans');
  console.log('  Professional: 20 customers, 200 meal plans');
  console.log('  Enterprise:   50 customers, 500 meal plans');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ SEEDING COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════');
}

// Run the script
main().catch(console.error);
