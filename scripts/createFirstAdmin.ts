import { config } from "dotenv";
import { existsSync } from "fs";

// Load environment variables from .env file
config();

// Check if the certificate file already exists (created by Docker startup)
const certPath = "/app/digitalocean-ca-cert.pem";

if (existsSync(certPath)) {
  console.log("✅ Found existing CA certificate at:", certPath);
  process.env.NODE_EXTRA_CA_CERTS = certPath;
} else if (process.env.DATABASE_CA_CERT && !process.env.NODE_EXTRA_CA_CERTS) {
  // Only create the file if it doesn't exist
  console.log("🔒 Setting up DigitalOcean CA certificate...");
  try {
    const { writeFileSync } = await import("fs");
    const certContent = process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n");
    writeFileSync(certPath, certContent);
    process.env.NODE_EXTRA_CA_CERTS = certPath;
    console.log("✅ CA certificate created at:", certPath);
  } catch (error) {
    console.error("❌ Failed to create CA certificate:", error);
    process.exit(1);
  }
}

/**
 * Official Test Admin Credentials
 * NEVER CHANGE - Must match test-accounts.ts
 */
const ADMIN_EMAIL = "admin@fitmeal.pro";
const ADMIN_PASSWORD = "AdminPass123";

async function createFirstAdmin() {
  console.log("--- FitMeal Pro Admin Setup ---");
  console.log("Database SSL status:");
  console.log(
    "  NODE_EXTRA_CA_CERTS:",
    process.env.NODE_EXTRA_CA_CERTS || "not set",
  );
  console.log(
    "  DATABASE_CA_CERT:",
    process.env.DATABASE_CA_CERT ? "present" : "not set",
  );

  // Dynamic imports AFTER SSL certificate is configured
  console.log("📦 Loading database modules with SSL certificate...");
  const { storage } = await import("../server/storage");
  const { hashPassword } = await import("../server/auth");
  const { db } = await import("../server/db");

  console.log("Checking for existing admin...");

  try {
    // Check if any admin exists
    const existingAdmin = await storage.getUserByEmail(ADMIN_EMAIL);
    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      console.log("📧 Email:", ADMIN_EMAIL);
      console.log("🔑 Password:", ADMIN_PASSWORD);
      console.log(
        "💡 Use the forgot password feature if you need to reset the password",
      );

      // Clean up database connection
      try {
        await db.$client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      return;
    }

    console.log("Creating new admin user...");

    // Hash the password
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);

    // Create the admin user
    const admin = await storage.createUser({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    console.log("🎉 First admin user created successfully!");
    console.log("📧 Email:", ADMIN_EMAIL);
    console.log("🔑 Password:", ADMIN_PASSWORD);
    console.log("");
    console.log(
      "⚠️  IMPORTANT: Please change this password immediately after first login!",
    );
    console.log("");
    console.log(
      "🌐 You can now access the admin panel at your application URL",
    );

    // Clean up database connection
    try {
      await db.$client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error) {
    console.error(
      "❌ Failed to create admin user:",
      error instanceof Error ? error.message : error,
    );

    // If it's an SSL error, provide helpful instructions
    if (
      error instanceof Error &&
      (error.message.includes("certificate") ||
        error.message.includes("SSL") ||
        error.message.includes("self-signed"))
    ) {
      console.log("");
      console.log("🔧 SSL Certificate Issue Detected:");
      console.log("Current SSL configuration:");
      console.log(
        "  NODE_EXTRA_CA_CERTS:",
        process.env.NODE_EXTRA_CA_CERTS || "not set",
      );
      console.log(
        "  DATABASE_CA_CERT:",
        process.env.DATABASE_CA_CERT ? "present" : "not set",
      );
      console.log("");
      console.log(
        "Make sure the DATABASE_CA_CERT environment variable is properly set.",
      );
    }

    throw error;
  }
}

// Graceful cleanup
process.on("SIGINT", async () => {
  console.log("\n🛑 Process interrupted, cleaning up...");
  try {
    const { db } = await import("../server/db");
    await db.$client.end();
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Process terminated, cleaning up...");
  try {
    const { db } = await import("../server/db");
    await db.$client.end();
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

createFirstAdmin()
  .catch((error) => {
    console.error(
      "💥 Script failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  })
  .finally(async () => {
    // Always try to close the database connection
    try {
      const { db } = await import("../server/db");
      await db.$client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  });
