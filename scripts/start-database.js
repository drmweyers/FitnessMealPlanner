#!/usr/bin/env node

/**
 * Database Startup Script
 *
 * Starts PostgreSQL database using Docker Compose
 * Handles Docker Desktop startup and health checks
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MAX_RETRIES = 12;
const RETRY_INTERVAL = 5000; // 5 seconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDockerRunning() {
  try {
    await execAsync('docker ps');
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForDocker() {
  console.log('🔍 Checking if Docker Desktop is running...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    const isRunning = await checkDockerRunning();

    if (isRunning) {
      console.log('✅ Docker Desktop is ready!');
      return true;
    }

    if (i === 0) {
      console.log('⏳ Docker Desktop is not ready yet.');
      console.log('   Please make sure Docker Desktop is running.');
      console.log('   Waiting for Docker to start...');
    } else {
      console.log(`   Retry ${i}/${MAX_RETRIES}...`);
    }

    await sleep(RETRY_INTERVAL);
  }

  console.error('❌ Docker Desktop did not start within the expected time.');
  console.error('\n💡 Solutions:');
  console.error('   1. Start Docker Desktop manually');
  console.error('   2. Wait a few moments for Docker Desktop to fully start');
  console.error('   3. Run this script again once Docker Desktop is running');
  return false;
}

async function startPostgres() {
  console.log('🚀 Starting PostgreSQL database...');

  try {
    const { stdout, stderr } = await execAsync('docker-compose --profile dev up -d postgres');
    console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('✅ PostgreSQL database started successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to start PostgreSQL:', error.message);
    return false;
  }
}

async function waitForPostgres() {
  console.log('⏳ Waiting for PostgreSQL to be ready...');

  for (let i = 0; i < 10; i++) {
    try {
      const { stdout } = await execAsync('docker-compose --profile dev ps postgres');
      if (stdout.includes('healthy') || stdout.includes('Up')) {
        console.log('✅ PostgreSQL is ready!');
        return true;
      }
    } catch (error) {
      // Ignore and retry
    }

    await sleep(2000);
  }

  console.log('⚠️  PostgreSQL health check timeout, but it might still be starting...');
  return true; // Continue anyway
}

async function showStatus() {
  console.log('\n📊 Database Status:');
  try {
    const { stdout } = await execAsync('docker-compose --profile dev ps');
    console.log(stdout);
  } catch (error) {
    console.error('Could not get status:', error.message);
  }
}

async function main() {
  console.log('🗄️  Database Startup Script');
  console.log('='.repeat(50));

  // Check if Docker is running
  const dockerReady = await waitForDocker();
  if (!dockerReady) {
    process.exit(1);
  }

  // Start PostgreSQL
  const postgresStarted = await startPostgres();
  if (!postgresStarted) {
    console.error('\n⚠️  PostgreSQL failed to start.');
    console.error('   Check Docker Desktop and try again.');
    process.exit(1);
  }

  // Wait for PostgreSQL to be healthy
  await waitForPostgres();

  // Show status
  await showStatus();

  console.log('\n✅ Database is ready!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run: npm run seed-test-accounts');
  console.log('   2. Run: npm run dev');
  console.log('\n🛑 To stop the database:');
  console.log('   docker-compose --profile dev down');
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
