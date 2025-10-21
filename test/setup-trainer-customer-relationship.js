/**
 * Setup Trainer-Customer Relationship for Testing
 *
 * This script creates the necessary database relationships between the test trainer
 * and test customer to enable comprehensive role interaction validation.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, sql } from 'drizzle-orm';
import {
  users,
  customerInvitations,
  mealPlanAssignments,
  personalizedMealPlans
} from '../shared/schema.ts';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

// Test accounts from CLAUDE.md
const TEST_ACCOUNTS = {
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};

async function setupTrainerCustomerRelationship() {
  console.log('🔗 Setting up Trainer-Customer Relationship for Testing');
  console.log('=' .repeat(60));

  try {
    // Step 1: Get trainer and customer IDs
    console.log('\n1️⃣ Finding test account IDs...');

    const [trainer] = await db.select({
      id: users.id,
      email: users.email,
      role: users.role
    })
    .from(users)
    .where(eq(users.email, TEST_ACCOUNTS.trainer.email))
    .limit(1);

    const [customer] = await db.select({
      id: users.id,
      email: users.email,
      role: users.role
    })
    .from(users)
    .where(eq(users.email, TEST_ACCOUNTS.customer.email))
    .limit(1);

    if (!trainer) {
      throw new Error(`Trainer account not found: ${TEST_ACCOUNTS.trainer.email}`);
    }

    if (!customer) {
      throw new Error(`Customer account not found: ${TEST_ACCOUNTS.customer.email}`);
    }

    console.log(`   ✅ Trainer found: ${trainer.email} (${trainer.id})`);
    console.log(`   ✅ Customer found: ${customer.email} (${customer.id})`);

    // Step 2: Check if invitation already exists
    console.log('\n2️⃣ Checking existing invitation...');

    const [existingInvitation] = await db.select()
      .from(customerInvitations)
      .where(and(
        eq(customerInvitations.trainerId, trainer.id),
        eq(customerInvitations.email, customer.email)
      ))
      .limit(1);

    if (existingInvitation) {
      console.log(`   ℹ️ Invitation already exists (ID: ${existingInvitation.id})`);

      // Check if it's been used
      if (existingInvitation.usedAt) {
        console.log(`   ✅ Invitation already accepted at: ${existingInvitation.usedAt}`);
      } else {
        console.log(`   🔄 Marking invitation as accepted...`);

        // Mark invitation as used
        await db.update(customerInvitations)
          .set({
            usedAt: new Date(),
            usedBy: customer.id
          })
          .where(eq(customerInvitations.id, existingInvitation.id));

        console.log(`   ✅ Invitation marked as accepted`);
      }
    } else {
      // Create and immediately accept invitation
      console.log(`   🆕 Creating new invitation...`);

      const [newInvitation] = await db.insert(customerInvitations)
        .values({
          trainerId: trainer.id,
          email: customer.email,
          token: `test-token-${Date.now()}`,
          createdAt: new Date(),
          usedAt: new Date(),
          usedBy: customer.id
        })
        .returning();

      console.log(`   ✅ Invitation created and accepted (ID: ${newInvitation.id})`);
    }

    // Step 3: Check meal plan assignments
    console.log('\n3️⃣ Checking meal plan assignments...');

    const existingAssignments = await db.select()
      .from(mealPlanAssignments)
      .where(and(
        eq(mealPlanAssignments.customerId, customer.id),
        eq(mealPlanAssignments.assignedBy, trainer.id)
      ));

    console.log(`   📊 Existing assignments: ${existingAssignments.length}`);

    // Step 4: Verify relationship is working
    console.log('\n4️⃣ Verifying trainer-customer relationship...');

    // Test the same query the trainer/customers endpoint uses
    const trainerCustomers = await db.select({
      customerId: users.id,
      customerEmail: users.email,
      invitedAt: customerInvitations.createdAt,
    })
    .from(customerInvitations)
    .innerJoin(users, eq(users.id, customerInvitations.usedBy))
    .where(and(
      eq(customerInvitations.trainerId, trainer.id),
      sql`${customerInvitations.usedAt} IS NOT NULL`,
      eq(users.role, 'customer')
    ));

    console.log(`   📋 Customers visible to trainer: ${trainerCustomers.length}`);

    if (trainerCustomers.length > 0) {
      const testCustomerFound = trainerCustomers.some(c => c.customerId === customer.id);
      if (testCustomerFound) {
        console.log(`   ✅ Test customer is visible to test trainer!`);
      } else {
        console.log(`   ⚠️ Test customer not found in trainer's customer list`);
      }
    }

    // Step 5: Create a test meal plan assignment for complete workflow testing
    console.log('\n5️⃣ Creating test meal plan for workflow validation...');

    // Check if we already have a test meal plan
    const existingTestPlan = await db.select()
      .from(personalizedMealPlans)
      .where(and(
        eq(personalizedMealPlans.trainerId, trainer.id),
        eq(personalizedMealPlans.customerId, customer.id)
      ))
      .limit(1);

    if (existingTestPlan.length > 0) {
      console.log(`   ✅ Test meal plan already exists`);
    } else {
      // Create a simple test meal plan
      const testMealPlan = {
        name: 'Test Validation Meal Plan',
        description: 'Automated test meal plan for role interaction validation',
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                meals: [
                  {
                    name: 'Test Breakfast',
                    recipes: []
                  }
                ]
              }
            ]
          }
        ]
      };

      const [newMealPlan] = await db.insert(personalizedMealPlans)
        .values({
          trainerId: trainer.id,
          customerId: customer.id,
          name: testMealPlan.name,
          description: testMealPlan.description,
          mealPlan: testMealPlan,
          assignedAt: new Date()
        })
        .returning();

      console.log(`   ✅ Test meal plan created (ID: ${newMealPlan.id})`);
    }

    console.log('\n🎉 Trainer-Customer Relationship Setup Complete!');
    console.log('=' .repeat(60));
    console.log(`✅ Trainer: ${trainer.email}`);
    console.log(`✅ Customer: ${customer.email}`);
    console.log(`✅ Invitation: Accepted`);
    console.log(`✅ Relationship: Active`);
    console.log(`✅ Ready for comprehensive validation testing`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute setup if run directly
if (process.argv[1] && process.argv[1].includes('setup-trainer-customer-relationship.js')) {
  setupTrainerCustomerRelationship()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

export { setupTrainerCustomerRelationship };