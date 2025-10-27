#!/usr/bin/env tsx
/**
 * Auto-Seed Production Test Accounts
 *
 * This script automatically creates/updates the three official test accounts
 * in the production database. It runs during deployment startup.
 *
 * SAFE TO RUN MULTIPLE TIMES: Uses ON CONFLICT to update existing accounts
 *
 * Test Credentials:
 * - Admin:    admin@fitmeal.pro             / AdminPass123
 * - Trainer:  trainer.test@evofitmeals.com  / TestTrainer123!
 * - Customer: customer.test@evofitmeals.com / TestCustomer123!
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not set - skipping test account auto-seed');
  process.exit(0);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

const db = drizzle(pool);

async function autoSeedTestAccounts() {
  try {
    console.log('🌱 Auto-seeding production test accounts...');

    // Run the SQL directly (idempotent with ON CONFLICT)
    await pool.query(`
      -- Enable UUID extension if needed
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Insert or update Admin account
      INSERT INTO users (email, password, name, role, created_at, updated_at)
      VALUES (
        'admin@fitmeal.pro',
        '$2b$10$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu',
        'Test Admin',
        'admin',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();

      -- Insert or update Trainer account
      INSERT INTO users (email, password, name, role, created_at, updated_at)
      VALUES (
        'trainer.test@evofitmeals.com',
        '$2b$10$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc/1Zi30VL40Xr3tU4OnDy',
        'Test Trainer',
        'trainer',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();

      -- Insert or update Customer account
      INSERT INTO users (email, password, name, role, created_at, updated_at)
      VALUES (
        'customer.test@evofitmeals.com',
        '$2b$10$ntpn4fEKnGz/Gnbi4eoUv.RzfbskycPl5Ln8jJjdHfuScg0W./s2m',
        'Test Customer',
        'customer',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();
    `);

    // Verify accounts were created
    const result = await pool.query(`
      SELECT email, role, name
      FROM users
      WHERE email IN (
        'admin@fitmeal.pro',
        'trainer.test@evofitmeals.com',
        'customer.test@evofitmeals.com'
      )
      ORDER BY role;
    `);

    console.log('✅ Production test accounts auto-seeded successfully!');
    console.log('📋 Accounts:');
    result.rows.forEach(row => {
      console.log(`   ${row.role.padEnd(10)} ${row.email.padEnd(35)} ${row.name}`);
    });

    console.log('\n🔐 Test Credentials:');
    console.log('   Admin:    admin@fitmeal.pro / AdminPass123');
    console.log('   Trainer:  trainer.test@evofitmeals.com / TestTrainer123!');
    console.log('   Customer: customer.test@evofitmeals.com / TestCustomer123!');

  } catch (error) {
    console.error('⚠️  Error auto-seeding test accounts:', error);
    console.log('ℹ️  This is non-fatal - application will continue');
    // Don't exit with error code - this is optional seeding
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoSeedTestAccounts();
}

export { autoSeedTestAccounts };
