const http = require('http');

const testAccounts = [
  { email: 'admin@fitmeal.pro', password: 'AdminPass123', role: 'admin' },
  { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!', role: 'trainer' },
  { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!', role: 'customer' }
];

async function testLogin(email, password, expectedRole) {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({ email, password });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
}

async function testAllAccounts() {
  console.log('Testing all test account credentials...\n');
  console.log('=' .repeat(50));

  for (const account of testAccounts) {
    console.log(`\nTesting ${account.role.toUpperCase()} account:`);
    console.log(`Email: ${account.email}`);
    console.log(`Password: ${account.password}`);

    try {
      const response = await testLogin(account.email, account.password, account.role);

      if (response.status === 'success' && response.data && response.data.accessToken) {
        console.log(`✅ LOGIN SUCCESS - Token received`);
        console.log(`   User ID: ${response.data.user.id}`);
        console.log(`   Role: ${response.data.user.role}`);
      } else {
        console.log(`❌ LOGIN FAILED`);
        console.log(`   Response: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      console.log(`❌ LOGIN ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('Test complete!');
}

testAllAccounts().catch(console.error);