/**
 * Test Measurement Data Seeder
 *
 * Seeds the database with 90 days of realistic measurement data for the customer test account.
 * This creates a compelling fitness journey story showing gradual weight loss and body composition
 * improvements with natural fluctuations that would occur in real life.
 *
 * Usage: npx tsx server/scripts/seed-test-measurements.ts
 */

import { db } from '../db';
import { users, progressMeasurements } from '@shared/schema';
import { eq } from 'drizzle-orm';

const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';

/**
 * Generates realistic measurement data for a 90-day fitness journey
 * Starting stats: 200 lbs, 28% body fat, larger measurements
 * Ending stats: 180 lbs, 22% body fat, reduced measurements with slight muscle gain
 */
function generateRealisticMeasurements() {
  const measurements = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // Start 90 days ago

  // Starting values (realistic for someone beginning a fitness journey)
  const startingValues = {
    weightLbs: 200.0,
    bodyFatPercentage: 28.0,
    muscleMassKg: 32.0,
    waistCm: 95.0,
    hipsCm: 105.0,
    chestCm: 102.0,
    neckCm: 38.0,
    shouldersCm: 115.0,
    bicepLeftCm: 32.0,
    bicepRightCm: 32.5,
    thighLeftCm: 58.0,
    thighRightCm: 58.5,
    calfLeftCm: 38.0,
    calfRightCm: 38.5
  };

  // Target ending values (after 90 days of consistent training)
  const endingValues = {
    weightLbs: 180.0,
    bodyFatPercentage: 22.0,
    muscleMassKg: 34.5, // Slight muscle gain while losing fat
    waistCm: 82.0,
    hipsCm: 98.0,
    chestCm: 98.0,
    neckCm: 37.0,
    shouldersCm: 118.0, // Shoulders actually grow slightly from training
    bicepLeftCm: 33.5,  // Muscle growth
    bicepRightCm: 34.0,
    thighLeftCm: 55.0,
    thighRightCm: 55.5,
    calfLeftCm: 37.5,
    calfRightCm: 38.0
  };

  // Generate measurements every 3-4 days (more realistic than daily)
  let currentDate = new Date(startDate);
  let dayCount = 0;

  while (dayCount <= 90) {
    // Add some randomness to measurement intervals (3-5 days)
    const daysToAdd = Math.random() < 0.7 ? 3 : (Math.random() < 0.5 ? 4 : 5);

    if (dayCount > 0) {
      currentDate.setDate(currentDate.getDate() + daysToAdd);
    }

    const progress = Math.min(dayCount / 90, 1); // Progress from 0 to 1

    // Use a slightly curved progress (slower at start, faster in middle, plateau at end)
    const adjustedProgress = 1 - Math.pow(1 - progress, 1.2);

    // Generate current values with natural fluctuations
    const currentMeasurement = {};

    for (const [key, startValue] of Object.entries(startingValues)) {
      const endValue = endingValues[key];
      const totalChange = endValue - startValue;
      const progressValue = startValue + (totalChange * adjustedProgress);

      // Add realistic daily fluctuations
      let fluctuation = 0;
      if (key === 'weightLbs') {
        // Weight can fluctuate ±2 lbs day to day
        fluctuation = (Math.random() - 0.5) * 4;
      } else if (key === 'bodyFatPercentage') {
        // Body fat % fluctuates less, ±0.5%
        fluctuation = (Math.random() - 0.5) * 1;
      } else if (key === 'muscleMassKg') {
        // Muscle mass is fairly stable, ±0.3kg
        fluctuation = (Math.random() - 0.5) * 0.6;
      } else {
        // Body measurements fluctuate slightly, ±1cm
        fluctuation = (Math.random() - 0.5) * 2;
      }

      currentMeasurement[key] = Math.round((progressValue + fluctuation) * 10) / 10;
    }

    // Convert weight to kg as well
    currentMeasurement.weightKg = Math.round((currentMeasurement.weightLbs * 0.453592) * 10) / 10;

    // Add motivational notes at key milestones
    let notes = null;
    if (dayCount === 0) {
      notes = "Starting my fitness journey! Excited to see progress.";
    } else if (dayCount >= 20 && dayCount <= 25) {
      notes = "Feeling stronger and more energetic. Clothes fitting better!";
    } else if (dayCount >= 45 && dayCount <= 50) {
      notes = "Halfway point! Really seeing changes in the mirror.";
    } else if (dayCount >= 70 && dayCount <= 75) {
      notes = "People are starting to notice! Confidence is through the roof.";
    } else if (dayCount >= 85) {
      notes = "Amazing transformation! Ready to set new goals.";
    } else if (Math.random() < 0.15) {
      // Random encouraging notes
      const randomNotes = [
        "Feeling great today!",
        "Workout was tough but worth it",
        "Meal prep is paying off",
        "Consistency is key",
        "Progress not perfection",
        "Stronger than yesterday",
        "Body is adapting well",
        "Energy levels are up"
      ];
      notes = randomNotes[Math.floor(Math.random() * randomNotes.length)];
    }

    measurements.push({
      measurementDate: new Date(currentDate),
      weightKg: currentMeasurement.weightKg.toString(),
      weightLbs: currentMeasurement.weightLbs.toString(),
      neckCm: currentMeasurement.neckCm.toString(),
      shouldersCm: currentMeasurement.shouldersCm.toString(),
      chestCm: currentMeasurement.chestCm.toString(),
      waistCm: currentMeasurement.waistCm.toString(),
      hipsCm: currentMeasurement.hipsCm.toString(),
      bicepLeftCm: currentMeasurement.bicepLeftCm.toString(),
      bicepRightCm: currentMeasurement.bicepRightCm.toString(),
      thighLeftCm: currentMeasurement.thighLeftCm.toString(),
      thighRightCm: currentMeasurement.thighRightCm.toString(),
      calfLeftCm: currentMeasurement.calfLeftCm.toString(),
      calfRightCm: currentMeasurement.calfRightCm.toString(),
      bodyFatPercentage: currentMeasurement.bodyFatPercentage.toString(),
      muscleMassKg: currentMeasurement.muscleMassKg.toString(),
      notes: notes
    });

    dayCount += daysToAdd;
  }

  return measurements;
}

