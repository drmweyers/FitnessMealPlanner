const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner'
});

async function fixTestAccounts() {
  try {
    // Hash the password
    const hash = await bcrypt.hash('SecurePass123!', 10);
    console.log('Generated hash:', hash);
    
    // Update both test accounts
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE email IN ('trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com') RETURNING email",
      [hash]
    );
    
    console.log('✅ Updated accounts:', result.rows);
    
    // Verify the accounts
    const verify = await pool.query(
      "SELECT email, role FROM users WHERE email IN ('trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com')"
    );
    
    console.log('Accounts in database:', verify.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixTestAccounts();