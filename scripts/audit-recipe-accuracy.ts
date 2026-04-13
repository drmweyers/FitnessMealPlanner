#!/usr/bin/env tsx
/**
 * Recipe Accuracy Audit (read-only)
 *
 * Scans every row in `recipes` and flags advanced-filter fields that are
 * missing, out-of-range, or internally inconsistent (macro/calorie mismatch).
 *
 * Outputs:
 *   - console summary with counts per failure mode
 *   - CSV report at scripts/audit-recipe-accuracy.csv
 *
 * No writes. Safe to run against production.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/audit-recipe-accuracy.ts
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1") ||
    process.env.DATABASE_URL.includes("postgres:5432")
      ? false
      : { rejectUnauthorized: false },
});

// Plausibility bounds for *per-serving* values.
const BOUNDS = {
  prepMin: 1,
  prepMax: 240,
  kcalMin: 30,
  kcalMax: 1500,
  proteinMin: 0,
  proteinMax: 200,
  carbsMin: 0,
  carbsMax: 250,
  fatMin: 0,
  fatMax: 150,
  // |stated kcal - (4P + 4C + 9F)| / stated kcal
  macroMismatchPct: 0.15,
};

type Row = {
  id: string;
  name: string;
  tier_level: string;
  is_approved: boolean;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  calories_kcal: number;
  protein_grams: string;
  carbs_grams: string;
  fat_grams: string;
};

type Flag =
  | "PREP_ZERO_OR_MISSING"
  | "PREP_OUT_OF_RANGE"
  | "KCAL_OUT_OF_RANGE"
  | "PROTEIN_OUT_OF_RANGE"
  | "CARBS_OUT_OF_RANGE"
  | "FAT_OUT_OF_RANGE"
  | "ALL_MACROS_ZERO"
  | "MACRO_CALORIE_MISMATCH"
  | "SERVINGS_INVALID";

function classify(r: Row): Flag[] {
  const flags: Flag[] = [];
  const protein = parseFloat(r.protein_grams);
  const carbs = parseFloat(r.carbs_grams);
  const fat = parseFloat(r.fat_grams);
  const kcal = r.calories_kcal;

  if (!r.prep_time_minutes || r.prep_time_minutes <= 0) {
    flags.push("PREP_ZERO_OR_MISSING");
  } else if (
    r.prep_time_minutes < BOUNDS.prepMin ||
    r.prep_time_minutes > BOUNDS.prepMax
  ) {
    flags.push("PREP_OUT_OF_RANGE");
  }

  if (!r.servings || r.servings <= 0) flags.push("SERVINGS_INVALID");

  if (kcal < BOUNDS.kcalMin || kcal > BOUNDS.kcalMax)
    flags.push("KCAL_OUT_OF_RANGE");
  if (protein < BOUNDS.proteinMin || protein > BOUNDS.proteinMax)
    flags.push("PROTEIN_OUT_OF_RANGE");
  if (carbs < BOUNDS.carbsMin || carbs > BOUNDS.carbsMax)
    flags.push("CARBS_OUT_OF_RANGE");
  if (fat < BOUNDS.fatMin || fat > BOUNDS.fatMax)
    flags.push("FAT_OUT_OF_RANGE");

  if (protein === 0 && carbs === 0 && fat === 0) flags.push("ALL_MACROS_ZERO");

  // Macro/calorie consistency (Atwater factors).
  if (kcal >= BOUNDS.kcalMin && (protein > 0 || carbs > 0 || fat > 0)) {
    const computed = 4 * protein + 4 * carbs + 9 * fat;
    const delta = Math.abs(kcal - computed) / kcal;
    if (delta > BOUNDS.macroMismatchPct) flags.push("MACRO_CALORIE_MISMATCH");
  }

  return flags;
}

async function main() {
  console.log("Fetching recipes...");
  const { rows } = await pool.query<Row>(`
    SELECT id, name, tier_level, is_approved,
           prep_time_minutes, cook_time_minutes, servings,
           calories_kcal, protein_grams, carbs_grams, fat_grams
    FROM recipes
    ORDER BY creation_timestamp ASC
  `);

  console.log(`Scanning ${rows.length} recipes...\n`);

  const counts: Record<string, number> = {};
  const flaggedRows: { row: Row; flags: Flag[]; computedKcal: number }[] = [];

  for (const r of rows) {
    const flags = classify(r);
    if (flags.length === 0) continue;
    const protein = parseFloat(r.protein_grams);
    const carbs = parseFloat(r.carbs_grams);
    const fat = parseFloat(r.fat_grams);
    flaggedRows.push({
      row: r,
      flags,
      computedKcal: Math.round(4 * protein + 4 * carbs + 9 * fat),
    });
    for (const f of flags) counts[f] = (counts[f] || 0) + 1;
  }

  // Summary
  const cleanCount = rows.length - flaggedRows.length;
  console.log("=".repeat(60));
  console.log("AUDIT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total recipes:  ${rows.length}`);
  console.log(
    `Clean:          ${cleanCount} (${((cleanCount / rows.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Flagged:        ${flaggedRows.length} (${((flaggedRows.length / rows.length) * 100).toFixed(1)}%)`,
  );
  console.log("");
  console.log("Failure modes (a recipe may have multiple):");
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [flag, n] of sorted) {
    console.log(`  ${flag.padEnd(26)} ${String(n).padStart(6)}`);
  }

  // By tier
  console.log("\nFlagged by tier:");
  const byTier: Record<string, number> = {};
  for (const { row } of flaggedRows)
    byTier[row.tier_level] = (byTier[row.tier_level] || 0) + 1;
  for (const [tier, n] of Object.entries(byTier)) {
    console.log(`  ${tier.padEnd(12)} ${String(n).padStart(6)}`);
  }

  // CSV
  const csvPath = path.join(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")),
    "audit-recipe-accuracy.csv",
  );
  const header =
    "id,name,tier,approved,prep_min,servings,kcal,protein,carbs,fat,computed_kcal,flags";
  const lines = flaggedRows.map(({ row: r, flags, computedKcal }) => {
    const safeName = `"${r.name.replace(/"/g, '""')}"`;
    return [
      r.id,
      safeName,
      r.tier_level,
      r.is_approved,
      r.prep_time_minutes,
      r.servings,
      r.calories_kcal,
      r.protein_grams,
      r.carbs_grams,
      r.fat_grams,
      computedKcal,
      flags.join("|"),
    ].join(",");
  });
  fs.writeFileSync(csvPath, [header, ...lines].join("\n"));
  console.log(`\nCSV written: ${csvPath}`);

  // Sample offenders for quick eyeballing
  if (flaggedRows.length > 0) {
    console.log("\nSample flagged recipes (first 10):");
    for (const { row: r, flags, computedKcal } of flaggedRows.slice(0, 10)) {
      console.log(
        `  [${flags.join(",")}] ${r.name.slice(0, 50)} | kcal=${r.calories_kcal} computed=${computedKcal} P=${r.protein_grams} C=${r.carbs_grams} F=${r.fat_grams} prep=${r.prep_time_minutes}`,
      );
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
