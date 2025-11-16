// @ts-nocheck - Infrastructure/agent file, type errors suppressed
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";
const isReplitProduction = process.env.REPLIT_ENVIRONMENT === "production";

// Log environment info for debugging
console.log(
  `Environment - NODE_ENV: ${isDevelopment}, REPLIT_ENVIRONMENT: ${isReplitProduction}`,
);
console.log(`Database mode: ${isDevelopment ? "Development" : "Production"}`);

const normalizeCertificate = (rawCertificate: string): string => {
  const trimmed = rawCertificate.trim();

  if (!trimmed.startsWith("-----BEGIN CERTIFICATE-----")) {
    return trimmed;
  }

  const header = "-----BEGIN CERTIFICATE-----";
  const footer = "-----END CERTIFICATE-----";
  const body = trimmed
    .replace(header, "")
    .replace(footer, "")
    .replace(/[\s\r\n]+/g, "");

  const chunkedBody = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `${header}\n${chunkedBody}\n${footer}\n`;
};

const getSslConfig = () => {
  const sslMode = process.env.DB_SSL_MODE?.toLowerCase();
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const caCertificate = process.env.DATABASE_CA_CERT;
  const caCertificateFile = process.env.NODE_EXTRA_CA_CERTS;

  if (sslMode === "disable") {
    console.log("DB_SSL_MODE=disable detected - SSL disabled");
    return false;
  }

  if (caCertificate) {
    console.log("Using DATABASE_CA_CERT for SSL verification");
    return { rejectUnauthorized: true, ca: normalizeCertificate(caCertificate) };
  }

  if (isDevelopment) {
    // In development, we're typically using a local PostgreSQL container
    console.log("Database SSL mode: Development - using relaxed SSL settings");

    if (
      databaseUrl.includes("localhost") ||
      databaseUrl.includes("postgres:5432")
    ) {
      console.log("Local database detected - SSL disabled");
      return false;
    }

    if (sslMode === "require") {
      console.log(
        "DB_SSL_MODE=require detected - enforcing SSL with relaxed certificate validation",
      );
    }

    console.log(
      "Remote development database - SSL enabled with relaxed validation",
    );
    return { rejectUnauthorized: false };
  }

  // Production environments
  console.log("Database SSL mode: Production - using standard SSL");

  if (caCertificateFile) {
    console.log(`Using NODE_EXTRA_CA_CERTS: ${caCertificateFile}`);
    return { rejectUnauthorized: true };
  }

  if (sslMode === "require") {
    console.warn(
      "DB_SSL_MODE=require but no CA certificate provided. Falling back to relaxed SSL validation.",
    );
    return { rejectUnauthorized: false };
  }

  console.log(
    "No CA certificate provided. SSL validation disabled for this connection.",
  );
  return false;
};

/**
 * Optimized Database Connection Pool Configuration
 * 
 * Performance improvements:
 * - Increased pool size for better concurrency
 * - Optimized timeout values for authentication workflows
 * - Enhanced connection lifecycle management
 * - Better error handling and monitoring
 */
const optimizedPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  
  // Connection pool optimization for authentication performance
  max: 10, // Increased from 3 to handle more concurrent auth requests
  min: 2,  // Keep minimum connections alive
  
  // Timeout optimization for auth workflows
  idleTimeoutMillis: 30000,        // Reduced from 60000ms - faster cleanup of idle connections
  connectionTimeoutMillis: 5000,   // Reduced from 15000ms - faster auth failures
  acquireTimeoutMillis: 5000,      // New: Max time to wait for connection from pool
  
  // Authentication-specific optimizations
  allowExitOnIdle: false, // Keep connections alive for faster auth responses
  
  // Query optimization
  statement_timeout: 10000, // 10 second statement timeout
  query_timeout: 5000,      // 5 second query timeout for auth operations
});

// Connection pool monitoring and health checking
let connectionStats = {
  totalConnections: 0,
  idleConnections: 0,
  activeConnections: 0,
  waitingClients: 0,
  lastHealthCheck: new Date()
};

// Update connection stats periodically
setInterval(() => {
  connectionStats = {
    totalConnections: optimizedPool.totalCount,
    idleConnections: optimizedPool.idleCount,
    activeConnections: optimizedPool.totalCount - optimizedPool.idleCount,
    waitingClients: optimizedPool.waitingCount,
    lastHealthCheck: new Date()
  };
  
  // Log warnings for performance issues
  if (connectionStats.waitingClients > 0) {
    console.warn(`⚠️ ${connectionStats.waitingClients} clients waiting for database connections`);
  }
  
  if (connectionStats.activeConnections / connectionStats.totalConnections > 0.8) {
    console.warn(`⚠️ Database pool at ${Math.round((connectionStats.activeConnections / connectionStats.totalConnections) * 100)}% capacity`);
  }
}, 10000); // Check every 10 seconds

