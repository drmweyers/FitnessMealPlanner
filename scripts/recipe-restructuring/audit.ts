/**
 * Recipe Restructuring Audit Script
 *
 * Queries production (or local) and outputs a table comparing actual recipe
 * counts per block vs the scaled 6,000-recipe targets.
 *
 * Usage:
 *   npx tsx scripts/recipe-restructuring/audit.ts --target production
 *   npx tsx scripts/recipe-restructuring/audit.ts --target local
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractToken } from '../batch-utils/auth-helpers.js';
import { fetchRecipeCount } from '../batch-utils/verification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const TARGETS: Record<string, string> = {
  production: 'https://evofitmeals.com',
  local: 'http://localhost:4000',
};

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123',
};

// ============================================================
// BLOCK SPEC — Scaled 6,000-Recipe Targets
// ============================================================

interface BlockSpec {
  id: string;
  name: string;
  tier: 'starter' | 'professional' | 'enterprise';
  target: number;
  /** If set, we can query recipe-count with this mainIngredient */
  mainIngredient?: string;
  /** If set, we can query recipe-count with this filter */
  fitnessGoal?: string;
  /** If set, we can query recipe-count with this filter */
  dietaryRestriction?: string;
  /** Notes about why per-block count may not be available */
  note?: string;
}

const BLOCKS: BlockSpec[] = [
  // ── STARTER TIER (1,500 total) ──────────────────────────────
  { id: 'A1', name: 'Chicken Weight Loss',     tier: 'starter', target: 150, mainIngredient: 'Chicken', fitnessGoal: 'Weight Loss' },
  { id: 'A2', name: 'Chicken Muscle Building',  tier: 'starter', target: 150, mainIngredient: 'Chicken', fitnessGoal: 'Muscle Building' },
  { id: 'A3', name: 'Chicken Breakfast',         tier: 'starter', target: 150, mainIngredient: 'Chicken', note: 'mealType=Breakfast (not filterable via API)' },
  { id: 'A4', name: 'Chicken Snacks',            tier: 'starter', target: 75,  mainIngredient: 'Chicken', note: 'mealType=Snack (not filterable via API)' },
  { id: 'B1', name: 'Salmon',                    tier: 'starter', target: 150, mainIngredient: 'Salmon' },
  { id: 'B2', name: 'White Fish',                tier: 'starter', target: 150, mainIngredient: 'Tilapia' },
  { id: 'B3', name: 'Shrimp',                    tier: 'starter', target: 150, mainIngredient: 'Shrimp' },
  { id: 'C1', name: 'Legumes',                   tier: 'starter', target: 150, mainIngredient: 'Lentils' },
  { id: 'C2', name: 'Eggs',                      tier: 'starter', target: 150, mainIngredient: 'Eggs' },
  { id: 'C3', name: 'Tofu/Tempeh',               tier: 'starter', target: 75,  mainIngredient: 'Tofu' },
  { id: 'D1', name: 'Ground Turkey',             tier: 'starter', target: 75,  mainIngredient: 'Turkey' },
  { id: 'D2', name: 'Lean Beef',                 tier: 'starter', target: 75,  mainIngredient: 'Beef' },

  // ── PROFESSIONAL TIER (1,500 total) ─────────────────────────
  { id: 'E1', name: 'Keto',                      tier: 'professional', target: 100, note: 'dietaryRestriction filter — not available via API' },
  { id: 'E2', name: 'Paleo',                     tier: 'professional', target: 100, note: 'dietaryRestriction filter — not available via API' },
  { id: 'E3', name: 'Gluten-Free',               tier: 'professional', target: 100, note: 'dietaryRestriction filter — not available via API' },
  { id: 'E4', name: 'Dairy-Free',                tier: 'professional', target: 100, note: 'dietaryRestriction filter — not available via API' },
  { id: 'F1', name: 'Pork',                      tier: 'professional', target: 100, mainIngredient: 'Pork' },
  { id: 'F2', name: 'Duck',                      tier: 'professional', target: 50,  mainIngredient: 'Duck' },
  { id: 'F3', name: 'Lamb',                      tier: 'professional', target: 50,  mainIngredient: 'Lamb' },
  { id: 'F4', name: 'Mixed Seafood',             tier: 'professional', target: 100, mainIngredient: 'Seafood' },
  { id: 'F5', name: 'Bison',                     tier: 'professional', target: 100, mainIngredient: 'Bison' },
  { id: 'G1', name: 'Vegan Tempeh',              tier: 'professional', target: 100, mainIngredient: 'Tempeh' },
  { id: 'G2', name: 'Legume Variety',            tier: 'professional', target: 100, note: 'Vegan + ingredient variety — not filterable via API' },
  { id: 'G3', name: 'Whole Food Vegan',          tier: 'professional', target: 100, note: 'Vegan tag — not filterable via API' },
  { id: 'H1', name: 'Meal Prep',                 tier: 'professional', target: 100, note: 'No specific API filter' },
  { id: 'H2', name: 'Batch Cook',                tier: 'professional', target: 100, note: 'No specific API filter' },
  { id: 'I1', name: 'Endurance',                 tier: 'professional', target: 100, note: 'fitnessGoal=Endurance — not filterable via recipe-count API' },
  { id: 'I2', name: 'Bodybuilding',              tier: 'professional', target: 100, note: 'fitnessGoal=Muscle Building (pro tier) — not filterable via API' },

  // ── ENTERPRISE TIER (3,000 total) ───────────────────────────
  { id: 'J1', name: 'Fine Dining',               tier: 'enterprise', target: 200, note: 'No specific API filter' },
  { id: 'J2', name: 'International Gourmet',     tier: 'enterprise', target: 200, note: 'No specific API filter' },
  { id: 'J3', name: "Chef's Specials",           tier: 'enterprise', target: 200, note: 'No specific API filter' },
  { id: 'K1', name: 'Mediterranean',             tier: 'enterprise', target: 160, note: 'Cuisine filter — not available via API' },
  { id: 'K2', name: 'Asian',                     tier: 'enterprise', target: 160, note: 'Cuisine filter — not available via API' },
  { id: 'K3', name: 'Mexican/Latin',             tier: 'enterprise', target: 160, note: 'Cuisine filter — not available via API' },
  { id: 'K4', name: 'Indian',                    tier: 'enterprise', target: 160, note: 'Cuisine filter — not available via API' },
  { id: 'K5', name: 'Middle Eastern',            tier: 'enterprise', target: 160, note: 'Cuisine filter — not available via API' },
  { id: 'L1', name: 'AIP',                       tier: 'enterprise', target: 150, note: 'Diet filter — not available via API' },
  { id: 'L2', name: 'Low-FODMAP',                tier: 'enterprise', target: 150, note: 'Diet filter — not available via API' },
  { id: 'L3', name: 'Carnivore',                 tier: 'enterprise', target: 150, note: 'Diet filter — not available via API' },
  { id: 'L4', name: 'Whole30',                   tier: 'enterprise', target: 150, note: 'Diet filter — not available via API' },
  { id: 'M1', name: 'Wagyu/Premium Beef',        tier: 'enterprise', target: 100, mainIngredient: 'Beef', note: 'Enterprise Beef — shares ingredient with D2' },
  { id: 'M2', name: 'Lobster/Crab',              tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'M3', name: 'Exotic Fish',               tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'M4', name: 'Heritage Poultry',          tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'N1', name: 'Post-Surgery',              tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'N2', name: 'Pregnancy/Postpartum',      tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'N3', name: 'Senior Nutrition',           tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'N4', name: 'Teen Athletes',             tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'O1', name: 'Protein Desserts',          tier: 'enterprise', target: 100, note: 'No specific API filter' },
  { id: 'O2', name: 'Low-Cal Treats',            tier: 'enterprise', target: 100, note: 'No specific API filter' },
];

