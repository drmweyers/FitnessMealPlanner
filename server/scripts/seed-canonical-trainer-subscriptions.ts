/**
 * Seed canonical trainer test accounts with active subscriptions.
 *
 * Ensures every trainer listed in OFFICIAL_TEST_CREDENTIALS.md has an
 * active trainer_subscriptions row at the expected tier. Idempotent:
 * deletes any existing subscription for the account first, then inserts
 * a fresh one. Safe to run repeatedly.
 *
 * Usage:
 *   Local:      docker exec fitnessmealplanner-dev npx tsx server/scripts/seed-canonical-trainer-subscriptions.ts
 *   Production: DATABASE_URL=<prod_url> npx tsx server/scripts/seed-canonical-trainer-subscriptions.ts
 *
 * Why this exists: without an active subscription, trainer.test@evofitmeals.com
 * (the canonical test trainer referenced in CLAUDE.md and all QA docs)
 * silently defaults to Starter tier in entitlements. QA simulations that
 * assume Pro access then fail in confusing ways. This script fixes that.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, trainerSubscriptions, subscriptionItems } from "@shared/schema";

type TierLevel = "starter" | "professional" | "enterprise";

interface CanonicalTrainer {
  email: string;
  tier: TierLevel;
}

// Canonical test trainers. The primary one (`trainer.test@`) is the account
// referenced by CLAUDE.md, Zara, and the simulation suite — it should always
// be on Professional so QA flows get meaningful coverage.
const TRAINERS: CanonicalTrainer[] = [
  { email: "trainer.test@evofitmeals.com", tier: "professional" },
  { email: "trainer.starter@test.com", tier: "starter" },
  { email: "trainer.professional@test.com", tier: "professional" },
  { email: "trainer.enterprise@test.com", tier: "enterprise" },
];

async function upsertSubscription(trainerId: string, tier: TierLevel) {
  // Remove any existing subscription for a clean slate
  await db
    .delete(trainerSubscriptions)
    .where(eq(trainerSubscriptions.trainerId, trainerId));

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

  const [sub] = await db
    .insert(trainerSubscriptions)
    .values({
      trainerId,
      stripeCustomerId: `cus_canonical_${tier}_${trainerId.slice(0, 8)}`,
      stripeSubscriptionId: `sub_canonical_${tier}_${trainerId.slice(0, 8)}`,
      tier,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(subscriptionItems).values({
    subscriptionId: sub.id,
    kind: "tier",
    stripePriceId: `price_${tier}_canonical`,
    stripeSubscriptionItemId: `si_canonical_${tier}_${sub.id.slice(0, 8)}`,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return sub.id;
}

async function main() {
  console.log("\n🌱 Seeding canonical trainer subscriptions\n");
  console.log(
    `   DATABASE_URL: ${(process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":***@")}\n`,
  );

  const results: Array<{ email: string; tier: TierLevel; status: string }> = [];

  for (const t of TRAINERS) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, t.email))
      .limit(1);

    if (!user) {
      console.warn(`   ⚠  SKIP  ${t.email} — user not found`);
      results.push({ email: t.email, tier: t.tier, status: "user not found" });
      continue;
    }

    if (user.role !== "trainer") {
      console.warn(
        `   ⚠  SKIP  ${t.email} — role is '${user.role}', expected 'trainer'`,
      );
      results.push({
        email: t.email,
        tier: t.tier,
        status: `role=${user.role}`,
      });
      continue;
    }

    await upsertSubscription(user.id, t.tier);
    console.log(`   ✓ OK    ${t.email} → ${t.tier}`);
    results.push({ email: t.email, tier: t.tier, status: "seeded" });
  }

  console.log("\n📋 Summary:");
  console.table(results);

  console.log("\n✅ Done\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