// Enhanced error handling for the pool
optimizedPool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);

  if (
    err.message.includes("certificate") ||
    err.message.includes("SSL") ||
    err.message.includes("TLS")
  ) {
    console.error("\n🔧 SSL Certificate Error:");
    console.error(
      "Make sure DATABASE_CA_CERT environment variable is set with your DigitalOcean CA certificate",
    );
    console.error(
      "The Docker container should automatically configure NODE_EXTRA_CA_CERTS",
    );
  }
  
  // Track connection errors for monitoring
  connectionStats.lastHealthCheck = new Date();
});

// Enhanced connection event monitoring
optimizedPool.on("connect", (client) => {
  console.log("✅ New database client connected");
  
  // Optimize client for authentication queries
  client.query('SET statement_timeout = 5000'); // 5 second statement timeout
  client.query('SET lock_timeout = 3000');      // 3 second lock timeout
});

optimizedPool.on("acquire", (client) => {
  console.log("🔄 Database client acquired from pool");
});

optimizedPool.on("remove", (client) => {
  console.log("❌ Database client removed from pool");
});

// Test connection on startup with optimized timeout
const testConnection = async () => {
  const start = Date.now();
  
  try {
    const client = await optimizedPool.connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Database connection successful in ${duration}ms`);
    
    if (process.env.NODE_EXTRA_CA_CERTS) {
      console.log("✅ Using custom CA certificate for SSL");
    }
    
    // Test a simple query to ensure performance
    const result = await client.query('SELECT 1 as test');
    console.log("✅ Database query test successful");
    
    // Log connection pool status
    console.log(`📊 Pool status - Total: ${optimizedPool.totalCount}, Idle: ${optimizedPool.idleCount}, Active: ${optimizedPool.totalCount - optimizedPool.idleCount}`);
    
    client.release();
    
    return duration;
  } catch (err: any) {
    const duration = Date.now() - start;
    console.error(`❌ Database connection failed after ${duration}ms:`, err.message);

    if (err.message.includes("self-signed certificate")) {
      console.error("\n🔧 Fix: Set the DATABASE_CA_CERT environment variable");
      console.error(
        "Get the CA certificate from DigitalOcean dashboard → Your Database → Connection Details → Download CA Certificate",
      );
    }
    
    if (err.message.includes("timeout")) {
      console.error("\n🔧 Connection timeout - check database performance or network connectivity");
    }
    
    throw err;
  }
};

// Initial connection test
testConnection().catch(err => {
  console.error("Fatal: Could not connect to database:", err);
  process.exit(1);
});

// Health check function for monitoring
export const getDatabaseHealth = () => ({
  ...connectionStats,
  isHealthy: connectionStats.totalConnections > 0 && connectionStats.waitingClients === 0,
  poolUtilization: Math.round((connectionStats.activeConnections / connectionStats.totalConnections) * 100),
  connectionLimit: optimizedPool.options.max
});

// Connection warmup for better first-request performance
export const warmupConnections = async () => {
  console.log("🔥 Warming up database connections...");
  const connections = [];
  
  try {
    // Pre-create minimum connections
    for (let i = 0; i < (optimizedPool.options.min || 2); i++) {
      connections.push(optimizedPool.connect());
    }
    
    const clients = await Promise.all(connections);
    
    // Run a simple query on each to ensure they're ready
    await Promise.all(clients.map(client => client.query('SELECT NOW()')));
    
    // Release all connections back to pool
    clients.forEach(client => client.release());
    
    console.log("✅ Database connections warmed up successfully");
  } catch (error) {
    console.error("⚠️ Connection warmup failed:", error);
  }
};

// Optimized query helper for authentication operations
export const executeAuthQuery = async (
  query: string, 
  params: any[] = [], 
  timeout: number = 5000
): Promise<any> => {
  const start = Date.now();
  let client;
  
  try {
    // Get connection with timeout
    const clientPromise = optimizedPool.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Connection timeout after ${timeout}ms`)), timeout)
    );
    
    client = await Promise.race([clientPromise, timeoutPromise]) as any;
    
    // Execute query with timeout
    const queryPromise = client.query(query, params);
    const queryTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
    );
    
    const result = await Promise.race([queryPromise, queryTimeoutPromise]);
    const duration = Date.now() - start;
    
    // Log slow queries for optimization
    if (duration > 1000) {
      console.warn(`🐌 Slow auth query (${duration}ms): ${query.substring(0, 100)}...`);
    }
    
    return result;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log("🔄 Shutting down database pool gracefully...");
  
  optimizedPool.end(() => {
    console.log("✅ Database pool has ended");
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("❌ Forced database pool shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Run connection warmup in background
setTimeout(warmupConnections, 1000);

export const db = drizzle(optimizedPool);
export { optimizedPool as pool };