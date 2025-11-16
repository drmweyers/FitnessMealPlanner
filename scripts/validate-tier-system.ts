#!/usr/bin/env tsx
/**
 * Tier System Backend Validation Script
 *
 * Validates Stories 2.14, 2.15, 2.12 backend implementation:
 * - Recipe tier filtering (progressive access model)
 * - Meal type tier filtering (5/10/17 types)
 * - Branding API tier enforcement
 *
 * Usage: npm run validate:tier-system
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const API_BASE = 'http://localhost:4000/api';

interface ValidationResult {
  test: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
}

const results: ValidationResult[] = [];

function logTest(test: string, passed: boolean, expected: any, actual: any, error?: string) {
  results.push({ test, passed, expected, actual, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}`);
  if (!passed) {
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual: ${JSON.stringify(actual)}`);
    if (error) console.log(`   Error: ${error}`);
  }
}

async function validateRecipeTierFiltering() {
  console.log('\n📊 Testing Recipe Tier Filtering (Story 2.14)...\n');

  const client = await pool.connect();
  try {
    // Test 1: Check tier_level column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recipes' AND column_name = 'tier_level'
    `);
    logTest(
      'Recipe tier_level column exists',
      columnCheck.rows.length === 1,
      1,
      columnCheck.rows.length
    );

    // Test 2: Count recipes by tier
    const tierCounts = await client.query(`
      SELECT tier_level, COUNT(*) as count
      FROM recipes
      WHERE is_approved = true
      GROUP BY tier_level
      ORDER BY tier_level
    `);

    const starterCount = tierCounts.rows.find(r => r.tier_level === 'starter')?.count || 0;
    const professionalCount = tierCounts.rows.find(r => r.tier_level === 'professional')?.count || 0;
    const enterpriseCount = tierCounts.rows.find(r => r.tier_level === 'enterprise')?.count || 0;

    logTest(
      'Starter tier has ~1,000 recipes',
      Number(starterCount) === 1000,
      1000,
      Number(starterCount)
    );

    logTest(
      'Professional tier has recipes assigned',
      Number(professionalCount) > 0,
      '>0',
      Number(professionalCount)
    );

    // Test 3: Progressive access - Starter tier query
    const starterAccess = await client.query(`
      SELECT COUNT(*) as count
      FROM recipes
      WHERE is_approved = true
        AND tier_level <= 'starter'::tier_level
    `);
    logTest(
      'Starter tier progressive access (tier_level <= starter)',
      Number(starterAccess.rows[0].count) === 1000,
      1000,
      Number(starterAccess.rows[0].count)
    );

    // Test 4: Progressive access - Professional tier query
    const professionalAccess = await client.query(`
      SELECT COUNT(*) as count
      FROM recipes
      WHERE is_approved = true
        AND tier_level <= 'professional'::tier_level
    `);
    const professionalTotal = Number(starterCount) + Number(professionalCount);
    logTest(
      'Professional tier progressive access (tier_level <= professional)',
      Number(professionalAccess.rows[0].count) === professionalTotal,
      professionalTotal,
      Number(professionalAccess.rows[0].count)
    );

    // Test 5: Progressive access - Enterprise tier query
    const enterpriseAccess = await client.query(`
      SELECT COUNT(*) as count
      FROM recipes
      WHERE is_approved = true
        AND tier_level <= 'enterprise'::tier_level
    `);
    const enterpriseTotal = Number(starterCount) + Number(professionalCount) + Number(enterpriseCount);
    logTest(
      'Enterprise tier progressive access (tier_level <= enterprise)',
      Number(enterpriseAccess.rows[0].count) === enterpriseTotal,
      enterpriseTotal,
      Number(enterpriseAccess.rows[0].count)
    );

    // Test 6: Check recipe_tier_access table
    const tierAccess = await client.query(`
      SELECT tier, recipe_count
      FROM recipe_tier_access
      ORDER BY tier
    `);
    logTest(
      'recipe_tier_access tracking table has entries',
      tierAccess.rows.length >= 2,
      '>=2',
      tierAccess.rows.length
    );

  } finally {
    client.release();
  }
}

async function validateMealTypeFiltering() {
  console.log('\n🍽️  Testing Meal Type Tier Filtering (Story 2.15)...\n');

  const client = await pool.connect();
  try {
    // Test 1: Count meal types by tier
    const tierCounts = await client.query(`
      SELECT tier_level, COUNT(*) as count
      FROM recipe_type_categories
      GROUP BY tier_level
      ORDER BY
        CASE tier_level
          WHEN 'starter' THEN 1
          WHEN 'professional' THEN 2
          WHEN 'enterprise' THEN 3
        END
    `);

    const starterTypes = tierCounts.rows.find(r => r.tier_level === 'starter')?.count || 0;
    const professionalTypes = tierCounts.rows.find(r => r.tier_level === 'professional')?.count || 0;
    const enterpriseTypes = tierCounts.rows.find(r => r.tier_level === 'enterprise')?.count || 0;

    logTest(
      'Starter tier has exactly 5 meal types',
      Number(starterTypes) === 5,
      5,
      Number(starterTypes)
    );

    logTest(
      'Professional tier has exactly 5 additional meal types',
      Number(professionalTypes) === 5,
      5,
      Number(professionalTypes)
    );

    logTest(
      'Enterprise tier has exactly 7 additional meal types',
      Number(enterpriseTypes) === 7,
      7,
      Number(enterpriseTypes)
    );

    // Test 2: Test API endpoint (public access, defaults to starter)
    try {
      const response = await axios.get(`${API_BASE}/meal-types`);
      logTest(
        'Meal types API returns 5 types for public/starter',
        response.data.data.count === 5,
        5,
        response.data.data.count
      );

      logTest(
        'Meal types API returns correct tier level',
        response.data.data.userTier === 'starter',
        'starter',
        response.data.data.userTier
      );
    } catch (error: any) {
      logTest(
        'Meal types API accessible',
        false,
        'success',
        error.message
      );
    }

    // Test 3: Test /all endpoint
    try {
      const response = await axios.get(`${API_BASE}/meal-types/all`);
      logTest(
        'Meal types /all API returns all 17 types',
        response.data.data.total === 17,
        17,
        response.data.data.total
      );

      logTest(
        'Meal types /all shows 5 accessible, 12 locked for starter',
        response.data.data.accessible === 5 && response.data.data.locked === 12,
        { accessible: 5, locked: 12 },
        { accessible: response.data.data.accessible, locked: response.data.data.locked }
      );
    } catch (error: any) {
      logTest(
        'Meal types /all API accessible',
        false,
        'success',
        error.message
      );
    }

  } finally {
    client.release();
  }
}

async function validateBrandingSystem() {
  console.log('\n🎨 Testing Branding & Customization System (Story 2.12)...\n');

  const client = await pool.connect();
  try {
    // Test 1: Check branding table exists
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'trainer_branding_settings'
    `);
    logTest(
      'trainer_branding_settings table exists',
      tableCheck.rows.length === 1,
      1,
      tableCheck.rows.length
    );

    // Test 2: Check audit log table exists
    const auditCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'branding_audit_log'
    `);
    logTest(
      'branding_audit_log table exists',
      auditCheck.rows.length === 1,
      1,
      auditCheck.rows.length
    );

    // Test 3: Check columns
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'trainer_branding_settings'
      ORDER BY column_name
    `);
    const columnNames = columns.rows.map(r => r.column_name);
    const expectedColumns = [
      'logo_url', 'primary_color', 'secondary_color', 'accent_color',
      'white_label_enabled', 'custom_domain', 'custom_domain_verified'
    ];
    const hasAllColumns = expectedColumns.every(col => columnNames.includes(col));
    logTest(
      'Branding table has all required columns',
      hasAllColumns,
      expectedColumns.length,
      expectedColumns.filter(col => columnNames.includes(col)).length
    );

    // Test 4: Test API endpoint (unauthenticated should fail)
    try {
      await axios.get(`${API_BASE}/branding`);
      logTest(
        'Branding API requires authentication',
        false,
        '401 Unauthorized',
        'Allowed access without auth'
      );
    } catch (error: any) {
      logTest(
        'Branding API requires authentication',
        error.response?.status === 401,
        401,
        error.response?.status
      );
    }

  } finally {
    client.release();
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${passRate}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  • ${r.test}`);
      console.log(`    Expected: ${JSON.stringify(r.expected)}`);
      console.log(`    Actual: ${JSON.stringify(r.actual)}`);
      if (r.error) console.log(`    Error: ${r.error}`);
      console.log('');
    });
  }

  console.log('='.repeat(60));

  if (passed === total) {
    console.log('✅ ALL TESTS PASSED! Backend is ready for frontend integration.');
  } else {
    console.log('⚠️  Some tests failed. Review and fix issues before proceeding.');
  }
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 Starting Tier System Backend Validation...\n');
  console.log('Testing Stories 2.14, 2.15, 2.12\n');

  try {
    await validateRecipeTierFiltering();
    await validateMealTypeFiltering();
    await validateBrandingSystem();
    await printSummary();

    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
