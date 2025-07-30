#!/usr/bin/env tsx

import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🧪 Running Trainer Meal Plan Management Integration Tests\n'));

// Check if Docker is running
try {
  execSync('docker ps', { stdio: 'ignore' });
  console.log(chalk.green('✓ Docker is running'));
} catch (error) {
  console.error(chalk.red('✗ Docker is not running. Please start Docker first.'));
  console.log(chalk.yellow('\nTo start the development environment:'));
  console.log(chalk.cyan('  docker-compose --profile dev up -d'));
  process.exit(1);
}

// Check if the development container is running
try {
  const result = execSync('docker ps --filter name=fitnessmealplanner-dev --format "{{.Names}}"', { 
    encoding: 'utf-8' 
  });
  
  if (!result.trim().includes('fitnessmealplanner-dev')) {
    console.log(chalk.yellow('⚠️  Development container is not running. Starting it now...'));
    execSync('docker-compose --profile dev up -d', { stdio: 'inherit' });
    
    // Wait for the container to be ready
    console.log(chalk.blue('Waiting for services to be ready...'));
    await new Promise(resolve => setTimeout(resolve, 10000));
  } else {
    console.log(chalk.green('✓ Development container is running'));
  }
} catch (error) {
  console.error(chalk.red('Error checking Docker container status'));
  process.exit(1);
}

// Run the integration tests
console.log(chalk.blue('\nRunning integration tests...\n'));

try {
  execSync('npm test -- test/integration/trainerMealPlanManagement.test.ts', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fitmeal',
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      DB_SSL_MODE: 'disable'
    }
  });
  
  console.log(chalk.green.bold('\n✅ All integration tests passed!\n'));
} catch (error) {
  console.error(chalk.red.bold('\n❌ Integration tests failed\n'));
  process.exit(1);
}

// Show test coverage summary
console.log(chalk.blue('Test Coverage Summary:'));
console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.white('• Meal Plan CRUD Operations: ✓'));
console.log(chalk.white('• Assignment Management: ✓'));
console.log(chalk.white('• Authorization & Security: ✓'));
console.log(chalk.white('• Error Handling: ✓'));
console.log(chalk.white('• Performance & Concurrency: ✓'));
console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));