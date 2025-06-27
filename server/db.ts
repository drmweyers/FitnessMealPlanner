import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const isReplitProduction = process.env.REPLIT_ENVIRONMENT === 'production';

// Log environment info for debugging
console.log(`Environment - NODE_ENV: ${isDevelopment}, REPLIT_ENVIRONMENT: ${isReplitProduction}`);
console.log(`Database mode: ${isDevelopment ? 'Development' : 'Production'}`);

const getSslConfig = () => {
  // Explicitly control SSL mode via an environment variable for clarity.
  const sslMode = process.env.DB_SSL_MODE;

  // For managed databases that require SSL but may use self-signed certs.
  // This allows the connection without failing on certificate validation.
  if (sslMode === 'require' || sslMode === 'allow') {
    console.log("Database SSL mode enabled with 'rejectUnauthorized: false'.");
    return { rejectUnauthorized: false };
  }

  // For local Docker databases or others that do not support SSL.
  console.log("Database SSL mode disabled.");
  return false;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  max: 3, // Reduce max connections to prevent overload
  min: 1, // Keep minimum connections alive
  idleTimeoutMillis: 60000, // Keep connections alive longer
  connectionTimeoutMillis: 15000, // Increased timeout for reliability
  allowExitOnIdle: true, // Allow process to exit when idle
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