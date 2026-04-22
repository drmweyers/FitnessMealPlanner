/**
 * Business Vault Catalog
 *
 * Typed catalog of tier-gated digital products (PDFs) available to trainers.
 * Source of truth for both server (download gating) and client (grid rendering).
 *
 * Keep in sync with docs/business-vault/config/product-catalog.json — the
 * pipeline scripts at scripts/vault/* consume the JSON directly; this TS
 * file mirrors it for runtime use.
 */

export type VaultTier = "starter" | "professional" | "enterprise";

export type VaultItemType =
  | "playbook"
  | "scripts"
  | "protocol"
  | "email-pack"
  | "sop"
  | "spreadsheet";

export interface VaultItem {
  slug: string;
  type: VaultItemType;
  title: string;
  subtitle: string;
  tiers: VaultTier[];
}

export const VAULT_CATALOG_VERSION = "v1";

export const VAULT_ITEMS: VaultItem[] = [
  {
    slug: "nutrition-revenue-accelerator",
    type: "playbook",
    title: "The Nutrition Revenue Accelerator",
    subtitle:
      "Your 14-Day Action Plan to Add Meal Planning Revenue and Land Your First 3 Nutrition Clients",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "nutrition-sales-scripts",
    type: "scripts",
    title: "Nutrition Sales & Objection Scripts",
    subtitle: "The 8 Conversations That Close Nutrition Coaching Clients",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "adherence-protocol",
    type: "protocol",
    title: "90-Day Nutrition Adherence Protocol",
    subtitle:
      "A Week-by-Week System to Keep Clients Following Their Meal Plans Past the Drop-Off Window",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "nutrition-client-acquisition",
    type: "playbook",
    title: "Nutrition Client Acquisition Playbook",
    subtitle:
      "How to Upsell Training Clients on Meal Plans and Attract Nutrition-Only Clients",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "nutrition-onboarding-pack",
    type: "email-pack",
    title: "Nutrition Client Onboarding Pack",
    subtitle:
      "Dietary Questionnaires, Food Preference Surveys, Allergy Forms, and Welcome Sequences",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "meal-plan-pricing-guide",
    type: "playbook",
    title: "Meal Plan Pricing & Packaging Guide",
    subtitle:
      "How to Price Nutrition Coaching, Bundle with Training, and Create Recurring Revenue",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "dietary-consultation-scripts",
    type: "scripts",
    title: "Dietary Consultation Scripts",
    subtitle:
      "How to Discuss Nutrition Without Crossing Scope — From Allergies to Emotional Eating",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "nutrition-retention-kit",
    type: "email-pack",
    title: "Nutrition Retention & Re-engagement Kit",
    subtitle:
      "Win-Back Scripts and Re-engagement Sequences for Clients Who Stopped Following Plans",
    tiers: ["starter", "professional", "enterprise"],
  },
  {
    slug: "meal-plan-launch-templates",
    type: "email-pack",
    title: "Meal Plan Launch Templates",
    subtitle:
      "Launch Nutrition Challenges, Seasonal Meal Plans, and Group Nutrition Programs",
    tiers: ["professional", "enterprise"],
  },
  {
    slug: "nutrition-business-sops",
    type: "sop",
    title: "Nutrition Business SOPs",
    subtitle:
      "20 Standard Operating Procedures for Team-Based Nutrition Coaching Operations",
    tiers: ["enterprise"],
  },
  {
    slug: "nutrition-financial-pack",
    type: "spreadsheet",
    title: "Nutrition Business Financial Pack",
    subtitle:
      "P&L Templates, Revenue Projections, and Pricing Calculators for Nutrition Services",
    tiers: ["enterprise"],
  },
];

/**
 * Hierarchical tier ordering — a Professional user has access to all
 * items flagged for Starter OR Professional, an Enterprise user to all three.
 * Each tier gets the richest PDF variant for that slug they're entitled to.
 */
export const TIER_ORDER: Record<VaultTier, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};

export function itemsForTier(tier: VaultTier): VaultItem[] {
  const userLevel = TIER_ORDER[tier];
  return VAULT_ITEMS.filter((item) => {
    const minLevel = Math.min(...item.tiers.map((t) => TIER_ORDER[t]));
    return userLevel >= minLevel;
  });
}

export function resolveItem(slug: string): VaultItem | undefined {
  return VAULT_ITEMS.find((item) => item.slug === slug);
}

/**
 * Returns the highest tier PDF the user is entitled to for this item, or
 * null if they have no access. E.g. a Professional user requesting
 * "nutrition-revenue-accelerator" resolves to the professional variant.
 */
export function resolvePdfTier(
  item: VaultItem,
  userTier: VaultTier,
): VaultTier | null {
  const userLevel = TIER_ORDER[userTier];
  const eligibleTiers = item.tiers
    .filter((t) => TIER_ORDER[t] <= userLevel)
    .sort((a, b) => TIER_ORDER[b] - TIER_ORDER[a]);
  return eligibleTiers[0] ?? null;
}
