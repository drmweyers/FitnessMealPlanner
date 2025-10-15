import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Get database URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal';

async function seedTestAccounts() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('================================');
    console.log('Seeding Test Accounts');
    console.log('================================');
    console.log(`Database: ${DATABASE_URL.replace(/\/\/.*@/, '//***@')}`);
    console.log('');

    // Test database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful!');
    console.log('');

    // Read the seed SQL file
    const seedFile = join(__dirname, 'auto-seed.sql');
    console.log(`Reading seed file: ${seedFile}`);
    const seedSQL = readFileSync(seedFile, 'utf-8');

    // Execute the seed script
    console.log('Executing seed script...');
    await pool.query(seedSQL);

    console.log('');
    console.log('================================');
    console.log('Test Accounts Seeded Successfully!');
    console.log('================================');
    console.log('');
    console.log('Available test accounts:');
    console.log('  Admin:    admin@fitmeal.pro / AdminPass123');
    console.log('  Trainer:  trainer.test@evofitmeals.com / TestTrainer123!');
    console.log('  Customer: customer.test@evofitmeals.com / TestCustomer123!');
    console.log('');
    console.log('================================');

    // Query and display the seeded accounts
    const result = await pool.query(`
      SELECT email, role, name, created_at
      FROM users
      WHERE email IN (
        'admin@fitmeal.pro',
        'trainer.test@evofitmeals.com',
        'customer.test@evofitmeals.com'
      )
      ORDER BY role
    `);

    if (result.rows.length > 0) {
      console.log('\nVerification:');
      console.table(result.rows);
    }

  } catch (error: any) {
    console.error('');
    console.error('================================');
    console.error('ERROR: Failed to seed test accounts');
    console.error('================================');

    if (error.code === 'ECONNREFUSED') {
      console.error('Could not connect to the database.');
      console.error('Please ensure PostgreSQL is running and accessible.');
      console.error(`Connection string: ${DATABASE_URL.replace(/\/\/.*@/, '//***@')}`);
      console.error('');
      console.error('To start the database with Docker:');
      console.error('  npm run docker:dev');
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedTestAccounts();
