const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner'
});

async function verifyPasswords() {
  try {
    const passwords = [
      'TestTrainer123!',
      'SecurePass123!',
      'Trainer123!',
      'trainer123'
    ];
    
    // Get the hash from database
    const result = await pool.query(
      "SELECT password FROM users WHERE email = 'trainer.test@evofitmeals.com'"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No user found with email trainer.test@evofitmeals.com');
      return;
    }
    
    const hash = result.rows[0].password;
    console.log('Found user with hash starting:', hash.substring(0, 30));
    
    // Test each password
    console.log('\nTesting passwords:');
    for (const password of passwords) {
      const match = await bcrypt.compare(password, hash);
      console.log(`  ${password}: ${match ? '✅ MATCH' : '❌ no match'}`);
    }
    
    // If none match, set the correct password
    const correctPassword = 'TestTrainer123!';
    const matchesCorrect = await bcrypt.compare(correctPassword, hash);
    
    if (!matchesCorrect) {
      console.log('\n⚠️ Password needs to be updated...');
      const newHash = await bcrypt.hash(correctPassword, 10);
      await pool.query(
        "UPDATE users SET password = $1 WHERE email = 'trainer.test@evofitmeals.com'",
        [newHash]
      );
      console.log('✅ Password updated to TestTrainer123!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verifyPasswords();