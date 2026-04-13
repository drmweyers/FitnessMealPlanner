/**
 * recipeTagClassifier.ts — Rule-based dietary tag classifier
 *
 * Analyzes a recipe's ingredients + macros and returns the canonical set of
 * dietary tags that apply. Deterministic, fast (no API calls), free.
 *
 * Built to backfill production recipes where BMAD only produced
 * "High-Protein" / "Vegetarian" / "Low-Fat" but the UI offers:
 * keto, vegan, paleo, mediterranean, gluten-free, dairy-free, low-carb.
 *
 * Usage:
 *   import { classifyRecipe } from './recipeTagClassifier';
 *   const tags = classifyRecipe(recipe); // returns string[] of canonical tags
 */

export interface ClassifiableRecipe {
  name?: string | null;
  description?: string | null;
  mealTypes?: string[] | null;
  dietaryTags?: string[] | null;
  mainIngredientTags?: string[] | null;
  ingredientsJson?: Array<{
    name?: string;
    amount?: string;
    unit?: string;
  }> | null;
  caloriesKcal?: number | string | null;
  proteinGrams?: number | string | null;
  carbsGrams?: number | string | null;
  fatGrams?: number | string | null;
  servings?: number | string | null;
}

// ---------- Ingredient lexicons ----------

// Words that positively identify an ingredient class. All lowercased.
const MEAT_POULTRY = [
  "beef",
  "steak",
  "ribeye",
  "sirloin",
  "brisket",
  "chuck",
  "flank",
  "filet",
  "tenderloin",
  "ground beef",
  "veal",
  "lamb",
  "pork",
  "ham",
  "bacon",
  "sausage",
  "prosciutto",
  "chorizo",
  "pepperoni",
  "salami",
  "chicken",
  "turkey",
  "duck",
  "quail",
  "goose",
  "hot dog",
  "kielbasa",
  "pastrami",
  "mince",
  "meatball",
  "jerky",
];
const FISH_SEAFOOD = [
  "salmon",
  "tuna",
  "cod",
  "tilapia",
  "trout",
  "halibut",
  "mackerel",
  "sardine",
  "anchovy",
  "herring",
  "bass",
  "snapper",
  "mahi",
  "swordfish",
  "shrimp",
  "prawn",
  "lobster",
  "crab",
  "scallop",
  "clam",
  "mussel",
  "oyster",
  "squid",
  "octopus",
  "calamari",
  "fish sauce",
];
const EGGS = ["egg", "eggs", "yolk", "yolks", "egg white", "egg whites"];
const DAIRY = [
  "milk",
  "whole milk",
  "skim milk",
  "2% milk",
  "1% milk",
  "cheese",
  "cheddar",
  "mozzarella",
  "parmesan",
  "swiss",
  "gouda",
  "brie",
  "feta",
  "ricotta",
  "cream cheese",
  "cottage cheese",
  "yogurt",
  "greek yogurt",
  "butter",
  "ghee",
  "cream",
  "heavy cream",
  "sour cream",
  "half and half",
  "whey",
  "casein",
  "ice cream",
  "gelato",
];
const HONEY_GELATIN = ["honey", "gelatin", "gelatine"];

