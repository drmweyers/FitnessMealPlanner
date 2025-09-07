#!/usr/bin/env node

/**
 * OAuth Environment Configuration Setup Script
 * This script helps configure OAuth environment variables for the FitnessMealPlanner app
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setupOAuth() {
  console.log('🔐 OAuth Configuration Setup for FitnessMealPlanner\n');
  console.log('This script will help you configure OAuth environment variables.');
  console.log('Press Enter to skip any optional configuration.\n');

  const config = {};

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    console.log('⚠️  No .env file found. Creating one from .env.example...\n');
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
    } else {
      fs.writeFileSync(envPath, '# FitnessMealPlanner Environment Configuration\n\n');
    }
  }

  // Generate secure session secret
  const sessionSecret = crypto.randomBytes(64).toString('hex');
  config.OAUTH_SESSION_SECRET = sessionSecret;
  console.log('✅ Generated secure OAuth session secret\n');

  // Google OAuth
  console.log('📘 Google OAuth Configuration:');
  const useGoogle = await question('Configure Google OAuth? (y/N): ');
  
  if (useGoogle.toLowerCase() === 'y') {
    config.GOOGLE_CLIENT_ID = await question('Enter Google Client ID: ');
    config.GOOGLE_CLIENT_SECRET = await question('Enter Google Client Secret: ');
    config.GOOGLE_CALLBACK_URL = await question('Enter Google Callback URL (default: http://localhost:4000/auth/google/callback): ') 
      || 'http://localhost:4000/auth/google/callback';
    console.log('✅ Google OAuth configured\n');
  } else {
    // Set placeholder values
    config.GOOGLE_CLIENT_ID = 'not-configured';
    config.GOOGLE_CLIENT_SECRET = 'not-configured';
    config.GOOGLE_CALLBACK_URL = 'http://localhost:4000/auth/google/callback';
    console.log('⏭️  Skipping Google OAuth\n');
  }

  // Facebook OAuth
  console.log('📘 Facebook OAuth Configuration:');
  const useFacebook = await question('Configure Facebook OAuth? (y/N): ');
  
  if (useFacebook.toLowerCase() === 'y') {
    config.FACEBOOK_APP_ID = await question('Enter Facebook App ID: ');
    config.FACEBOOK_APP_SECRET = await question('Enter Facebook App Secret: ');
    config.FACEBOOK_CALLBACK_URL = await question('Enter Facebook Callback URL (default: http://localhost:4000/auth/facebook/callback): ')
      || 'http://localhost:4000/auth/facebook/callback';
    console.log('✅ Facebook OAuth configured\n');
  } else {
    config.FACEBOOK_APP_ID = 'not-configured';
    config.FACEBOOK_APP_SECRET = 'not-configured';
    config.FACEBOOK_CALLBACK_URL = 'http://localhost:4000/auth/facebook/callback';
    console.log('⏭️  Skipping Facebook OAuth\n');
  }

  // GitHub OAuth
  console.log('🐙 GitHub OAuth Configuration:');
  const useGitHub = await question('Configure GitHub OAuth? (y/N): ');
  
  if (useGitHub.toLowerCase() === 'y') {
    config.GITHUB_CLIENT_ID = await question('Enter GitHub Client ID: ');
    config.GITHUB_CLIENT_SECRET = await question('Enter GitHub Client Secret: ');
    config.GITHUB_CALLBACK_URL = await question('Enter GitHub Callback URL (default: http://localhost:4000/auth/github/callback): ')
      || 'http://localhost:4000/auth/github/callback';
    console.log('✅ GitHub OAuth configured\n');
  } else {
    config.GITHUB_CLIENT_ID = 'not-configured';
    config.GITHUB_CLIENT_SECRET = 'not-configured';
    config.GITHUB_CALLBACK_URL = 'http://localhost:4000/auth/github/callback';
    console.log('⏭️  Skipping GitHub OAuth\n');
  }

  // Additional OAuth settings
  config.OAUTH_SESSION_NAME = 'fitmeal_oauth_session';
  config.OAUTH_SESSION_MAX_AGE = '86400000'; // 24 hours
  config.OAUTH_RATE_LIMIT_WINDOW = '900000'; // 15 minutes
  config.OAUTH_RATE_LIMIT_MAX_REQUESTS = '5';
  config.OAUTH_REQUIRE_EMAIL_VERIFICATION = 'false'; // Set to false for development

  // Production URLs
  const isProduction = await question('Configure production OAuth redirect URLs? (y/N): ');
  
  if (isProduction.toLowerCase() === 'y') {
    config.PRODUCTION_OAUTH_SUCCESS_REDIRECT = await question('Enter production success redirect URL: ')
      || 'https://evofitmeals.com/dashboard';
    config.PRODUCTION_OAUTH_FAILURE_REDIRECT = await question('Enter production failure redirect URL: ')
      || 'https://evofitmeals.com/login?error=oauth_failed';
  } else {
    config.PRODUCTION_OAUTH_SUCCESS_REDIRECT = 'https://evofitmeals.com/dashboard';
    config.PRODUCTION_OAUTH_FAILURE_REDIRECT = 'https://evofitmeals.com/login?error=oauth_failed';
  }

  // Read existing .env file
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Add OAuth configuration section if it doesn't exist
  if (!envContent.includes('# OAuth Configuration')) {
    envContent += '\n# OAuth Configuration\n';
  }

  // Update or add each configuration value
  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      // Update existing value
      envContent = envContent.replace(regex, newLine);
    } else {
      // Add new value
      envContent += `${newLine}\n`;
    }
  });

  // Write updated .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ OAuth configuration completed successfully!');
  console.log('📄 Configuration written to .env file');
  console.log('\n⚠️  Important Security Notes:');
  console.log('1. Never commit the .env file to version control');
  console.log('2. Use different OAuth credentials for development and production');
  console.log('3. Enable HTTPS in production for OAuth security');
  console.log('4. Regularly rotate OAuth secrets');
  console.log('\n🚀 You can now use OAuth authentication in your application!');

  rl.close();
}

// Run the setup
setupOAuth().catch(error => {
  console.error('❌ Error during OAuth setup:', error);
  rl.close();
  process.exit(1);
});