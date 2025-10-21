#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fitmeal',
  ssl: false
});

async function runMigration() {
  console.log('🔄 Running migration 0017: Recipe Review Queue System...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0017_recipe_review_queue.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration 0017 completed successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying migration...\n');

    // Check if review_status column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'recipes' AND column_name = 'review_status'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ recipes.review_status column created:', columnCheck.rows[0]);
    }

    // Check if review queue table exists
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'recipe_review_queue'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ recipe_review_queue table created');
    }

    // Check indexes
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'recipe_review_queue'
    `);

    console.log(`✅ ${indexCheck.rows.length} indexes created:`, indexCheck.rows.map(r => r.indexname));

    // Check function
    const functionCheck = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name = 'get_batch_progress'
    `);

    if (functionCheck.rows.length > 0) {
      console.log('✅ get_batch_progress() function created');
    }

    console.log('\n🎉 Migration verified and complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
