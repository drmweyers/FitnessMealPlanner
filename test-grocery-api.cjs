// Test script to verify grocery list API functionality
// Node.js 18+ has fetch built-in

const BASE_URL = 'http://localhost:4000';
const CUSTOMER_EMAIL = 'customer.test@evofitmeals.com';
const CUSTOMER_PASSWORD = 'TestCustomer123!';

async function testGroceryListAPI() {
  try {
    console.log('🔑 Step 1: Logging in as customer...');
    
    // Login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD })
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status);
      const text = await loginResponse.text();
      console.error('Response:', text);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful!', loginData.user?.email);
    
    // Extract token
    const token = loginResponse.headers.get('x-access-token') || loginData.accessToken || loginData.token;
    const cookieHeader = loginResponse.headers.get('set-cookie') || '';
    
    console.log('Token found:', !!token);
    console.log('Cookies found:', !!cookieHeader);
    
    // Headers for authenticated requests
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(cookieHeader && { 'Cookie': cookieHeader })
    };
    
    console.log('\n📋 Step 2: Fetching grocery lists...');
    
    // Get grocery lists
    const listsResponse = await fetch(`${BASE_URL}/api/grocery-lists`, {
      headers: authHeaders
    });
    
    if (!listsResponse.ok) {
      console.error('Failed to fetch lists:', listsResponse.status);
      const text = await listsResponse.text();
      console.error('Response:', text);
      return;
    }
    
    const listsData = await listsResponse.json();
    console.log('Grocery lists response:', listsData);
    
    let listId;
    
    // Check if we have lists
    if (listsData.groceryLists && listsData.groceryLists.length > 0) {
      listId = listsData.groceryLists[0].id;
      console.log('✅ Found existing list:', listId);
    } else {
      // Create a new list
      console.log('\n📝 Creating a new grocery list...');
      const createListResponse = await fetch(`${BASE_URL}/api/grocery-lists`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Test List' })
      });
      
      if (!createListResponse.ok) {
        console.error('Failed to create list:', createListResponse.status);
        const text = await createListResponse.text();
        console.error('Response:', text);
        return;
      }
      
      const newList = await createListResponse.json();
      listId = newList.id;
      console.log('✅ Created new list:', listId);
    }
    
    console.log('\n➕ Step 3: Adding an item to the list...');
    
    // Add item to list
    const addItemResponse = await fetch(`${BASE_URL}/api/grocery-lists/${listId}/items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Test Item ${Date.now()}`,
        quantity: 5,
        unit: 'pcs',
        category: 'produce',
        isChecked: false
      })
    });
    
    if (!addItemResponse.ok) {
      console.error('Failed to add item:', addItemResponse.status);
      const text = await addItemResponse.text();
      console.error('Response:', text);
      return;
    }
    
    const newItem = await addItemResponse.json();
    console.log('✅ Added item:', newItem);
    
    console.log('\n📖 Step 4: Fetching list with items...');
    
    // Get the list with items
    const listDetailsResponse = await fetch(`${BASE_URL}/api/grocery-lists/${listId}`, {
      headers: authHeaders
    });
    
    if (!listDetailsResponse.ok) {
      console.error('Failed to fetch list details:', listDetailsResponse.status);
      return;
    }
    
    const listDetails = await listDetailsResponse.json();
    console.log('List with items:', JSON.stringify(listDetails, null, 2));
    
    if (listDetails.items && listDetails.items.length > 0) {
      const itemId = listDetails.items[0].id;
      
      console.log('\n✏️ Step 5: Updating item (toggle checked)...');
      
      // Update item
      const updateItemResponse = await fetch(`${BASE_URL}/api/grocery-lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ isChecked: true })
      });
      
      if (!updateItemResponse.ok) {
        console.error('Failed to update item:', updateItemResponse.status);
        const text = await updateItemResponse.text();
        console.error('Response:', text);
      } else {
        const updatedItem = await updateItemResponse.json();
        console.log('✅ Updated item:', updatedItem);
      }
    }
    
    console.log('\n✅ All API tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testGroceryListAPI();
