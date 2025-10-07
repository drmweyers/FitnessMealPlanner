#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🔍 FitnessMealPlanner Setup Checker\n'));

let hasErrors = false;

// Check Docker
try {
  execSync('docker --version', { stdio: 'pipe' });
  console.log(chalk.green('✓ Docker is installed'));
  
  // Check if Docker is running
  try {
    execSync('docker ps', { stdio: 'pipe' });
    console.log(chalk.green('✓ Docker is running'));
  } catch {
    console.log(chalk.red('✗ Docker is not running. Please start Docker Desktop.'));
    hasErrors = true;
  }
} catch {
  console.log(chalk.red('✗ Docker is not installed. Please install Docker Desktop.'));
  hasErrors = true;
}

// Check Docker Compose
try {
  const output = execSync('docker-compose --version', { stdio: 'pipe' }).toString();
  console.log(chalk.green('✓ Docker Compose is installed'));
} catch {
  console.log(chalk.red('✗ Docker Compose is not installed.'));
  hasErrors = true;
}

// Check .env file
if (existsSync('.env')) {
  console.log(chalk.green('✓ .env file exists'));
  
  // Check for required variables
  const envContent = readFileSync('.env', 'utf-8');
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(chalk.green(`✓ ${varName} is configured`));
    } else {
      console.log(chalk.yellow(`⚠ ${varName} is not configured in .env`));
    }
  });
} else {
  console.log(chalk.yellow('⚠ .env file not found. Copy .env.example to .env'));
  hasErrors = true;
}

// Check ports
const checkPort = (port, service) => {
  try {
    // This is a simple check - on Windows it might need adjustment
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' }).toString();
      if (output.includes('LISTENING')) {
        console.log(chalk.yellow(`⚠ Port ${port} (${service}) is already in use`));
      }
    } else {
      try {
        execSync(`lsof -i :${port}`, { stdio: 'pipe' });
        console.log(chalk.yellow(`⚠ Port ${port} (${service}) is already in use`));
      } catch {
        // Port is free
      }
    }
  } catch {
    // Port is likely free
  }
};

checkPort(4000, 'Development server');
checkPort(5432, 'PostgreSQL');

// Check Node version
try {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.split('.')[0].substring(1));
  if (major >= 18) {
    console.log(chalk.green(`✓ Node.js ${nodeVersion} meets requirements`));
  } else {
    console.log(chalk.yellow(`⚠ Node.js ${nodeVersion} - recommended v18 or higher`));
  }
} catch {
  console.log(chalk.red('✗ Could not check Node.js version'));
}

// Summary
console.log('\n' + chalk.blue.bold('Summary:'));
if (hasErrors) {
  console.log(chalk.red('Some issues were found. Please address them before starting development.'));
  console.log(chalk.yellow('\nNext steps:'));
  console.log('1. Ensure Docker Desktop is installed and running');
  console.log('2. Copy .env.example to .env and configure it');
  console.log('3. Run: npm run docker:dev');
} else {
  console.log(chalk.green('✓ Your environment is ready!'));
  console.log(chalk.cyan('\nTo start development:'));
  console.log('  npm run docker:dev');
  console.log('\nThen access the app at http://localhost:4000');
}

process.exit(hasErrors ? 1 : 0);