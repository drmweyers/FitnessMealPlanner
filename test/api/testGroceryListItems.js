import fetch from 'node-fetch';

async function testGroceryListItems() {
  try {
    console.log('Testing Grocery List Items...\n');

    // Login
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer.test@evofitmeals.com',
        password: 'TestCustomer123!'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;

    // Get the existing list
    const listsResponse = await fetch('http://localhost:4000/api/grocery-lists', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const listsData = await listsResponse.json();
    console.log('Existing lists:', JSON.stringify(listsData, null, 2));

    if (listsData.groceryLists && listsData.groceryLists.length > 0) {
      const listId = listsData.groceryLists[0].id;
      console.log(`\nFetching items for list ${listId}...`);

      // Get specific list with items
      const listResponse = await fetch(`http://localhost:4000/api/grocery-lists/${listId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const listData = await listResponse.json();
      console.log('List with items:', JSON.stringify(listData, null, 2));

      // If no items, add some
      if (!listData.items || listData.items.length === 0) {
        console.log('\nNo items found, adding test items...');

        const testItems = [
          { name: 'Milk', quantity: 1, unit: 'gallon', category: 'dairy' },
          { name: 'Bread', quantity: 2, unit: 'loaves', category: 'pantry' },
          { name: 'Eggs', quantity: 1, unit: 'dozen', category: 'dairy' },
          { name: 'Apples', quantity: 6, unit: 'pieces', category: 'produce' },
          { name: 'Chicken Breast', quantity: 2, unit: 'lbs', category: 'meat' }
        ];

        for (const item of testItems) {
          const addResponse = await fetch(`http://localhost:4000/api/grocery-lists/${listId}/items`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
          });

          if (addResponse.ok) {
            const addedItem = await addResponse.json();
            console.log(`Added: ${addedItem.name}`);
          } else {
            console.error(`Failed to add ${item.name}:`, await addResponse.text());
          }
        }

        // Fetch again to see items
        const updatedListResponse = await fetch(`http://localhost:4000/api/grocery-lists/${listId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const updatedListData = await updatedListResponse.json();
        console.log('\nUpdated list with items:', JSON.stringify(updatedListData, null, 2));
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGroceryListItems();