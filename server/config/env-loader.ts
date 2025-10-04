/**
 * Environment variable loader with fallback support
 * Handles Windows/Unix compatibility issues
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env.local first (cleaned version), then .env
const envLocalPath = path.join(__dirname, '..', '..', '.env.local');
const envPath = path.join(__dirname, '..', '..', '.env');

let envLoaded = false;

if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment from .env.local');
  const result = dotenv.config({ path: envLocalPath });
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
  } else {
    envLoaded = true;
  }
} 

if (!envLoaded && fs.existsSync(envPath)) {
  console.log('Loading environment from .env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env:', result.error);
  } else {
    envLoaded = true;
  }
}

// Manual fallback: read and parse the file directly
if (!process.env.OPENAI_API_KEY) {
  console.log('Attempting manual .env parsing...');
  try {
    const envFileToRead = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
    const envContent = fs.readFileSync(envFileToRead, 'utf8');
    const lines = envContent.split(/\r?\n/);
    
    for (const line of lines) {
      if (line.startsWith('OPENAI_API_KEY=')) {
        const value = line.substring('OPENAI_API_KEY='.length).replace(/^"(.+)"$/, '$1');
        process.env.OPENAI_API_KEY = value;
        console.log('✅ Manually set OPENAI_API_KEY from file');
        break;
      }
    }
  } catch (error) {
    console.error('Manual parsing failed:', error);
  }
}

if (!envLoaded && !fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) {
  console.warn('No .env or .env.local file found');
}

// Verify critical environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
} else {
  console.log('✅ OPENAI_API_KEY loaded successfully');
}

export default process.env;