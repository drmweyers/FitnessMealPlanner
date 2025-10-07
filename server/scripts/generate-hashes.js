import bcrypt from 'bcrypt';

const passwords = [
  { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
];

async function generateHashes() {
  console.log('Generating bcrypt hashes for test accounts...\n');

  for (const account of passwords) {
    const hash = await bcrypt.hash(account.password, 10);
    console.log(`-- ${account.email}`);
    console.log(`'${hash}', -- ${account.password}`);
    console.log('');
  }
}

generateHashes().catch(console.error);