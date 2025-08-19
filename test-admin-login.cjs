const fetch = require('node-fetch');

async function testAdminLogin() {
  const credentials = {
    email: 'admin@fitmeal.pro',
    password: 'Admin123!@#'
  };

  try {
    console.log('Testing admin login...');
    console.log('Email:', credentials.email);
    console.log('Password:', credentials.password);

    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const data = await response.text();
    console.log('Response body:', data);

    if (response.ok) {
      console.log('✅ Admin login successful!');
    } else {
      console.log('❌ Admin login failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAdminLogin();