import fetch from 'node-fetch';

async function testGroceryListsAPI() {
  try {
    console.log('Testing Grocery Lists API...\n');

    // 1. First, login as customer
    console.log('1. Logging in as customer...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer.test@evofitmeals.com',
        password: 'TestCustomer123!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.data?.accessToken) {
      throw new Error('Login failed - no token received');
    }

    const token = loginData.data.accessToken;
    console.log('Token received:', token.substring(0, 20) + '...\n');

    // 2. Test GET /api/grocery-lists
    console.log('2. Testing GET /api/grocery-lists...');
    const listsResponse = await fetch('http://localhost:4000/api/grocery-lists', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Status:', listsResponse.status);
    console.log('Headers:', listsResponse.headers.raw());

    const listsData = await listsResponse.text();
    console.log('Response body:', listsData);

    try {
      const parsed = JSON.parse(listsData);
      console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }

    console.log('\n3. Testing POST /api/grocery-lists (create new list)...');
    const createResponse = await fetch('http://localhost:4000/api/grocery-lists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Grocery List',
        isActive: true
      })
    });

    console.log('Create Status:', createResponse.status);
    const createData = await createResponse.json();
    console.log('Create Response:', JSON.stringify(createData, null, 2));

    if (createData.id) {
      console.log('\n4. Testing GET /api/grocery-lists/{id}...');
      const getListResponse = await fetch(`http://localhost:4000/api/grocery-lists/${createData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Get List Status:', getListResponse.status);
      const getListData = await getListResponse.json();
      console.log('Get List Response:', JSON.stringify(getListData, null, 2));

      // 5. Test adding an item
      console.log('\n5. Testing POST /api/grocery-lists/{id}/items (add item)...');
      const addItemResponse = await fetch(`http://localhost:4000/api/grocery-lists/${createData.id}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Milk',
          quantity: '1 gallon',
          category: 'Dairy'
        })
      });

      console.log('Add Item Status:', addItemResponse.status);
      const addItemData = await addItemResponse.json();
      console.log('Add Item Response:', JSON.stringify(addItemData, null, 2));
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGroceryListsAPI();