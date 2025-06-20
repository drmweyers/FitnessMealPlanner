import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const isReplitProduction = process.env.REPLIT_ENVIRONMENT === 'production';

// Log environment info for debugging
console.log(`Environment - NODE_ENV: ${process.env.NODE_ENV}, REPLIT_ENVIRONMENT: ${process.env.REPLIT_ENVIRONMENT}`);
console.log(`Database mode: ${isDevelopment ? 'Development' : 'Production'}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  max: 3, // Reduce max connections to prevent overwhelming the database
  min: 1, // Keep at least one connection alive
  idleTimeoutMillis: 10000, // Close idle connections faster
  connectionTimeoutMillis: 2000, // Shorter timeout
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

export const db = drizzle(pool);