/**
 * Main seeding function
 */
async function seedTestMeasurements() {
  try {
    console.log('🎯 Starting measurement data seeding for QA testing...');
    console.log(`📧 Looking for customer: ${CUSTOMER_EMAIL}`);

    // Find the customer test account
    const [customer] = await db
      .select()
      .from(users)
      .where(eq(users.email, CUSTOMER_EMAIL))
      .limit(1);

    if (!customer) {
      console.error(`❌ Customer not found: ${CUSTOMER_EMAIL}`);
      console.log('💡 Make sure to run the test account seeder first:');
      console.log('   npx tsx server/db/seeds/test-accounts.ts');
      process.exit(1);
    }

    console.log(`✅ Found customer: ${customer.name} (${customer.id})`);

    // Clear existing test measurements for this customer
    console.log('🧹 Clearing existing measurements...');
    await db
      .delete(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customer.id));

    console.log('📊 Generating 90 days of realistic measurement data...');
    const measurements = generateRealisticMeasurements();

    console.log(`📈 Generated ${measurements.length} measurement entries`);
    console.log('💾 Inserting measurements into database...');

    // Insert measurements in batches to avoid overwhelming the database
    const batchSize = 10;
    let insertedCount = 0;

    for (let i = 0; i < measurements.length; i += batchSize) {
      const batch = measurements.slice(i, i + batchSize);
      const batchData = batch.map(measurement => ({
        customerId: customer.id,
        ...measurement
      }));

      await db.insert(progressMeasurements).values(batchData);
      insertedCount += batch.length;

      // Show progress
      const progress = Math.round((insertedCount / measurements.length) * 100);
      process.stdout.write(`\r   Progress: ${progress}% (${insertedCount}/${measurements.length}) `);
    }

    console.log('\n');
    console.log('🎉 Measurement seeding completed successfully!');
    console.log('');
    console.log('📋 Seeding Summary:');
    console.log('===================');
    console.log(`👤 Customer: ${customer.name} (${customer.email})`);
    console.log(`📈 Total measurements: ${measurements.length}`);
    console.log(`📅 Date range: ${measurements[0].measurementDate.toLocaleDateString()} to ${measurements[measurements.length - 1].measurementDate.toLocaleDateString()}`);
    console.log(`⚖️  Weight journey: ${measurements[0].weightLbs} lbs → ${measurements[measurements.length - 1].weightLbs} lbs`);
    console.log(`💪 Body fat: ${measurements[0].bodyFatPercentage}% → ${measurements[measurements.length - 1].bodyFatPercentage}%`);
    console.log(`📏 Waist: ${measurements[0].waistCm} cm → ${measurements[measurements.length - 1].waistCm} cm`);
    console.log('');
    console.log('🔍 QA Testing Instructions:');
    console.log('============================');
    console.log('1. Login as customer: customer.test@evofitmeals.com / TestCustomer123!');
    console.log('2. Navigate to Progress Tracking page');
    console.log('3. View Weight Progress and Body Measurement charts');
    console.log('4. Verify data shows realistic weight loss progression');
    console.log('5. Check that charts display properly with fluctuations');
    console.log('6. Test different date range filters');
    console.log('');
    console.log('✨ The data tells a compelling 90-day transformation story!');

  } catch (error) {
    console.error('❌ Error seeding measurements:', error);
    throw error;
  }
}

// Run the seeder
seedTestMeasurements()
  .then(() => {
    console.log('✅ Seeding process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
  });