const GRAINS = [
  "wheat",
  "flour",
  "all-purpose flour",
  "bread",
  "bagel",
  "toast",
  "pasta",
  "spaghetti",
  "penne",
  "fettuccine",
  "lasagna",
  "noodle",
  "noodles",
  "rice",
  "brown rice",
  "white rice",
  "jasmine rice",
  "basmati",
  "risotto",
  "oats",
  "oatmeal",
  "rolled oats",
  "steel cut oats",
  "granola",
  "quinoa",
  "barley",
  "bulgur",
  "couscous",
  "millet",
  "rye",
  "corn",
  "tortilla",
  "taco shell",
  "cornmeal",
  "polenta",
  "cereal",
  "cracker",
  "pita",
  "naan",
];
const LEGUMES = [
  "bean",
  "beans",
  "lentil",
  "lentils",
  "chickpea",
  "chickpeas",
  "garbanzo",
  "black bean",
  "kidney bean",
  "pinto bean",
  "navy bean",
  "cannellini",
  "edamame",
  "soy",
  "soybean",
  "tofu",
  "tempeh",
  "peanut",
  "peanuts",
  "hummus",
];
const GLUTEN_GRAINS = [
  "wheat",
  "flour",
  "bread",
  "bagel",
  "toast",
  "pasta",
  "spaghetti",
  "penne",
  "fettuccine",
  "lasagna",
  "noodle",
  "noodles",
  "pita",
  "naan",
  "cracker",
  "cereal",
  "barley",
  "rye",
  "bulgur",
  "couscous",
  "tortilla",
  "breadcrumb",
  "panko",
  "seitan",
  "soy sauce",
];
const MED_POSITIVES = [
  "olive oil",
  "extra virgin olive oil",
  "evoo",
  "feta",
  "olives",
  "kalamata",
  "tomato",
  "tomatoes",
  "cucumber",
  "eggplant",
  "zucchini",
  "chickpea",
  "chickpeas",
  "lentil",
  "lentils",
  "whole wheat",
  "whole grain",
  "quinoa",
  "bulgur",
  "couscous",
  "salmon",
  "tuna",
  "sardine",
  "anchovy",
  "mackerel",
  "trout",
  "lemon",
  "herbs",
  "basil",
  "oregano",
  "rosemary",
  "thyme",
  "parsley",
];
const PROCESSED_SUGAR = [
  "sugar",
  "white sugar",
  "brown sugar",
  "corn syrup",
  "high fructose",
  "maple syrup",
  "cane sugar",
  "powdered sugar",
];
const PROCESSED_OILS = [
  "canola oil",
  "vegetable oil",
  "soybean oil",
  "corn oil",
  "margarine",
  "shortening",
];

// ---------- Helpers ----------

function nameList(recipe: ClassifiableRecipe): string {
  const ingredientNames = (recipe.ingredientsJson || [])
    .map((i) => (i?.name || "").toLowerCase().trim())
    .filter(Boolean);
  const mainTags = (recipe.mainIngredientTags || []).map((t) =>
    t.toLowerCase(),
  );
  return [
    ...ingredientNames,
    ...mainTags,
    (recipe.name || "").toLowerCase(),
  ].join(" | ");
}

