/**
 * Role Seeding Script for FitMeal Pro
 * 
 * This script assigns roles to users in the database for testing the
 * role-based authorization system. Run this after users have signed in
 * at least once to ensure they exist in the database.
 */

const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const { users } = require("../shared/schema.ts");
const { eq } = require("drizzle-orm");

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seedRoles() {
  try {
    console.log("🚀 Starting role seeding...");

    // Get all existing users
    const allUsers = await db.select().from(users);
    console.log(`📊 Found ${allUsers.length} users in database`);

    if (allUsers.length === 0) {
      console.log("❌ No users found. Please sign in first to create user records.");
      return;
    }

    // Assign roles based on email patterns or manually specify
    const roleAssignments = [
      // Admin role - assign to first user or specific email
      {
        email: allUsers[0].email,
        role: "admin",
        reason: "First user gets admin role"
      },
      // You can add specific email assignments here:
      // {
      //   email: "trainer@example.com",
      //   role: "trainer",
      //   reason: "Designated trainer account"
      // },
    ];

    // Auto-assign roles to remaining users
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      
      // Skip if already assigned
      if (roleAssignments.find(assignment => assignment.email === user.email)) {
        continue;
      }

      let role;
      let reason;
      
      if (i === 0) {
        role = "admin";
        reason = "First user gets admin role";
      } else if (i % 3 === 1) {
        role = "trainer";
        reason = "Auto-assigned trainer role";
      } else {
        role = "client";
        reason = "Auto-assigned client role";
      }

      roleAssignments.push({
        email: user.email,
        role,
        reason
      });
    }

    console.log("\n📋 Role assignments:");
    console.log("=".repeat(60));

    // Apply role assignments
    for (const assignment of roleAssignments) {
      try {
        await db
          .update(users)
          .set({ role: assignment.role })
          .where(eq(users.email, assignment.email));

        console.log(`✅ ${assignment.email} → ${assignment.role.toUpperCase()} (${assignment.reason})`);
      } catch (error) {
        console.error(`❌ Failed to assign role to ${assignment.email}:`, error.message);
      }
    }

    // Verify assignments
    console.log("\n🔍 Verifying role assignments:");
    console.log("=".repeat(60));
    
    const updatedUsers = await db.select().from(users);
    const roleStats = updatedUsers.reduce((stats, user) => {
      stats[user.role] = (stats[user.role] || 0) + 1;
      return stats;
    }, {});

    console.log(`📊 Role distribution:`);
    console.log(`   Admin: ${roleStats.admin || 0}`);
    console.log(`   Trainer: ${roleStats.trainer || 0}`);
    console.log(`   Client: ${roleStats.client || 0}`);

    console.log("\n✨ Role seeding completed successfully!");
    console.log("\n💡 You can now test the role-based authorization system:");
    console.log("   - Admin users can access /admin and manage recipes");
    console.log("   - Trainer users can access /trainer and create meal plans");
    console.log("   - Client users can access /my-meal-plan and view their plans");

  } catch (error) {
    console.error("❌ Error seeding roles:", error);
  } finally {
    await pool.end();
  }
}

// Run the seeding script
seedRoles();