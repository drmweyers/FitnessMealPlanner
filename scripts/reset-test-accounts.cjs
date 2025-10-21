#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fitmeal',
  ssl: false
});

const TEST_ACCOUNTS = [
  {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
    role: 'admin'
  },
  {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    role: 'trainer'
  },
  {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
    role: 'customer'
  }
];

async function resetTestAccounts() {
  try {
    console.log('🔄 Resetting test accounts...\n');

    for (const account of TEST_ACCOUNTS) {
      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, 12);

      // Delete existing account
      await pool.query('DELETE FROM users WHERE email = $1', [account.email]);

      // Insert new account
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [account.email, hashedPassword, account.role]
      );

      console.log(`✅ ${account.role.toUpperCase()}: ${account.email} / ${account.password}`);
    }

    console.log('\n🎉 Test accounts reset successfully!\n');
    console.log('📝 Test Credentials:');
    console.log('='.repeat(50));
    console.log('ADMIN:');
    console.log('  Email: admin@fitmeal.pro');
    console.log('  Password: AdminPass123');
    console.log('');
    console.log('TRAINER:');
    console.log('  Email: trainer.test@evofitmeals.com');
    console.log('  Password: TestTrainer123!');
    console.log('');
    console.log('CUSTOMER:');
    console.log('  Email: customer.test@evofitmeals.com');
    console.log('  Password: TestCustomer123!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetTestAccounts();
