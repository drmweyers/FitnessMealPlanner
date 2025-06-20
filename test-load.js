
// Load testing for concurrent requests
async function loadTest() {
  console.log('Starting load test with 20 concurrent requests...');
  
  const requests = Array.from({ length: 20 }, async (_, i) => {
    const response = await fetch('http://localhost:5000/api/recipes?limit=10');
    console.log(`Request ${i + 1}: ${response.status} - ${response.ok ? 'Success' : 'Failed'}`);
    return response.ok;
  });
  
  const results = await Promise.all(requests);
  const successCount = results.filter(Boolean).length;
  
  console.log(`Load test complete: ${successCount}/20 requests successful`);
  console.log(`Success rate: ${(successCount / 20 * 100).toFixed(1)}%`);
}

loadTest();
