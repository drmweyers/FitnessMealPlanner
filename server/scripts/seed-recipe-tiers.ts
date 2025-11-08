/**
 * Story 2.14: Recipe Tier Seeding Script
 *
 * Assigns tier levels to existing recipes based on progressive access model:
 * - First 1,000 recipes: Starter tier
 * - Next 1,500 recipes (1,001-2,500): Professional tier
 * - Remaining recipes (2,501-4,000): Enterprise tier
 *
 * Progressive access ensures higher tiers get all lower tier content.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { recipes } from '@shared/schema';
import { or, isNull, eq, asc } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function seedRecipeTiers() {
  console.log('🌱 Starting recipe tier seeding...\n');

  try {
    // Fetch all recipes that need tier assignment
    // Include recipes with NULL or 'starter' tier_level
    const allRecipes = await db.select()
      .from(recipes)
      .where(or(
        isNull(recipes.tierLevel),
        eq(recipes.tierLevel, 'starter')
      ))
      .orderBy(asc(recipes.creationTimestamp));

    console.log(`📊 Found ${allRecipes.length} recipes to process\n`);

    // Define tier limits based on Story 2.14 requirements
    const STARTER_LIMIT = 1000;      // First 1,000 recipes
    const PROFESSIONAL_LIMIT = 2500;  // Next 1,500 recipes (1,001-2,500)
    const ENTERPRISE_LIMIT = 4000;    // Remaining recipes (2,501-4,000)

    let starterCount = 0;
    let professionalCount = 0;
    let enterpriseCount = 0;
    let skippedCount = 0;

    // Process each recipe
    for (let i = 0; i < allRecipes.length; i++) {
      const recipe = allRecipes[i];
      const position = i + 1; // 1-based position

      let tierLevel: 'starter' | 'professional' | 'enterprise';

      if (position <= STARTER_LIMIT) {
        tierLevel = 'starter';
        starterCount++;
      } else if (position <= PROFESSIONAL_LIMIT) {
        tierLevel = 'professional';
        professionalCount++;
      } else if (position <= ENTERPRISE_LIMIT) {
        tierLevel = 'enterprise';
        enterpriseCount++;
      } else {
        // Skip recipes beyond enterprise limit
        skippedCount++;
        console.log(`⚠️  Skipped recipe ${recipe.id} (position ${position} exceeds limit of ${ENTERPRISE_LIMIT})`);
        continue;
      }

      // Update recipe with tier assignment
      await db.update(recipes)
        .set({ tierLevel })
        .where(eq(recipes.id, recipe.id));

      // Log progress every 100 recipes
      if (position % 100 === 0) {
        console.log(`✅ Processed ${position} recipes...`);
      }
    }

    console.log('\n🎉 Recipe tier seeding complete!\n');
    console.log('📈 Summary:');
    console.log('==========');
    console.log(`Starter tier:       ${starterCount.toLocaleString()} recipes (1-${STARTER_LIMIT})`);
    console.log(`Professional tier:  ${professionalCount.toLocaleString()} recipes (${STARTER_LIMIT + 1}-${PROFESSIONAL_LIMIT})`);
    console.log(`Enterprise tier:    ${enterpriseCount.toLocaleString()} recipes (${PROFESSIONAL_LIMIT + 1}-${ENTERPRISE_LIMIT})`);
    console.log(`Skipped:            ${skippedCount} recipes (beyond limit)`);
    console.log(`Total processed:    ${starterCount + professionalCount + enterpriseCount} recipes`);

    console.log('\n📊 Progressive Access Model:');
    console.log('============================');
    console.log('Starter users:       1,000 recipes');
    console.log('Professional users:  2,500 recipes (includes all starter recipes)');
    console.log('Enterprise users:    4,000 recipes (includes all professional + starter recipes)');

  } catch (error) {
    console.error('❌ Error seeding recipe tiers:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedRecipeTiers().catch(console.error);
