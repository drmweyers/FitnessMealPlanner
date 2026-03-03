#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Please provide a migration file name');
  console.error('Usage: npm run migrate <migration-file.sql>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  let client;
  
  try {
    console.log(`🚀 Running migration: ${migrationFile}`);
    
    // Read the SQL file - try multiple locations
    let sqlPath: string;
    let sql: string;
    
    // Try migrations directory first
    try {
      sqlPath = join(process.cwd(), 'migrations', migrationFile);
      sql = readFileSync(sqlPath, 'utf-8');
    } catch (err) {
      // Try server/db/migrations directory
      try {
        sqlPath = join(process.cwd(), 'server', 'db', 'migrations', migrationFile);
        sql = readFileSync(sqlPath, 'utf-8');
      } catch (err2) {
        // Try server/migrations directory
        try {
          sqlPath = join(process.cwd(), 'server', 'migrations', migrationFile);
          sql = readFileSync(sqlPath, 'utf-8');
        } catch (err3) {
          // Fallback to scripts directory
          sqlPath = join(process.cwd(), 'scripts', migrationFile);
          sql = readFileSync(sqlPath, 'utf-8');
        }
      }
    }
    
    // Connect to database
    client = await pool.connect();
    
    // Run migration in a transaction
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration();