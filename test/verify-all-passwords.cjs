const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner'
});

async function verifyAllTestAccounts() {
  try {
    const accounts = [
      { email: 'trainer.test@evofitmeals.com', expectedPassword: 'TestTrainer123!' },
      { email: 'customer.test@evofitmeals.com', expectedPassword: 'TestCustomer123!' },
      { email: 'admin@fitmeal.pro', expectedPassword: 'AdminPass123' }
    ];
    
    console.log('🔍 Checking all test account passwords...\n');
    
    for (const account of accounts) {
      console.log(`📧 ${account.email}:`);
      
      // Get the hash from database
      const result = await pool.query(
        "SELECT password FROM users WHERE email = $1",
        [account.email]
      );
      
      if (result.rows.length === 0) {
        console.log('   ❌ User not found in database\n');
        continue;
      }
      
      const hash = result.rows[0].password;
      
      // Test the expected password
      const match = await bcrypt.compare(account.expectedPassword, hash);
      
      if (match) {
        console.log(`   ✅ Password "${account.expectedPassword}" works!\n`);
      } else {
        console.log(`   ❌ Password "${account.expectedPassword}" does NOT work`);
        console.log('   🔧 Updating password...');
        
        // Update the password
        const newHash = await bcrypt.hash(account.expectedPassword, 10);
        await pool.query(
          "UPDATE users SET password = $1 WHERE email = $2",
          [newHash, account.email]
        );
        console.log(`   ✅ Password updated to "${account.expectedPassword}"\n`);
      }
    }
    
    console.log('✅ All accounts verified and updated!');
    console.log('\n📝 WORKING CREDENTIALS:');
    console.log('=======================');
    accounts.forEach(acc => {
      console.log(`Email: ${acc.email}`);
      console.log(`Password: ${acc.expectedPassword}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verifyAllTestAccounts();