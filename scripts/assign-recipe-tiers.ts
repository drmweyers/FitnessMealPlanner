#!/usr/bin/env tsx
/**
 * Recipe Tier Assignment Script
 *
 * Assigns tier levels to existing recipes based on Story 2.14 requirements:
 * - Starter tier: 1,000 recipes
 * - Professional tier: 2,500 recipes (includes Starter)
 * - Enterprise tier: 4,000 recipes (includes all)
 *
 * Strategy:
 * 1. Count existing approved recipes
 * 2. Distribute recipes across tiers based on creation date (oldest first)
 * 3. Update tier_level column
 * 4. Record allocation in recipe_tier_access table
 *
 * Usage: npm run assign-tiers
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Tier distribution plan
const TIER_LIMITS = {
  starter: 1000,
  professional: 2500,
  enterprise: 4000,
};

async function assignRecipeTiers() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting recipe tier assignment...\n');

    await client.query('BEGIN');

    // Get total recipe count
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM recipes
      WHERE is_approved = true
    `);
    const totalRecipes = parseInt(countResult.rows[0].total);
    console.log(`📊 Total approved recipes: ${totalRecipes}`);

    if (totalRecipes === 0) {
      console.log('⚠️  No approved recipes found. Nothing to assign.');
      await client.query('ROLLBACK');
      return;
    }

    // Assign tier levels based on creation timestamp (oldest first)
    console.log('\n📝 Assigning tier levels...');

    // 1. Assign first 1,000 recipes to 'starter' tier
    const starterResult = await client.query(`
      WITH ordered_recipes AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY creation_timestamp ASC) as rn
        FROM recipes
        WHERE is_approved = true
      )
      UPDATE recipes
      SET tier_level = 'starter',
          allocated_month = TO_CHAR(NOW(), 'YYYY-MM')
      FROM ordered_recipes
      WHERE recipes.id = ordered_recipes.id
        AND ordered_recipes.rn <= $1
      RETURNING recipes.id
    `, [TIER_LIMITS.starter]);

    console.log(`  ✅ Starter tier: ${starterResult.rowCount} recipes`);

    // 2. Assign next 1,500 recipes (1,001-2,500) to 'professional' tier
    const professionalCount = Math.min(TIER_LIMITS.professional - TIER_LIMITS.starter, totalRecipes - TIER_LIMITS.starter);
    if (professionalCount > 0) {
      const professionalResult = await client.query(`
        WITH ordered_recipes AS (
          SELECT id,
                 ROW_NUMBER() OVER (ORDER BY creation_timestamp ASC) as rn
          FROM recipes
          WHERE is_approved = true
        )
        UPDATE recipes
        SET tier_level = 'professional',
            allocated_month = TO_CHAR(NOW(), 'YYYY-MM')
        FROM ordered_recipes
        WHERE recipes.id = ordered_recipes.id
          AND ordered_recipes.rn > $1
          AND ordered_recipes.rn <= $2
        RETURNING recipes.id
      `, [TIER_LIMITS.starter, TIER_LIMITS.professional]);

      console.log(`  ✅ Professional tier: ${professionalResult.rowCount} recipes`);
    }

    // 3. Assign remaining recipes (2,501+) to 'enterprise' tier
    const enterpriseCount = Math.max(0, totalRecipes - TIER_LIMITS.professional);
    if (enterpriseCount > 0) {
      const enterpriseResult = await client.query(`
        WITH ordered_recipes AS (
          SELECT id,
                 ROW_NUMBER() OVER (ORDER BY creation_timestamp ASC) as rn
          FROM recipes
          WHERE is_approved = true
        )
        UPDATE recipes
        SET tier_level = 'enterprise',
            allocated_month = TO_CHAR(NOW(), 'YYYY-MM')
        FROM ordered_recipes
        WHERE recipes.id = ordered_recipes.id
          AND ordered_recipes.rn > $1
        RETURNING recipes.id
      `, [TIER_LIMITS.professional]);

      console.log(`  ✅ Enterprise tier: ${enterpriseResult.rowCount} recipes`);
    }

    // Update recipe_tier_access allocation tracking
    console.log('\n📈 Updating allocation tracking...');

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Count recipes by tier
    const tierCountResult = await client.query(`
      SELECT tier_level, COUNT(*) as count
      FROM recipes
      WHERE is_approved = true
      GROUP BY tier_level
      ORDER BY tier_level
    `);

    for (const row of tierCountResult.rows) {
      await client.query(`
        INSERT INTO recipe_tier_access (tier, allocation_month, recipe_count, allocation_date)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (tier, allocation_month)
        DO UPDATE SET
          recipe_count = $3,
          allocation_date = NOW()
      `, [row.tier_level, currentMonth, row.count]);

      console.log(`  ✅ ${row.tier_level}: ${row.count} recipes allocated`);
    }

    await client.query('COMMIT');

    // Display summary
    console.log('\n✨ Tier assignment completed successfully!\n');
    console.log('📊 Summary by tier:');

    const summaryResult = await client.query(`
      SELECT tier_level, COUNT(*) as count
      FROM recipes
      WHERE is_approved = true
      GROUP BY tier_level
      ORDER BY
        CASE tier_level
          WHEN 'starter' THEN 1
          WHEN 'professional' THEN 2
          WHEN 'enterprise' THEN 3
        END
    `);

    for (const row of summaryResult.rows) {
      console.log(`  ${row.tier_level.padEnd(15)}: ${row.count} recipes`);
    }

    console.log('\n📌 Progressive Access Model:');
    console.log('  Starter tier      : Can access starter recipes only');
    console.log('  Professional tier : Can access starter + professional recipes');
    console.log('  Enterprise tier   : Can access all recipes (starter + professional + enterprise)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Tier assignment failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
assignRecipeTiers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
