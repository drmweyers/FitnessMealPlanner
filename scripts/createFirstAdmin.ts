import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";
import { db } from "../server/db";
import { writeFileSync } from "fs";

const ADMIN_EMAIL = "admin@fitmeal.pro";
const ADMIN_PASSWORD = "Admin123!@#";

async function setupSSLCertificate() {
  // Check if we need to set up the DigitalOcean CA certificate
  if (process.env.DATABASE_CA_CERT && !process.env.NODE_EXTRA_CA_CERTS) {
    console.log(
      "🔒 Setting up DigitalOcean CA certificate for manual script...",
    );
    try {
      const certPath = "/app/digitalocean-ca-cert.pem";
      writeFileSync(certPath, process.env.DATABASE_CA_CERT);
      process.env.NODE_EXTRA_CA_CERTS = certPath;
      console.log("✅ CA certificate configured");
    } catch (error) {
      console.log(
        "⚠️ Failed to set up CA certificate, trying without SSL verification",
      );
    }
  }
}

async function createFirstAdmin() {
  console.log("--- FitMeal Pro Admin Setup ---");

  // Set up SSL certificate if needed
  await setupSSLCertificate();

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
  } catch (error) {
    console.error("❌ Failed to create admin user:", error.message);

    // If it's an SSL error, provide helpful instructions
    if (
      error.message.includes("certificate") ||
      error.message.includes("SSL")
    ) {
      console.log("");
      console.log("🔧 SSL Certificate Issue Detected:");
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
    await db.$client.end();
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Process terminated, cleaning up...");
  try {
    await db.$client.end();
  } catch (e) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

createFirstAdmin()
  .catch((error) => {
    console.error("💥 Script failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    // Always try to close the database connection
    try {
      await db.$client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  });
