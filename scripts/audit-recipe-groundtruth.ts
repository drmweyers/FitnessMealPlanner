#!/usr/bin/env tsx
/**
 * Recipe Ground-Truth Sample Check
 *
 * Picks a random sample of recipes, feeds their ingredients+servings to
 * GPT-4o-mini, and asks it to compute nutrition from scratch. Compares the
 * LLM's answer to the stored values and reports agreement rate.
 *
 * Tells us whether the stored macros are merely *self-consistent* or
 * actually *correct*. If >= 90% of sampled recipes agree within ±15% on
 * every field, the quick-audit fix pass is sufficient. If not, we need a
 * full recompute of all 6,000 rows.
 *
 * Usage:
 *   DATABASE_URL=... OPENAI_API_KEY=... \
 *     npx tsx scripts/audit-recipe-groundtruth.ts [sampleSize]
 *
 * Default sample size: 50
 * Cost: ~$0.0003/recipe with gpt-4o-mini (~$0.015 for 50 recipes)
 * Read-only — no writes.
 */

import { Pool } from "pg";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const SAMPLE_SIZE = parseInt(process.argv[2] || "50", 10);
const TOLERANCE_PCT = 0.15; // ±15%
const MODEL = "gpt-4o-mini";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1") ||
    process.env.DATABASE_URL.includes("postgres:5432")
      ? false
      : { rejectUnauthorized: false },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 2,
});

type Row = {
  id: string;
  name: string;
  tier_level: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  calories_kcal: number;
  protein_grams: string;
  carbs_grams: string;
  fat_grams: string;
  ingredients_json: { name: string; amount: string; unit?: string }[];
  instructions_text: string;
};

type GroundTruth = {
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  prepTimeMinutes: number;
};

type Comparison = {
  id: string;
  name: string;
  tier: string;
  stored: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    prep: number;
  };
  truth: GroundTruth;
  deltaPct: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  withinTolerance: boolean;
  fieldsOutOfTolerance: string[];
};

const SYSTEM_PROMPT = `You are a precise nutrition calculator. Given a recipe's ingredient list and serving count, compute the nutrition *per serving* using standard USDA/FDA reference values. Be accurate — do not round to "clean" numbers. Use real reference data for each ingredient. Return only the JSON object requested — no prose.`;

