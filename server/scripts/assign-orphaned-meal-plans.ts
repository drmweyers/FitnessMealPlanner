/**
 * Migration Script: Assign Orphaned Meal Plans to Customers
 *
 * Purpose: Fix the 10 orphaned meal plans that exist in trainerMealPlans
 *          but have no corresponding mealPlanAssignments
 *
 * Run: npx tsx server/scripts/assign-orphaned-meal-plans.ts
 */

import { db } from '../db';
import { trainerMealPlans, mealPlanAssignments, users } from '@shared/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import * as readline from 'readline';

interface OrphanedPlan {
  id: string;
  trainerId: string;
  trainerEmail: string;
  planName: string;
  createdAt: string;
  isTemplate: boolean;
}

interface Customer {
  id: string;
  email: string;
  name: string;
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function getOrphanedPlans(): Promise<OrphanedPlan[]> {
  console.log('🔍 Finding orphaned meal plans...\n');

  const orphanedPlans = await db
    .select({
      id: trainerMealPlans.id,
      trainerId: trainerMealPlans.trainerId,
      trainerEmail: users.email,
      planName: sql<string>`${trainerMealPlans.mealPlanData}->>'planName'`,
      createdAt: trainerMealPlans.createdAt,
      isTemplate: trainerMealPlans.isTemplate,
    })
    .from(trainerMealPlans)
    .leftJoin(users, eq(users.id, trainerMealPlans.trainerId))
    .leftJoin(mealPlanAssignments, eq(mealPlanAssignments.mealPlanId, trainerMealPlans.id))
    .where(isNull(mealPlanAssignments.id));

  return orphanedPlans.map(p => ({
    id: p.id,
    trainerId: p.trainerId,
    trainerEmail: p.trainerEmail || 'Unknown',
    planName: p.planName || 'Unnamed',
    createdAt: p.createdAt || 'Unknown',
    isTemplate: p.isTemplate || false,
  }));
}

async function getTrainerCustomers(trainerId: string): Promise<Customer[]> {
  const customers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.trainerId, trainerId));

  return customers.map(c => ({
    id: c.id,
    email: c.email || 'No email',
    name: c.name || 'No name',
  }));
}

async function assignPlanToCustomer(
  planId: string,
  customerId: string,
  trainerId: string,
  planName: string
): Promise<void> {
  try {
    await db.insert(mealPlanAssignments).values({
      mealPlanId: planId,
      customerId: customerId,
      assignedBy: trainerId,
      notes: `Migrated from orphaned plans - originally created as "${planName}"`,
    });
    console.log(`✅ Successfully assigned plan "${planName}" to customer`);
  } catch (error) {
    console.error(`❌ Failed to assign plan "${planName}":`, error);
    throw error;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Orphaned Meal Plans Migration Script                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Step 1: Get orphaned plans
  const orphanedPlans = await getOrphanedPlans();

  if (orphanedPlans.length === 0) {
    console.log('✅ No orphaned plans found! All meal plans are properly assigned.');
    rl.close();
    return;
  }

  console.log(`Found ${orphanedPlans.length} orphaned meal plans:\n`);
  orphanedPlans.forEach((plan, index) => {
    console.log(`${index + 1}. "${plan.planName}"`);
    console.log(`   Plan ID: ${plan.id}`);
    console.log(`   Trainer: ${plan.trainerEmail}`);
    console.log(`   Created: ${plan.createdAt}`);
    console.log(`   Template: ${plan.isTemplate}`);
    console.log('');
  });

  // Step 2: Process each orphaned plan
  let assignedCount = 0;
  let skippedCount = 0;

  for (const plan of orphanedPlans) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: "${plan.planName}"`);
    console.log(`${'='.repeat(60)}\n`);

    // Skip templates (they shouldn't be assigned to customers)
    if (plan.isTemplate) {
      console.log('⏭️  Skipping - This is a template (should not be assigned to customers)');
      skippedCount++;
      continue;
    }

    // Get trainer's customers
    const customers = await getTrainerCustomers(plan.trainerId);

    if (customers.length === 0) {
      console.log('⚠️  No customers found for this trainer. Skipping...');
      skippedCount++;
      continue;
    }

    // Display customers
    console.log(`Trainer has ${customers.length} customer(s):\n`);
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.email})`);
    });
    console.log(`${customers.length + 1}. Skip this plan`);
    console.log('');

    // Ask user to select customer
    const answer = await askQuestion(
      `Which customer should receive "${plan.planName}"? (1-${customers.length + 1}): `
    );

    const selection = parseInt(answer);

    if (isNaN(selection) || selection < 1 || selection > customers.length + 1) {
      console.log('❌ Invalid selection. Skipping this plan.');
      skippedCount++;
      continue;
    }

    if (selection === customers.length + 1) {
      console.log('⏭️  Skipped by user');
      skippedCount++;
      continue;
    }

    const selectedCustomer = customers[selection - 1];
    console.log(`\n👤 Assigning to: ${selectedCustomer.name} (${selectedCustomer.email})`);

    // Confirm assignment
    const confirm = await askQuestion('Confirm assignment? (y/n): ');

    if (confirm.toLowerCase() === 'y') {
      await assignPlanToCustomer(
        plan.id,
        selectedCustomer.id,
        plan.trainerId,
        plan.planName
      );
      assignedCount++;
    } else {
      console.log('⏭️  Skipped by user');
      skippedCount++;
    }
  }

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   Migration Complete                                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Plans assigned:  ${assignedCount}`);
  console.log(`⏭️  Plans skipped:   ${skippedCount}`);
  console.log(`📊 Total processed: ${orphanedPlans.length}\n`);

  if (assignedCount > 0) {
    console.log('🎉 Assigned meal plans should now be visible to customers!');
    console.log('   Customers can view them in their profile.');
  }

  if (skippedCount > 0) {
    console.log('\n⚠️  Some plans were skipped and remain orphaned.');
    console.log('   Run this script again to assign them later.');
  }

  rl.close();
}

// Run the migration
main()
  .then(() => {
    console.log('\n✅ Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    rl.close();
    process.exit(1);
  });
