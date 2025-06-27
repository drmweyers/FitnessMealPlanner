import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

const getSslConfigForDrizzle = () => {
  if (isDevelopment) {
    console.log("Drizzle Kit: Development mode - checking for local database");

    const databaseUrl = process.env.DATABASE_URL!;
    if (
      databaseUrl.includes("localhost") ||
      databaseUrl.includes("postgres:5432")
    ) {
      console.log("Drizzle Kit: Local database detected - SSL disabled");
      return undefined;
    }

    console.log("Drizzle Kit: Remote development database - using relaxed SSL");
    return { rejectUnauthorized: false };
  } else {
    console.log("Drizzle Kit: Production mode - using standard SSL");

    if (process.env.NODE_EXTRA_CA_CERTS) {
      console.log(
        `Drizzle Kit: Using NODE_EXTRA_CA_CERTS: ${process.env.NODE_EXTRA_CA_CERTS}`,
      );
      // Node.js will automatically trust the CA certificate file
      return { rejectUnauthorized: true };
    } else {
      console.log(
        "Drizzle Kit: No NODE_EXTRA_CA_CERTS found, using permissive SSL",
      );
      return { rejectUnauthorized: false };
    }
  }
};

const sslConfig = getSslConfigForDrizzle();

const config = {
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql" as const,
  dbCredentials: {
    url: process.env.DATABASE_URL,
  } as any,
};

if (sslConfig) {
  config.dbCredentials.ssl = sslConfig;
}

export default defineConfig(config);
