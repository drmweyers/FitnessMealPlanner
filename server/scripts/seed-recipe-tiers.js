import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { recipes } from "@shared/schema";
import { asc, isNull, or, eq } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/fitnessmealplanner";
const pool = new Pool({ connectionString });
const db = drizzle(pool);

/**
 * Story 2.14: Recipe Tier Assignment Seeding Script
 *
 * Assigns tier levels to existing recipes based on progressive access model:
 * - Starter tier: First 1,500 recipes (base tier - everyone gets these)
 * - Professional tier: Next 1,500 recipes (recipes 1,501-3,000)
 * - Enterprise tier: Remaining recipes (recipes 3,001-6,000)
 *
 * Total allocation: 6,000 recipes across 3 tiers
 *
 * Note: Users access recipes progressively:
 * - Starter users: 1,500 recipes (starter only)
 * - Professional users: 3,000 recipes (starter + professional)
 * - Enterprise users: 6,000 recipes (starter + professional + enterprise)
 */

async function seedRecipeTiers() {
  console.log("🌱 Starting recipe tier assignment...\n");

  try {
    // Get all recipes that don't have a tier assigned (or are null)
    // Order by creation date to assign tiers consistently
    const allRecipes = await db
      .select()
      .from(recipes)
      .where(
        or(
          isNull(recipes.tierLevel),
          eq(recipes.tierLevel, "starter"), // Re-assign all recipes to ensure correct distribution
        ),
      )
      .orderBy(asc(recipes.creationTimestamp));

    const totalRecipes = allRecipes.length;
    console.log(`📊 Found ${totalRecipes} recipes to assign tiers\n`);

    if (totalRecipes === 0) {
      console.log("✅ No recipes need tier assignment");
      return;
    }

    // Define tier allocation thresholds
    const STARTER_LIMIT = 1500;
    const PROFESSIONAL_LIMIT = 3000;
    const ENTERPRISE_LIMIT = 6000;

    let starterCount = 0;
    let professionalCount = 0;
    let enterpriseCount = 0;

    // Assign tiers based on position
    for (let i = 0; i < allRecipes.length; i++) {
      const recipe = allRecipes[i];
      const position = i + 1;

      let tierLevel;
      if (position <= STARTER_LIMIT) {
        tierLevel = "starter";
        starterCount++;
      } else if (position <= PROFESSIONAL_LIMIT) {
        tierLevel = "professional";
        professionalCount++;
      } else if (position <= ENTERPRISE_LIMIT) {
        tierLevel = "enterprise";
        enterpriseCount++;
      } else {
        // If more than 6,000 recipes, assign remaining to enterprise
        tierLevel = "enterprise";
        enterpriseCount++;
      }

      // Update recipe with tier level
      await db
        .update(recipes)
        .set({ tierLevel })
        .where(eq(recipes.id, recipe.id));

      // Progress indicator every 100 recipes
      if (position % 100 === 0) {
        console.log(`   Processed ${position}/${totalRecipes} recipes...`);
      }
    }

    console.log("\n✅ Recipe tier assignment complete!\n");
    console.log("📊 Tier Distribution:");
    console.log("===================");
    console.log(
      `Starter tier:       ${starterCount.toLocaleString()} recipes (first 1,500)`,
    );
    console.log(
      `Professional tier:  ${professionalCount.toLocaleString()} recipes (1,501-3,000)`,
    );
    console.log(
      `Enterprise tier:    ${enterpriseCount.toLocaleString()} recipes (2,501+)`,
    );
    console.log(
      `Total assigned:     ${(starterCount + professionalCount + enterpriseCount).toLocaleString()} recipes`,
    );

    console.log("\n📈 User Access Summary:");
    console.log("====================");
    console.log(`Starter users:      ${starterCount.toLocaleString()} recipes`);
    console.log(
      `Professional users: ${(starterCount + professionalCount).toLocaleString()} recipes`,
    );
    console.log(
      `Enterprise users:   ${(starterCount + professionalCount + enterpriseCount).toLocaleString()} recipes`,
    );

    // Verify the assignments
    console.log("\n🔍 Verifying tier assignments...");
    const starterRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.tierLevel, "starter"));
    const professionalRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.tierLevel, "professional"));
    const enterpriseRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.tierLevel, "enterprise"));

    console.log(
      `✅ Verified: ${starterRecipes.length} starter, ${professionalRecipes.length} professional, ${enterpriseRecipes.length} enterprise`,
    );
  } catch (error) {
    console.error("❌ Error assigning recipe tiers:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedRecipeTiers().catch(console.error);
