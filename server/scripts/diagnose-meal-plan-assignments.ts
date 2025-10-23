/**
 * Database Diagnostic Script: Meal Plan Assignments Analysis
 *
 * Purpose: Identify orphaned meal plans and assignment gaps
 * Run: npx tsx server/scripts/diagnose-meal-plan-assignments.ts
 */

import { db } from '../db';
import { trainerMealPlans, mealPlanAssignments, users } from '@shared/schema';
import { eq, isNull, sql } from 'drizzle-orm';

interface DiagnosticResults {
  totalTrainerPlans: number;
  assignedPlans: number;
  orphanedPlans: number;
  orphanedPlanDetails: Array<{
    id: string;
    trainerId: string;
    trainerEmail: string;
    planName: string;
    createdAt: string;
    isTemplate: boolean;
  }>;
  assignmentStats: {
    totalAssignments: number;
    uniqueCustomers: number;
    uniquePlans: number;
  };
  legacyPersonalizedPlans: number;
}

async function diagnoseMealPlanAssignments(): Promise<DiagnosticResults> {
  console.log('🔍 Starting Meal Plan Assignment Diagnosis...\n');

  // 1. Count total trainer meal plans
  const totalPlansResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trainerMealPlans);
  const totalTrainerPlans = totalPlansResult[0]?.count || 0;
  console.log(`📊 Total Trainer Meal Plans: ${totalTrainerPlans}`);

  // 2. Count assigned meal plans
  const assignedPlansResult = await db
    .select({ count: sql<number>`count(DISTINCT ${mealPlanAssignments.mealPlanId})::int` })
    .from(mealPlanAssignments);
  const assignedPlans = assignedPlansResult[0]?.count || 0;
  console.log(`✅ Assigned Meal Plans: ${assignedPlans}`);

  // 3. Calculate orphaned plans
  const orphanedPlans = totalTrainerPlans - assignedPlans;
  console.log(`❌ Orphaned Meal Plans (no assignments): ${orphanedPlans}\n`);

  // 4. Get detailed info about orphaned plans
  console.log('🔍 Finding Orphaned Meal Plan Details...');
  const orphanedPlanDetails = await db
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

  console.log(`\n📋 Orphaned Meal Plans Details:`);
  orphanedPlanDetails.forEach((plan, index) => {
    console.log(`\n  ${index + 1}. Plan ID: ${plan.id}`);
    console.log(`     Name: ${plan.planName || 'Unnamed'}`);
    console.log(`     Trainer: ${plan.trainerEmail || 'Unknown'}`);
    console.log(`     Created: ${plan.createdAt}`);
    console.log(`     Is Template: ${plan.isTemplate}`);
  });

  // 5. Get assignment statistics
  console.log('\n\n📊 Assignment Statistics:');
  const totalAssignmentsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mealPlanAssignments);
  const totalAssignments = totalAssignmentsResult[0]?.count || 0;
  console.log(`   Total Assignments: ${totalAssignments}`);

  const uniqueCustomersResult = await db
    .select({ count: sql<number>`count(DISTINCT ${mealPlanAssignments.customerId})::int` })
    .from(mealPlanAssignments);
  const uniqueCustomers = uniqueCustomersResult[0]?.count || 0;
  console.log(`   Unique Customers with Plans: ${uniqueCustomers}`);

  const uniquePlansResult = await db
    .select({ count: sql<number>`count(DISTINCT ${mealPlanAssignments.mealPlanId})::int` })
    .from(mealPlanAssignments);
  const uniquePlans = uniquePlansResult[0]?.count || 0;
  console.log(`   Unique Plans Assigned: ${uniquePlans}`);

  // 6. Check legacy personalized_meal_plans table
  console.log('\n\n🔍 Checking Legacy Table...');
  try {
    const { personalizedMealPlans } = await import('@shared/schema');
    const legacyPlansResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(personalizedMealPlans);
    const legacyPersonalizedPlans = legacyPlansResult[0]?.count || 0;
    console.log(`   Legacy Personalized Meal Plans: ${legacyPersonalizedPlans}`);
    if (legacyPersonalizedPlans > 0) {
      console.log(`   ⚠️  WARNING: ${legacyPersonalizedPlans} plans in legacy table need migration!`);
    }
  } catch (error) {
    console.log('   Legacy table check skipped (table may not exist)');
  }

  // 7. Summary
  console.log('\n\n📋 DIAGNOSIS SUMMARY:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total Trainer Meal Plans:     ${totalTrainerPlans}`);
  console.log(`Plans with Assignments:       ${assignedPlans} (${((assignedPlans/totalTrainerPlans)*100).toFixed(1)}%)`);
  console.log(`Orphaned Plans (unassigned):  ${orphanedPlans} (${((orphanedPlans/totalTrainerPlans)*100).toFixed(1)}%)`);
  console.log(`Total Assignments:            ${totalAssignments}`);
  console.log(`Unique Customers Served:      ${uniqueCustomers}`);
  console.log('═══════════════════════════════════════════════════════');

  if (orphanedPlans > 0) {
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log(`   ${orphanedPlans} meal plans exist without customer assignments.`);
    console.log('   These plans are invisible to customers.');
    console.log('   Recommendation: Investigate creation workflow and add assignment step.');
  } else {
    console.log('\n✅ All meal plans are properly assigned!');
  }

  return {
    totalTrainerPlans,
    assignedPlans,
    orphanedPlans,
    orphanedPlanDetails: orphanedPlanDetails.map(p => ({
      id: p.id,
      trainerId: p.trainerId,
      trainerEmail: p.trainerEmail || 'Unknown',
      planName: p.planName || 'Unnamed',
      createdAt: p.createdAt || 'Unknown',
      isTemplate: p.isTemplate || false,
    })),
    assignmentStats: {
      totalAssignments,
      uniqueCustomers,
      uniquePlans,
    },
    legacyPersonalizedPlans: 0, // Will be updated if legacy table exists
  };
}

// Run the diagnostic
diagnoseMealPlanAssignments()
  .then((results) => {
    console.log('\n\n✅ Diagnosis complete!');
    console.log('\nResults object available for programmatic use.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  });
