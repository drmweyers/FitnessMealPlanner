/**
 * Setup Production Test Accounts
 * 
 * This script creates the test accounts in production with the correct passwords
 * and establishes the trainer-customer relationship.
 * 
 * Usage:
 *   DATABASE_URL="your_production_database_url" node scripts/setup-production-test-accounts.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Test account definitions with correct passwords
const TEST_ACCOUNTS = {
  admin: {
    id: 'f6163be0-19f8-4b2b-900e-7d49815ab8b0',
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
    name: 'Test Admin',
    role: 'admin'
  },
  trainer: {
    id: 'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
    email: 'trainer.test@evofitmeals.com',
    password: 'SecurePass123!',
    name: 'Test Trainer',
    role: 'trainer'
  },
  customer: {
    id: 'f32890cc-af72-40dc-b92e-beef32118ca0',
    email: 'customer.test@evofitmeals.com',
    password: 'SecurePass123!',
    name: 'Test Customer',
    role: 'customer'
  }
};

async function setupProductionTestAccounts() {
  console.log('🚀 Setting up Production Test Accounts');
  console.log('=====================================\n');
  
  // Check for database URL
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.log('\nUsage:');
    console.log('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/setup-production-test-accounts.js');
    process.exit(1);
  }
  
  // Mask password in URL for display
  const maskedUrl = DATABASE_URL.replace(/:([^@]+)@/, ':****@');
  console.log(`📊 Database: ${maskedUrl}\n`);
  
  // Create connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Create each test account
    for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
      console.log(`\n📝 Processing ${key.toUpperCase()} account...`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: ${account.password}`);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      // Insert or update the user
      const upsertQuery = `
        INSERT INTO users (id, email, password, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          updated_at = NOW()
        RETURNING id, email, role
      `;
      
      const result = await client.query(upsertQuery, [
        account.id,
        account.email,
        hashedPassword,
        account.name,
        account.role
      ]);
      
      console.log(`   ✅ Account ready: ${result.rows[0].email} (${result.rows[0].role})`);
    }
    
    // Create trainer-customer relationship
    console.log('\n🔗 Creating Trainer-Customer Relationship...');
    
    const invitationQuery = `
      INSERT INTO customer_invitations (
        id,
        trainer_id,
        customer_email,
        token,
        expires_at,
        used_at,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        NOW() + INTERVAL '7 days',
        NOW(),
        NOW()
      )
      ON CONFLICT (trainer_id, customer_email) 
      DO UPDATE SET 
        used_at = NOW()
      RETURNING id
    `;
    
    await client.query(invitationQuery, [
      TEST_ACCOUNTS.trainer.id,
      TEST_ACCOUNTS.customer.email,
      'test-token-' + Date.now()
    ]);
    
    console.log('   ✅ Trainer and Customer are now connected');
    
    // Verify the setup
    console.log('\n📊 Verifying Account Setup...');
    
    const verifyQuery = `
      SELECT u.email, u.role, u.name 
      FROM users u 
      WHERE u.email IN ($1, $2, $3)
      ORDER BY u.role
    `;
    
    const verifyResult = await client.query(verifyQuery, [
      TEST_ACCOUNTS.admin.email,
      TEST_ACCOUNTS.trainer.email,
      TEST_ACCOUNTS.customer.email
    ]);
    
    console.log('\n✅ All test accounts are ready:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.role.toUpperCase()}: ${row.email}`);
    });
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ SUCCESS! Production test accounts are ready to use!');
    console.log('='.repeat(60));
    
    console.log('\n📋 TEST ACCOUNT CREDENTIALS:');
    console.log('----------------------------');
    console.log('ADMIN:');
    console.log(`  Email: ${TEST_ACCOUNTS.admin.email}`);
    console.log(`  Password: ${TEST_ACCOUNTS.admin.password}`);
    console.log('\nTRAINER:');
    console.log(`  Email: ${TEST_ACCOUNTS.trainer.email}`);
    console.log(`  Password: ${TEST_ACCOUNTS.trainer.password}`);
    console.log('\nCUSTOMER:');
    console.log(`  Email: ${TEST_ACCOUNTS.customer.email}`);
    console.log(`  Password: ${TEST_ACCOUNTS.customer.password}`);
    
    console.log('\n🔗 RELATIONSHIP:');
    console.log('  ✅ Trainer and Customer are connected');
    console.log('  ✅ Customer can receive meal plans from Trainer');
    console.log('  ✅ Trainer can manage Customer\'s meal plans');
    
    console.log('\n🌐 HOW TO TEST:');
    console.log('  1. Go to https://evofitmeals.com');
    console.log('  2. Login as Trainer');
    console.log('  3. Create and save a meal plan');
    console.log('  4. Assign it to the test customer');
    console.log('  5. Logout and login as Customer');
    console.log('  6. View the assigned meal plan');
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n❌ Error setting up test accounts:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupProductionTestAccounts().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});