import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up mobile test environment...');

  try {
    // Check if Docker is running
    execSync('docker ps', { stdio: 'ignore' });
    console.log('✅ Docker is running');
  } catch (error) {
    console.error('❌ Docker is not running. Please start Docker and try again.');
    process.exit(1);
  }

  try {
    // Start development environment
    console.log('🐳 Starting Docker development environment...');
    execSync('docker-compose --profile dev up -d', {
      stdio: 'inherit',
      timeout: 60000
    });
    console.log('✅ Docker environment started');

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Verify services are responding
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('http://localhost:4000/login');
        if (response.ok) {
          console.log('✅ Application is responding');
          break;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error('❌ Application failed to start after retries');
          throw error;
        }
        console.log(`⏳ Waiting for application... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Prepare test data if needed
    console.log('📋 Preparing test data...');

    // Create test results directory
    try {
      execSync('mkdir -p test/mobile-test-results', { stdio: 'ignore' });
    } catch (error) {
      // Directory might already exist
    }

    console.log('🎉 Mobile test environment setup complete!');

  } catch (error) {
    console.error('❌ Failed to setup mobile test environment:', error);

    // Cleanup on failure
    try {
      execSync('docker-compose --profile dev down', { stdio: 'ignore' });
    } catch (cleanupError) {
      console.error('Failed to cleanup after setup failure:', cleanupError);
    }

    process.exit(1);
  }
}

export default globalSetup;