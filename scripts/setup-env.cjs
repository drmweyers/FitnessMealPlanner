#!/usr/bin/env node

/**
 * Setup environment variables properly for Windows/Unix compatibility
 */

const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  // Skip empty lines and comments
  if (!line || line.startsWith('#')) return;
  
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=');
    // Remove surrounding quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

// Verify OpenAI API key is present
if (envVars.OPENAI_API_KEY) {
  console.log('✅ OPENAI_API_KEY found in .env file');
  console.log('   Length:', envVars.OPENAI_API_KEY.length, 'characters');
  console.log('   Starts with:', envVars.OPENAI_API_KEY.substring(0, 10) + '...');
  
  // Set it as environment variable
  process.env.OPENAI_API_KEY = envVars.OPENAI_API_KEY;
  
  // Write to a temporary file for Windows compatibility
  const tempEnvPath = path.join(__dirname, '..', '.env.local');
  const cleanEnvContent = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  
  fs.writeFileSync(tempEnvPath, cleanEnvContent, 'utf8');
  console.log('✅ Created .env.local with clean formatting');
  
} else {
  console.error('❌ OPENAI_API_KEY not found in .env file');
  process.exit(1);
}

// Export for use in other scripts
module.exports = envVars;