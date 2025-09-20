#!/usr/bin/env node

/**
 * Insert Test Measurements Script
 *
 * This script executes the insert-test-measurements.sql file
 * using the existing database connection from server/db.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.join(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration (copied from server/db.ts)
const isDevelopment = process.env.NODE_ENV === "development";

const getSslConfig = () => {
  if (isDevelopment) {
    console.log("Database SSL mode: Development - using relaxed SSL settings");

    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && (databaseUrl.includes("localhost") || databaseUrl.includes("postgres:5432"))) {
      console.log("Local database detected - SSL disabled");
      return false;
    }

    console.log("Remote development database - SSL enabled with relaxed validation");
    return { rejectUnauthorized: false };
  } else {
    console.log("Database SSL mode: Production - using standard SSL");

    if (process.env.NODE_EXTRA_CA_CERTS) {
      console.log(`Using NODE_EXTRA_CA_CERTS: ${process.env.NODE_EXTRA_CA_CERTS}`);
      return { rejectUnauthorized: true };
    } else {
      console.log("No NODE_EXTRA_CA_CERTS found, SSL is disabled for this connection.");
      return false;
    }
  }
};

async function executeSQL() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
    max: 3,
    min: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true,
  });

  let client;

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'insert-test-measurements-simple.sql');
    console.log(`📁 Reading SQL file: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`📄 SQL file loaded (${sqlContent.length} characters)`);

    // Connect to database
    console.log('🔌 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Database connection successful');

    // Verify connection and customer exists
    const dbCheck = await client.query('SELECT current_database(), version()');
    console.log(`📊 Connected to database: ${dbCheck.rows[0].current_database}`);

    const customerCheck = await client.query('SELECT id, email FROM users WHERE id = $1', ['d241295e-3d34-451c-9585-01e47b112374']);
    if (customerCheck.rows.length === 0) {
      throw new Error('Customer ID d241295e-3d34-451c-9585-01e47b112374 not found in database');
    }
    console.log(`✅ Customer verified: ${customerCheck.rows[0].email}`);

    // Split SQL into individual statements
    // First, remove comments and split by semicolons
    const cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements or comments
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      // Add semicolon back if it's missing
      const finalStatement = statement.endsWith(';') ? statement : statement + ';';

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

        // Log first part of statement for debugging
        const preview = finalStatement.length > 100
          ? finalStatement.substring(0, 100) + '...'
          : finalStatement;
        console.log(`   ${preview}`);

        const result = await client.query(finalStatement);

        if (result.command === 'INSERT') {
          console.log(`   ✅ Inserted ${result.rowCount} rows`);
        } else if (result.command === 'DELETE') {
          console.log(`   ✅ Deleted ${result.rowCount} rows`);
        } else if (result.command === 'SELECT') {
          console.log(`   ✅ Selected ${result.rowCount} rows`);
          // If it's a summary query, show the results
          if (result.rows && result.rows.length > 0) {
            console.log('   📊 Results:');
            result.rows.forEach((row, index) => {
              console.log(`   ${index + 1}:`, row);
            });
          }
        } else {
          console.log(`   ✅ ${result.command} completed`);
        }

        successCount++;
      } catch (error) {
        console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
        console.error(`   📝 Statement that failed:`, finalStatement.substring(0, 500) + (finalStatement.length > 500 ? '...' : ''));
        errorCount++;

        // Continue with other statements unless it's a critical error
        if (error.message.includes('does not exist') || error.message.includes('syntax error')) {
          console.error('   🛑 Critical error detected, stopping execution');
          break;
        }
      }
    }

    console.log('\n📈 Execution Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📊 Total statements: ${successCount + errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 All test measurements inserted successfully!');
      console.log('You can now view the progress data in the application.');
    } else {
      console.log('\n⚠️ Some statements failed. Check the errors above.');
    }

  } catch (error) {
    console.error('💥 Script execution failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('🔌 Database connection released');
    }
    await pool.end();
    console.log('🏁 Database pool closed');
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting test measurements insertion script...\n');

  try {
    await executeSQL();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT, shutting down...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Received SIGTERM, shutting down...');
  process.exit(1);
});

// Run the script
main();