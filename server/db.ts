import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  max: 3,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: true,
});

// Add error handling for the pool
pool.on("error", (err) => {
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
});

// Test connection on startup
pool
  .connect()
  .then((client) => {
    console.log("✅ Database connection successful");
    if (process.env.NODE_EXTRA_CA_CERTS) {
      console.log("✅ Using custom CA certificate for SSL");
    }
    client.release();
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);

    if (err.message.includes("self-signed certificate")) {
      console.error("\n🔧 Fix: Set the DATABASE_CA_CERT environment variable");
      console.error(
        "Get the CA certificate from DigitalOcean dashboard → Your Database → Connection Details → Download CA Certificate",
      );
    }
  });

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully...");
  pool.end(() => {
    console.log("Database pool has ended");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  pool.end(() => {
    console.log("Database pool has ended");
    process.exit(0);
  });
});

export const db = drizzle(pool, { schema });
