const bcrypt = require('bcryptjs');

// Generate hashes for the standard test passwords
const passwords = {
  admin: 'AdminPass123',
  trainer: 'TestTrainer123!',
  customer: 'TestCustomer123!'
};

console.log('Generating bcrypt hashes for test accounts...\n');

for (const [role, password] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`${role}:`);
  console.log(`  Password: ${password}`);
  console.log(`  Hash: ${hash}`);
  console.log();
}

// Verify the hashes work
console.log('Verifying hashes...');
for (const [role, password] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(password, 10);
  const valid = bcrypt.compareSync(password, hash);
  console.log(`${role}: ${valid ? '✅ Valid' : '❌ Invalid'}`);
}