function containsAny(hay: string, needles: string[]): boolean {
  // Use word-boundary-ish matching to avoid "bread" matching "breadfruit"
  // but still match within a pipe-separated ingredient list.
  return needles.some((n) => {
    const pattern = new RegExp(
      `(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
      "i",
    );
    return pattern.test(hay);
  });
}

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Returns per-serving macros, dividing totals by `servings` if present.
 */
function perServing(recipe: ClassifiableRecipe) {
  const servings = Math.max(num(recipe.servings) || 1, 1);
  return {
    calories: num(recipe.caloriesKcal) / servings,
    protein: num(recipe.proteinGrams) / servings,
    carbs: num(recipe.carbsGrams) / servings,
    fat: num(recipe.fatGrams) / servings,
  };
}

// ---------- Classifiers ----------

function isVegan(hay: string): boolean {
  if (containsAny(hay, MEAT_POULTRY)) return false;
  if (containsAny(hay, FISH_SEAFOOD)) return false;
  if (containsAny(hay, EGGS)) return false;
  if (containsAny(hay, DAIRY)) return false;
  if (containsAny(hay, HONEY_GELATIN)) return false;
  return true;
}

function isVegetarian(hay: string): boolean {
  if (containsAny(hay, MEAT_POULTRY)) return false;
  if (containsAny(hay, FISH_SEAFOOD)) return false;
  return true;
}

function isKeto(
  hay: string,
  macros: { carbs: number; fat: number; protein: number },
): boolean {
  // Keto: per-serving carbs <= 12g AND fat > 50% of calories.
  // Also exclude high-carb staples that slip past pure macro math
  // (e.g. "keto bread" with 15g carbs shouldn't qualify).
  if (macros.carbs > 12) return false;
  const fatCalories = macros.fat * 9;
  const proteinCalories = macros.protein * 4;
  const carbCalories = macros.carbs * 4;
  const total = fatCalories + proteinCalories + carbCalories;
  if (total <= 0) return false;
  if (fatCalories / total < 0.55) return false;
  // Structural disqualifiers
  if (
    containsAny(hay, [
      "bread",
      "pasta",
      "rice",
      "tortilla",
      "oatmeal",
      "oats",
      "granola",
      "sugar",
      "honey",
      "maple syrup",
      "potato",
      "sweet potato",
      "corn",
      "quinoa",
    ])
  )
    return false;
  return true;
}

function isLowCarb(macros: { carbs: number }): boolean {
  return macros.carbs <= 20;
}

function isLowFat(macros: { fat: number; calories: number }): boolean {
  if (macros.calories <= 0) return false;
  const fatCalories = macros.fat * 9;
  return fatCalories / macros.calories < 0.3 && macros.fat <= 15;
}

function isHighProtein(macros: { protein: number; calories: number }): boolean {
  if (macros.calories <= 0) return false;
  const proteinCalories = macros.protein * 4;
  // 25%+ of calories from protein OR 25g+ absolute per serving
  return proteinCalories / macros.calories >= 0.25 || macros.protein >= 25;
}

function isPaleo(hay: string): boolean {
  if (containsAny(hay, GRAINS)) return false;
  if (containsAny(hay, LEGUMES)) return false;
  if (containsAny(hay, DAIRY)) return false;
  if (containsAny(hay, PROCESSED_SUGAR)) return false;
  if (containsAny(hay, PROCESSED_OILS)) return false;
  return true;
}

function isGlutenFree(hay: string): boolean {
  return !containsAny(hay, GLUTEN_GRAINS);
}

function isDairyFree(hay: string): boolean {
  return !containsAny(hay, DAIRY);
}

function isMediterranean(hay: string): boolean {
  let positives = 0;
  for (const positive of MED_POSITIVES) {
    if (hay.includes(positive)) positives++;
    if (positives >= 2) return true;
  }
  return false;
}

// ---------- Public API ----------

export interface ClassificationResult {
  tags: string[];
  added: string[];
  preserved: string[];
}

/**
 * Classify a single recipe. Returns the full canonical tag set,
 * plus which tags were newly added vs preserved from the input.
 * Preserves any existing tags not in our canonical list so we never
 * destroy human-curated metadata.
 */
export function classifyRecipe(
  recipe: ClassifiableRecipe,
): ClassificationResult {
  const hay = nameList(recipe);
  const macros = perServing(recipe);
  const existing = new Set((recipe.dietaryTags || []).map((t) => t.trim()));
  const existingNormalized = new Set(
    Array.from(existing).map((t) => t.toLowerCase().replace(/_/g, "-")),
  );

  const tagChecks: Array<[string, boolean]> = [
    ["Vegan", isVegan(hay)],
    ["Vegetarian", isVegetarian(hay)],
    ["Keto", isKeto(hay, macros)],
    ["Low-Carb", isLowCarb(macros)],
    ["Low-Fat", isLowFat(macros)],
    ["High-Protein", isHighProtein(macros)],
    ["Paleo", isPaleo(hay)],
    ["Gluten-Free", isGlutenFree(hay)],
    ["Dairy-Free", isDairyFree(hay)],
    ["Mediterranean", isMediterranean(hay)],
  ];

  const added: string[] = [];
  const finalTags = new Set<string>(existing);

  for (const [tag, applies] of tagChecks) {
    if (!applies) continue;
    if (existingNormalized.has(tag.toLowerCase())) continue;
    finalTags.add(tag);
    added.push(tag);
  }

  const preserved = Array.from(existing);
  return {
    tags: Array.from(finalTags),
    added,
    preserved,
  };
}

/**
 * Batch classify. Returns per-recipe results.
 */
export function classifyBatch(
  recipes: ClassifiableRecipe[],
): Array<{ recipe: ClassifiableRecipe; result: ClassificationResult }> {
  return recipes.map((recipe) => ({ recipe, result: classifyRecipe(recipe) }));
}