// ============================================================
// HELPERS
// ============================================================

async function login(baseUrl: string): Promise<string> {
  const resp = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });

  if (!resp.ok) {
    throw new Error(`Login failed: ${resp.status} ${resp.statusText}`);
  }

  const body = await resp.json();
  return extractToken(body);
}

function pad(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

// ============================================================
// MAIN AUDIT
// ============================================================

async function runAudit(target: string) {
  const baseUrl = TARGETS[target];
  if (!baseUrl) {
    console.error(`Unknown target: ${target}. Use "production" or "local".`);
    process.exit(1);
  }

  console.log(`\n🔍 Recipe Audit — ${target} (${baseUrl})`);
  console.log(`   ${new Date().toISOString()}\n`);

  // Authenticate
  console.log('Authenticating...');
  const token = await login(baseUrl);
  console.log('Authenticated.\n');

  // Fetch tier totals
  const tierTotals: Record<string, number> = {};
  for (const tier of ['starter', 'professional', 'enterprise'] as const) {
    tierTotals[tier] = await fetchRecipeCount(baseUrl, token, { tierLevel: tier });
  }

  // Fetch per-block counts where possible (mainIngredient available)
  const blockCounts: Record<string, number | null> = {};
  for (const block of BLOCKS) {
    if (block.mainIngredient) {
      try {
        blockCounts[block.id] = await fetchRecipeCount(baseUrl, token, {
          tierLevel: block.tier,
          mainIngredient: block.mainIngredient,
        });
      } catch (err) {
        blockCounts[block.id] = null;
      }
    } else {
      blockCounts[block.id] = null; // not queryable per-block
    }
  }

  // Also fetch the grand total (no filters)
  const grandTotal = await fetchRecipeCount(baseUrl, token, {});

  // ── Build output ────────────────────────────────────────────
  const lines: string[] = [];
  const divider = '─'.repeat(92);

  lines.push('');
  lines.push(`RECIPE AUDIT BASELINE — ${target.toUpperCase()}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Endpoint:  ${baseUrl}`);
  lines.push('');

  // Grand total
  lines.push(`GRAND TOTAL: ${grandTotal} recipes (target: 6,000)`);
  lines.push('');

  // Tier summary
  const tierTargets: Record<string, number> = { starter: 1500, professional: 1500, enterprise: 3000 };
  lines.push('TIER SUMMARY');
  lines.push(divider);
  lines.push(`${pad('Tier', 16)} ${padLeft('Target', 8)} ${padLeft('Actual', 8)} ${padLeft('Delta', 8)}`);
  lines.push(divider);
  for (const tier of ['starter', 'professional', 'enterprise'] as const) {
    const actual = tierTotals[tier];
    const target = tierTargets[tier];
    const delta = actual - target;
    const sign = delta >= 0 ? '+' : '';
    lines.push(`${pad(tier, 16)} ${padLeft(String(target), 8)} ${padLeft(String(actual), 8)} ${padLeft(sign + delta, 8)}`);
  }
  lines.push(divider);
  lines.push('');

  // Per-block detail table
  lines.push('BLOCK DETAIL');
  lines.push(divider);
  lines.push(`${pad('Block', 6)} ${pad('Name', 26)} ${pad('Tier', 14)} ${padLeft('Target', 8)} ${padLeft('Actual', 8)} ${padLeft('Delta', 8)}  Notes`);
  lines.push(divider);

  let currentTier = '';
  for (const block of BLOCKS) {
    // Section header when tier changes
    if (block.tier !== currentTier) {
      if (currentTier !== '') lines.push('');
      currentTier = block.tier;
      lines.push(`── ${currentTier.toUpperCase()} (target: ${tierTargets[currentTier]}, actual: ${tierTotals[currentTier]}) ──`);
    }

    const actual = blockCounts[block.id];
    let actualStr: string;
    let deltaStr: string;
    let notes = block.note || '';

    if (actual !== null) {
      actualStr = String(actual);
      const delta = actual - block.target;
      const sign = delta >= 0 ? '+' : '';
      deltaStr = sign + delta;
    } else {
      actualStr = '—';
      deltaStr = '—';
      if (!notes) notes = 'Per-block count not available via API';
    }

    lines.push(
      `${pad(block.id, 6)} ${pad(block.name, 26)} ${pad(block.tier, 14)} ${padLeft(String(block.target), 8)} ${padLeft(actualStr, 8)} ${padLeft(deltaStr, 8)}  ${notes}`
    );
  }
  lines.push(divider);
  lines.push('');

  // Queryable blocks summary
  const queryableBlocks = BLOCKS.filter(b => blockCounts[b.id] !== null);
  const nonQueryableBlocks = BLOCKS.filter(b => blockCounts[b.id] === null);
  const queryableTotal = queryableBlocks.reduce((sum, b) => sum + (blockCounts[b.id] ?? 0), 0);
  const queryableTargetTotal = queryableBlocks.reduce((sum, b) => sum + b.target, 0);

  lines.push('COVERAGE SUMMARY');
  lines.push(divider);
  lines.push(`Queryable blocks:     ${queryableBlocks.length} / ${BLOCKS.length} (by mainIngredient filter)`);
  lines.push(`Non-queryable blocks: ${nonQueryableBlocks.length} / ${BLOCKS.length} (tier-level totals only)`);
  lines.push(`Queryable total:      ${queryableTotal} actual / ${queryableTargetTotal} target`);
  lines.push(`Non-queryable IDs:    ${nonQueryableBlocks.map(b => b.id).join(', ')}`);
  lines.push(divider);
  lines.push('');

  // Print to console
  const output = lines.join('\n');
  console.log(output);

  // Save to file
  const outputPath = path.join(__dirname, 'baseline-audit.txt');
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log(`\nSaved to: ${outputPath}`);
}

// ============================================================
// CLI ENTRY
// ============================================================

const args = process.argv.slice(2);
let target = 'production';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && args[i + 1]) {
    target = args[i + 1];
    i++;
  }
}

runAudit(target).catch((err) => {
  console.error('\nAudit failed:', err.message || err);
  process.exit(1);
});