async function computeGroundTruth(row: Row): Promise<GroundTruth | null> {
  const ingredientText = row.ingredients_json
    .map((i) => `- ${i.amount}${i.unit ? " " + i.unit : ""} ${i.name}`)
    .join("\n");

  const userPrompt = `Recipe: ${row.name}
Servings: ${row.servings}
Ingredients:
${ingredientText}

Instructions (for prep time estimate):
${row.instructions_text.slice(0, 800)}

Compute the nutrition PER SERVING (total nutrition / ${row.servings}).
Estimate prep time in minutes based on the instructions (chopping, mixing, assembly — not cooking).

Return JSON:
{
  "caloriesKcal": <integer>,
  "proteinGrams": <number, 1 decimal>,
  "carbsGrams": <number, 1 decimal>,
  "fatGrams": <number, 1 decimal>,
  "prepTimeMinutes": <integer>
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const content = resp.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      caloriesKcal: Number(parsed.caloriesKcal),
      proteinGrams: Number(parsed.proteinGrams),
      carbsGrams: Number(parsed.carbsGrams),
      fatGrams: Number(parsed.fatGrams),
      prepTimeMinutes: Number(parsed.prepTimeMinutes),
    };
  } catch (err) {
    console.error(`  LLM call failed for ${row.name}:`, (err as Error).message);
    return null;
  }
}

function pctDelta(stored: number, truth: number): number {
  if (truth === 0 && stored === 0) return 0;
  if (truth === 0) return 1;
  return Math.abs(stored - truth) / truth;
}

function compare(row: Row, truth: GroundTruth): Comparison {
  const stored = {
    kcal: row.calories_kcal,
    protein: parseFloat(row.protein_grams),
    carbs: parseFloat(row.carbs_grams),
    fat: parseFloat(row.fat_grams),
    prep: row.prep_time_minutes,
  };
  const deltaPct = {
    kcal: pctDelta(stored.kcal, truth.caloriesKcal),
    protein: pctDelta(stored.protein, truth.proteinGrams),
    carbs: pctDelta(stored.carbs, truth.carbsGrams),
    fat: pctDelta(stored.fat, truth.fatGrams),
  };
  const fieldsOutOfTolerance: string[] = [];
  if (deltaPct.kcal > TOLERANCE_PCT) fieldsOutOfTolerance.push("kcal");
  if (deltaPct.protein > TOLERANCE_PCT) fieldsOutOfTolerance.push("protein");
  if (deltaPct.carbs > TOLERANCE_PCT) fieldsOutOfTolerance.push("carbs");
  if (deltaPct.fat > TOLERANCE_PCT) fieldsOutOfTolerance.push("fat");

  return {
    id: row.id,
    name: row.name,
    tier: row.tier_level,
    stored,
    truth,
    deltaPct,
    withinTolerance: fieldsOutOfTolerance.length === 0,
    fieldsOutOfTolerance,
  };
}

async function main() {
  console.log(
    `Drawing random sample of ${SAMPLE_SIZE} recipes (stratified by tier)...`,
  );

  // Stratified sample: roughly proportional across tiers.
  const { rows } = await pool.query<Row>(
    `
    (SELECT id, name, tier_level, servings, prep_time_minutes, cook_time_minutes,
            calories_kcal, protein_grams, carbs_grams, fat_grams,
            ingredients_json, instructions_text
     FROM recipes WHERE tier_level = 'starter' ORDER BY random() LIMIT $1)
    UNION ALL
    (SELECT id, name, tier_level, servings, prep_time_minutes, cook_time_minutes,
            calories_kcal, protein_grams, carbs_grams, fat_grams,
            ingredients_json, instructions_text
     FROM recipes WHERE tier_level = 'professional' ORDER BY random() LIMIT $1)
    UNION ALL
    (SELECT id, name, tier_level, servings, prep_time_minutes, cook_time_minutes,
            calories_kcal, protein_grams, carbs_grams, fat_grams,
            ingredients_json, instructions_text
     FROM recipes WHERE tier_level = 'enterprise' ORDER BY random() LIMIT $1)
  `,
    [Math.ceil(SAMPLE_SIZE / 3)],
  );

  console.log(`Got ${rows.length} recipes across tiers.\n`);
  console.log(`Calling ${MODEL} for ground-truth nutrition...`);

  const comparisons: Comparison[] = [];
  const startTime = Date.now();

  // Small concurrency to stay under rate limits.
  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (row) => {
        const truth = await computeGroundTruth(row);
        if (!truth) return null;
        return compare(row, truth);
      }),
    );
    for (const r of results) if (r) comparisons.push(r);
    process.stdout.write(
      `  ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}\r`,
    );
  }

  console.log(
    `\nDone in ${((Date.now() - startTime) / 1000).toFixed(1)}s. Got ${comparisons.length} valid comparisons.\n`,
  );

  // Summary
  const passed = comparisons.filter((c) => c.withinTolerance);
  const failed = comparisons.filter((c) => !c.withinTolerance);
  const agreementPct = (passed.length / comparisons.length) * 100;

  // Per-field failure tally
  const fieldFailures: Record<string, number> = {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  for (const c of failed)
    for (const f of c.fieldsOutOfTolerance) fieldFailures[f]++;

  // Average absolute delta per field
  const avgDelta = {
    kcal:
      comparisons.reduce((s, c) => s + c.deltaPct.kcal, 0) / comparisons.length,
    protein:
      comparisons.reduce((s, c) => s + c.deltaPct.protein, 0) /
      comparisons.length,
    carbs:
      comparisons.reduce((s, c) => s + c.deltaPct.carbs, 0) /
      comparisons.length,
    fat:
      comparisons.reduce((s, c) => s + c.deltaPct.fat, 0) / comparisons.length,
  };

  console.log("=".repeat(60));
  console.log("GROUND-TRUTH SAMPLE RESULTS");
  console.log("=".repeat(60));
  console.log(`Sample size:        ${comparisons.length}`);
  console.log(`Tolerance:          ±${TOLERANCE_PCT * 100}% per field`);
  console.log(
    `Agreement rate:     ${agreementPct.toFixed(1)}% (${passed.length}/${comparisons.length})`,
  );
  console.log("");
  console.log("Per-field failures (|delta| > 15%):");
  console.log(`  kcal       ${fieldFailures.kcal}`);
  console.log(`  protein    ${fieldFailures.protein}`);
  console.log(`  carbs      ${fieldFailures.carbs}`);
  console.log(`  fat        ${fieldFailures.fat}`);
  console.log("");
  console.log("Average |delta| per field across all sampled recipes:");
  console.log(`  kcal       ${(avgDelta.kcal * 100).toFixed(1)}%`);
  console.log(`  protein    ${(avgDelta.protein * 100).toFixed(1)}%`);
  console.log(`  carbs      ${(avgDelta.carbs * 100).toFixed(1)}%`);
  console.log(`  fat        ${(avgDelta.fat * 100).toFixed(1)}%`);
  console.log("");
  console.log("=".repeat(60));
  console.log("RECOMMENDATION");
  console.log("=".repeat(60));
  if (agreementPct >= 90) {
    console.log(
      "PASS — stored nutrition is trustworthy. Proceed with targeted fix",
    );
    console.log(
      "      pass on the rows flagged by audit-recipe-accuracy.ts only.",
    );
  } else if (agreementPct >= 70) {
    console.log(
      "MARGINAL — systemic drift on some fields. Consider recomputing the",
    );
    console.log(
      "          worst-offending field(s) across all 6,000 rows. See field",
    );
    console.log("          failure tally above.");
  } else {
    console.log(
      "FAIL — stored nutrition is unreliable. Full recompute of all 6,000",
    );
    console.log("       recipes from ingredients is recommended.");
  }

  // Write detailed CSV
  const csvPath = path.join(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")),
    "audit-recipe-groundtruth.csv",
  );
  const header =
    "id,tier,name,stored_kcal,truth_kcal,delta_kcal_pct,stored_protein,truth_protein,delta_protein_pct,stored_carbs,truth_carbs,delta_carbs_pct,stored_fat,truth_fat,delta_fat_pct,stored_prep,truth_prep,within_tolerance,fields_out";
  const lines = comparisons.map((c) => {
    const safeName = `"${c.name.replace(/"/g, '""')}"`;
    return [
      c.id,
      c.tier,
      safeName,
      c.stored.kcal,
      c.truth.caloriesKcal,
      (c.deltaPct.kcal * 100).toFixed(1),
      c.stored.protein,
      c.truth.proteinGrams,
      (c.deltaPct.protein * 100).toFixed(1),
      c.stored.carbs,
      c.truth.carbsGrams,
      (c.deltaPct.carbs * 100).toFixed(1),
      c.stored.fat,
      c.truth.fatGrams,
      (c.deltaPct.fat * 100).toFixed(1),
      c.stored.prep,
      c.truth.prepTimeMinutes,
      c.withinTolerance,
      c.fieldsOutOfTolerance.join("|"),
    ].join(",");
  });
  fs.writeFileSync(csvPath, [header, ...lines].join("\n"));
  console.log(`\nDetailed CSV: ${csvPath}`);

  // Sample of worst offenders
  if (failed.length > 0) {
    const worst = [...failed]
      .sort(
        (a, b) =>
          Math.max(
            b.deltaPct.kcal,
            b.deltaPct.protein,
            b.deltaPct.carbs,
            b.deltaPct.fat,
          ) -
          Math.max(
            a.deltaPct.kcal,
            a.deltaPct.protein,
            a.deltaPct.carbs,
            a.deltaPct.fat,
          ),
      )
      .slice(0, 5);
    console.log("\nTop 5 worst offenders:");
    for (const c of worst) {
      console.log(
        `  ${c.name.slice(0, 40)} | stored(kcal/P/C/F)=${c.stored.kcal}/${c.stored.protein}/${c.stored.carbs}/${c.stored.fat} truth=${c.truth.caloriesKcal}/${c.truth.proteinGrams}/${c.truth.carbsGrams}/${c.truth.fatGrams}`,
      );
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Ground-truth check failed:", err);
  process.exit(1);
});
