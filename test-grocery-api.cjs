const http = require('http');

// Login first
const loginData = JSON.stringify({
  email: 'customer.test@evofitmeals.com',
  password: 'TestCustomer123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Logging in as customer...');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Login response:', response);

      if (response.data && response.data.accessToken) {
        const token = response.data.accessToken;
        // Now fetch grocery lists
        const listOptions = {
          hostname: 'localhost',
          port: 4000,
          path: '/api/grocery-lists',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        };

        console.log('\nFetching grocery lists...');

        const listReq = http.request(listOptions, (res2) => {
          let listData = '';

          res2.on('data', chunk => {
            listData += chunk;
          });

          res2.on('end', () => {
            try {
              const lists = JSON.parse(listData);
              console.log('\nGrocery Lists Response:');
              console.log(JSON.stringify(lists, null, 2));

              if (lists.groceryLists && lists.groceryLists.length > 0) {
                console.log(`\n✅ Found ${lists.groceryLists.length} grocery list(s)`);
                lists.groceryLists.forEach(list => {
                  console.log(`  - ${list.name} (${list.itemCount} items)`);
                });
              } else {
                console.log('\n❌ No grocery lists found');
              }
            } catch (e) {
              console.error('Error parsing grocery lists:', e);
              console.log('Raw response:', listData);
            }
          });
        });

        listReq.on('error', console.error);
        listReq.end();
      } else {
        console.log('No token received');
      }
    } catch (e) {
      console.error('Error parsing login response:', e);
      console.log('Raw response:', data);
    }
  });
});

loginReq.on('error', console.error);
loginReq.write(loginData);
loginReq.end();