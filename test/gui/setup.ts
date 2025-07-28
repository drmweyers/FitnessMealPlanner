import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
  // Global test setup
  console.log('🔧 Setting up GUI test environment...');
  
  // Verify required environment variables
  if (!process.env.TEST_BASE_URL) {
    process.env.TEST_BASE_URL = 'http://localhost:4000';
  }
  
  // Wait for application to be ready
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(`${process.env.TEST_BASE_URL}/health`);
      if (response.ok) {
        console.log('✅ Application is ready for testing');
        break;
      }
    } catch (error) {
      retries++;
      if (retries === maxRetries) {
        throw new Error(`Application not ready after ${maxRetries} attempts. Please ensure the app is running at ${process.env.TEST_BASE_URL}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up GUI test environment...');
  // Global cleanup if needed
});