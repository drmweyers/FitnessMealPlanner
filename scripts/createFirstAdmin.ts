import { writeFileSync } from "fs";

// Set up SSL certificate synchronously BEFORE any database imports
try {
  if (process.env.DATABASE_CA_CERT && !process.env.NODE_EXTRA_CA_CERTS) {
    console.log(
      "🔒 Setting up DigitalOcean CA certificate before any database imports...",
    );
    const certPath = "/app/digitalocean-ca-cert.pem";
    writeFileSync(certPath, process.env.DATABASE_CA_CERT);
    process.env.NODE_EXTRA_CA_CERTS = certPath;
    console.log("✅ CA certificate configured:", certPath);
  }
} catch (error) {
  console.error("❌ Failed to set up CA certificate:", error);
  process.exit(1);
}

const ADMIN_EMAIL = "admin@fitmeal.pro";
const ADMIN_PASSWORD = "Admin123!@#";

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
      console.log("You can also try the direct database method below.");
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
