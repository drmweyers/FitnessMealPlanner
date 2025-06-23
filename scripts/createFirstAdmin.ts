import { storage } from '../server/storage';
import { hashPassword } from '../server/auth';
import { db } from '../server/db';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('--- Environment Variables ---');
console.log('DATABASE_URL (first 20 chars):', process.env.DATABASE_URL?.substring(0, 20) + '...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('---------------------------');

const ADMIN_EMAIL = 'admin@fitmeal.pro';
const ADMIN_PASSWORD = 'Admin123!@#'; // Strong password meeting our requirements

async function createFirstAdmin() {
  console.log('Checking for existing admin...');
  
  try {
    // Check if any admin exists
    const existingAdmin = await storage.getUserByEmail(ADMIN_EMAIL);
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email:', ADMIN_EMAIL);
      console.log('Password:', ADMIN_PASSWORD);
      console.log('Please use the forgot password feature if you need to reset the password');
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    
    // Create the admin user
    const admin = await storage.createUser({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('First admin user created successfully!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
    console.log('\nPlease change this password immediately after first login!');
  } catch (error) {
    console.error('Failed to create admin user:', error);
  } finally {
    // Close the database pool
    await db.$client.end();
  }
}

createFirstAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
}); 