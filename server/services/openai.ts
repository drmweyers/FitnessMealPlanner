import OpenAI from "openai";
import {
  mealPlanGenerationSchema,
  type MealPlanGeneration,
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes timeout for all API calls
  maxRetries: 2, // Retry failed requests twice
});

export interface GeneratedRecipe {
  name: string;
  description: string;
  mealTypes: string[];
  dietaryTags: string[];
  mainIngredientTags: string[];
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  estimatedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  imageUrl?: string; // Optional - added later by image generation
}

interface GenerateOptions {
  mealTypes?: string[];
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
  focusIngredient?: string; // Primary ingredient to feature prominently
  difficultyLevel?: string; // e.g., "easy", "medium", "hard"
  recipePreferences?: string; // Additional preferences like "quick meals", "family friendly"
  maxIngredients?: number; // Maximum number of ingredients allowed
  fitnessGoal?: string;
  naturalLanguagePrompt?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

/**
 * Clean up and parse potentially incomplete JSON from OpenAI
 */
function parsePartialJson(jsonString: string): any {
  try {
    // First, try to parse it as is
    return JSON.parse(jsonString);
  } catch (e) {
    // If it fails, it might be an incomplete JSON.
    // Let's try to repair it by finding the last complete object.
    const lastValidJsonEnd = Math.max(
      jsonString.lastIndexOf("}"),
      jsonString.lastIndexOf("]"),
    );

    if (lastValidJsonEnd === -1) {
      throw new Error("No valid JSON structures found in the response.");
    }

    // Trim to the last complete structure
    let potentialJson = jsonString.substring(0, lastValidJsonEnd + 1);

    // If it's a list of objects, it needs to be closed with a ']'
    if (potentialJson.lastIndexOf("[") > potentialJson.lastIndexOf("{")) {
      // It's likely an unclosed array
      if (potentialJson.endsWith(",")) {
        potentialJson = potentialJson.slice(0, -1); // remove trailing comma
      }
      potentialJson += "]";
    }

    // If the top-level is an object, find its opening and closing
    const jsonStart = potentialJson.indexOf("{");
    const jsonEnd = potentialJson.lastIndexOf("}");
    potentialJson = potentialJson.substring(jsonStart, jsonEnd + 1);

    try {
      // Try parsing the repaired string
      const parsed = JSON.parse(potentialJson);
      return parsed;
    } catch (finalError) {
      // If all attempts fail, throw a specific error
      console.error("Original failing JSON:", jsonString);
      throw new Error(`Failed to parse or repair JSON response: ${finalError}`);
    }
  }
}

/**
 * Optimal chunk size for batch recipe generation
 * Batches larger than this will be split into multiple API calls
 */
const OPTIMAL_CHUNK_SIZE = 5;

/**
 * Public API: Generate recipes in batch, automatically chunking large requests
 */
export async function generateRecipeBatch(
  count: number,
  options: GenerateOptions = {},
): Promise<GeneratedRecipe[]> {
  if (count > OPTIMAL_CHUNK_SIZE) {
    console.log(
      `Large batch detected (${count} recipes). Splitting into chunks of ${OPTIMAL_CHUNK_SIZE}...`,
    );
    return await generateRecipeBatchChunked(count, options);
  }
  return await generateRecipeBatchSingle(count, options);
}

/**
 * Process large batches by splitting into optimal chunks
 */
async function generateRecipeBatchChunked(
  totalCount: number,
  options: GenerateOptions,
): Promise<GeneratedRecipe[]> {
  const allRecipes: GeneratedRecipe[] = [];
  const chunks = Math.ceil(totalCount / OPTIMAL_CHUNK_SIZE);

  for (let i = 0; i < chunks; i++) {
    const chunkSize = Math.min(
      OPTIMAL_CHUNK_SIZE,
      totalCount - allRecipes.length,
    );
    console.log(
      `📦 Generating chunk ${i + 1}/${chunks} (${chunkSize} recipes)...`,
    );

    const chunkRecipes = await generateRecipeBatchSingle(chunkSize, options);
    allRecipes.push(...chunkRecipes);

    console.log(
      `✅ Chunk ${i + 1}/${chunks} complete. Progress: ${allRecipes.length}/${totalCount} recipes generated`,
    );
  }

  console.log(`🎉 All ${totalCount} recipes generated successfully!`);
  return allRecipes;
}

/**
 * Generate a single batch of recipes (internal implementation)
 */
async function generateRecipeBatchSingle(
  count: number,
  options: GenerateOptions = {},
): Promise<GeneratedRecipe[]> {
  console.log(
    `[generateRecipeBatchSingle] CALLED with count=${count}, options=`,
    Object.keys(options),
  );
  console.log(
    `[generateRecipeBatchSingle] OPENAI_API_KEY exists: ${!!process.env.OPENAI_API_KEY}`,
  );
  console.log(`[generateRecipeBatchSingle] Input options details:`, {
    focusIngredient: options.focusIngredient,
    difficultyLevel: options.difficultyLevel,
    recipePreferences: options.recipePreferences,
    maxIngredients: options.maxIngredients,
    mealTypes: options.mealTypes,
    dietaryRestrictions: options.dietaryRestrictions,
    fitnessGoal: options.fitnessGoal,
    targetCalories: options.targetCalories,
    maxCalories: options.maxCalories,
    maxPrepTime: options.maxPrepTime,
    minProtein: options.minProtein,
    maxProtein: options.maxProtein,
    minCarbs: options.minCarbs,
    maxCarbs: options.maxCarbs,
    minFat: options.minFat,
    maxFat: options.maxFat,
    naturalLanguagePrompt: options.naturalLanguagePrompt,
  });

  const systemPrompt = `You are an expert nutritionist and professional chef specializing in precise recipe generation.
Your task is to generate ${count} recipe${count > 1 ? "s" : ""} that STRICTLY ADHERE to ALL specified constraints and requirements.

CRITICAL RULES - THESE ARE MANDATORY, NOT SUGGESTIONS:
${options.focusIngredient ? `1. PRIMARY INGREDIENT (HIGHEST PRIORITY): "${options.focusIngredient}" MUST be the main/primary ingredient in EVERY recipe. This overrides ALL other ingredient requirements. If recipePreferences mentions other ingredients, IGNORE those and use ONLY "${options.focusIngredient}".` : options.mainIngredient ? `1. MAIN INGREDIENT: Feature "${options.mainIngredient}" as the primary ingredient when possible.` : ""}
${options.maxIngredients ? `2. INGREDIENT COUNT LIMIT: Each recipe MUST use EXACTLY ${options.maxIngredients} or FEWER ingredients total. Count EVERYTHING: main ingredients, vegetables, spices, oils, salt, pepper, herbs, seasonings, condiments. For example, if maxIngredients is 10, you cannot use 11 ingredients.` : ""}
${options.maxPrepTime ? `3. TIME CONSTRAINT: The TOTAL time (prepTimeMinutes + cookTimeMinutes) MUST be ${options.maxPrepTime} minutes or LESS. Calculate carefully: if prepTimeMinutes=5 and cookTimeMinutes=12, total is 17 minutes (within limit).` : ""}
${options.maxCalories ? `4. CALORIE LIMIT: Each recipe's estimatedNutrition.calories MUST NOT exceed ${options.maxCalories} calories. This is a hard limit - recipes exceeding this will be rejected.` : ""}
${options.targetCalories ? `5. CALORIE TARGET: Aim for approximately ${options.targetCalories} calories per recipe (±10% variance is acceptable, but ${options.maxCalories ? `must not exceed ${options.maxCalories}` : "stay close to target"}).` : ""}
${options.minProtein || options.maxProtein ? `6. PROTEIN RANGE: Each recipe's estimatedNutrition.protein MUST be between ${options.minProtein || 0}g and ${options.maxProtein || "∞"}g. Values outside this range are INVALID.` : ""}
${options.minCarbs || options.maxCarbs ? `7. CARBS RANGE: Each recipe's estimatedNutrition.carbs MUST be between ${options.minCarbs || 0}g and ${options.maxCarbs || "∞"}g. Values outside this range are INVALID.` : ""}
${options.minFat || options.maxFat ? `8. FAT RANGE: Each recipe's estimatedNutrition.fat MUST be between ${options.minFat || 0}g and ${options.maxFat || "∞"}g. Values outside this range are INVALID.` : ""}
${
  options.difficultyLevel
    ? `9. DIFFICULTY LEVEL: Recipes must match "${options.difficultyLevel}" difficulty:
   - "easy": Simple techniques, minimal steps, common ingredients, basic cooking methods (boil, pan-fry, bake)
   - "medium": Moderate techniques, some skill required, intermediate steps, varied cooking methods
   - "hard": Advanced techniques, complex steps, specialized equipment/ingredients, multiple cooking methods`
    : ""
}
${
  options.fitnessGoal
    ? `10. FITNESS GOAL: All recipes must support "${options.fitnessGoal}":
   - "muscle_gain": High protein content, adequate calories, nutrient-dense, recovery-supporting
   - "weight_loss": Lower calories, high fiber, satiating, nutrient-dense with fewer calories
   - "maintenance": Balanced macros, moderate calories, sustainable long-term
   - Adjust macro ratios and portion sizes accordingly`
    : ""
}
${options.dietaryRestrictions?.length ? `11. DIETARY RESTRICTIONS: Recipes MUST comply with ALL listed restrictions: ${options.dietaryRestrictions.join(", ")}. Check every ingredient against these restrictions.` : ""}
${options.mealTypes?.length ? `12. MEAL TYPES: Each recipe's mealTypes array MUST include at least one of: ${options.mealTypes.join(", ")}. Recipes for the wrong meal type will be rejected.` : ""}

VALIDATION CHECKLIST - Before submitting each recipe, verify:
- [ ] All ingredients counted (including spices/oils) ≤ maxIngredients (${options.maxIngredients || "N/A"})
- [ ] Total time (prep + cook) ≤ maxPrepTime (${options.maxPrepTime || "N/A"} minutes)
- [ ] Calories ≤ maxCalories (${options.maxCalories || "N/A"} calories)
- [ ] Protein within range: ${options.minProtein || 0}g - ${options.maxProtein || "∞"}g
- [ ] Carbs within range: ${options.minCarbs || 0}g - ${options.maxCarbs || "∞"}g
- [ ] Fat within range: ${options.minFat || 0}g - ${options.maxFat || "∞"}g
- [ ] Primary ingredient is "${(() => {
    const focusIng = options.focusIngredient || options.mainIngredient;
    if (focusIng) {
      const parts = focusIng
        .split(",")
        .map((ing) => ing.trim())
        .filter((ing) => ing.length > 0);
      return parts[0] || focusIng;
    }
    return "N/A";
  })()}"${
    options.focusIngredient && options.focusIngredient.includes(",")
      ? ` (with secondary: ${options.focusIngredient
          .split(",")
          .slice(1)
          .map((ing) => ing.trim())
          .join(", ")})`
      : ""
  }
- [ ] mainIngredientTags is an array of SEPARATE strings (e.g., ["Salmon", "Beef"]), NOT ["salmon, beef"]
- [ ] Meal types include: ${options.mealTypes?.join(", ") || "N/A"}
- [ ] Dietary restrictions met: ${options.dietaryRestrictions?.join(", ") || "N/A"}
- [ ] Difficulty level matches: ${options.difficultyLevel || "N/A"}

OUTPUT FORMAT - REQUIRED:
Respond with a single JSON object containing a 'recipes' array: { "recipes": [...] }.
Each recipe object in the array MUST be complete and strictly follow this TypeScript interface:

interface GeneratedRecipe {
  name: string;                    // Descriptive recipe name (e.g., "Lemon Herb Chicken with Quinoa")
  description: string;              // 1-2 sentence description highlighting key features
  mealTypes: string[];             // Array matching user's mealTypes requirement (e.g., ["Lunch", "Dinner"])
  dietaryTags: string[];           // Array matching dietary restrictions (e.g., ["High-Protein", "Gluten-Free"])
  mainIngredientTags: string[];    // Array where EACH ingredient is a SEPARATE string element. If focusIngredient is "salmon, beef", use ["Salmon", "Beef"], NOT ["salmon, beef"]. FIRST element MUST be the primary focusIngredient.
  ingredients: { name: string; amount: number; unit: string }[];  // Array with EXACTLY ${options.maxIngredients || "the specified"} or fewer items
  instructions: string;             // Detailed, numbered, step-by-step instructions
  prepTimeMinutes: number;          // Must satisfy: prepTimeMinutes + cookTimeMinutes ≤ ${options.maxPrepTime || "N/A"} minutes
  cookTimeMinutes: number;          // Must satisfy: prepTimeMinutes + cookTimeMinutes ≤ ${options.maxPrepTime || "N/A"} minutes
  servings: number;                 // Typically 1-4 servings
  estimatedNutrition: {
    calories: number;               // Must be ≤ ${options.maxCalories || "N/A"} calories
    protein: number;                // Must be between ${options.minProtein || 0}g and ${options.maxProtein || "∞"}g
    carbs: number;                  // Must be between ${options.minCarbs || 0}g and ${options.maxCarbs || "∞"}g
    fat: number;                    // Must be between ${options.minFat || 0}g and ${options.maxFat || "∞"}g
  };
  imageUrl: string;                 // Always set to empty string: ""
}

CRITICAL VALIDATION RULES:
- ingredients array length MUST equal or be less than ${options.maxIngredients || "the maxIngredients limit"}
- prepTimeMinutes + cookTimeMinutes MUST equal or be less than ${options.maxPrepTime || "the maxPrepTime limit"} minutes
- estimatedNutrition.calories MUST equal or be less than ${options.maxCalories || "the maxCalories limit"}
- estimatedNutrition.protein MUST be between ${options.minProtein || 0}g and ${options.maxProtein || "∞"}g
- estimatedNutrition.carbs MUST be between ${options.minCarbs || 0}g and ${options.maxCarbs || "∞"}g
- estimatedNutrition.fat MUST be between ${options.minFat || 0}g and ${options.maxFat || "∞"}g
- mainIngredientTags MUST be an array of SEPARATE strings. If focusIngredient is "salmon, beef", use ["Salmon", "Beef"], NOT ["salmon, beef"]. mainIngredientTags[0] MUST be "${(() => {
    const focusIng = options.focusIngredient || options.mainIngredient;
    if (focusIng) {
      const parts = focusIng
        .split(",")
        .map((ing) => ing.trim())
        .filter((ing) => ing.length > 0);
      return parts[0] || focusIng;
    }
    return "the primary ingredient";
  })()}"
- mealTypes MUST include at least one of: ${options.mealTypes?.join(", ") || "the specified meal types"}
- dietaryTags MUST include: ${options.dietaryRestrictions?.join(", ") || "the specified dietary tags"}

Ensure the final JSON is perfectly valid and complete. Do not omit any fields. Recipes that don't meet ALL constraints will be automatically rejected.`;

  const contextLines = [];
  if (options.naturalLanguagePrompt) {
    contextLines.push(`User requirements: "${options.naturalLanguagePrompt}"`);
  }

  // Handle recipePreferences - remove conflicting ingredient mentions if focusIngredient is set
  if (options.recipePreferences) {
    let preferences = options.recipePreferences;

    // If focusIngredient is set, prioritize it and remove conflicting ingredient mentions from preferences
    if (options.focusIngredient) {
      // Parse comma-separated focusIngredient into array (e.g., "salmon, beef" -> ["salmon", "beef"])
      const focusIngredients = options.focusIngredient
        .split(",")
        .map((ing) => ing.trim().toLowerCase())
        .filter((ing) => ing.length > 0);

      const ingredientKeywords = [
        "chicken",
        "beef",
        "fish",
        "salmon",
        "tofu",
        "eggs",
        "pork",
        "turkey",
        "shrimp",
        "vegetables",
        "vegetable",
        "seafood",
      ];

      // Remove conflicting ingredient mentions but keep other preferences
      // Only remove keywords that are NOT in the focusIngredients array
      ingredientKeywords.forEach((keyword) => {
        const isInFocusIngredients = focusIngredients.some(
          (fi) => fi.includes(keyword) || keyword.includes(fi),
        );

        if (
          !isInFocusIngredients &&
          preferences.toLowerCase().includes(keyword)
        ) {
          // Remove conflicting ingredient mentions
          const regex = new RegExp(
            `\\b(include\\s+)?(fish\\s+)?${keyword}[\\s,]*`,
            "gi",
          );
          preferences = preferences.replace(regex, "").trim();
        }
      });

      // Clean up any leftover artifacts (extra commas, "only", etc.)
      preferences = preferences
        .replace(/\s*,\s*,/g, ",")
        .replace(/,\s*only/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (preferences.length > 0) {
        contextLines.push(`Recipe preferences: ${preferences}`);
      }
    } else {
      contextLines.push(`Recipe preferences: ${options.recipePreferences}`);
    }
  }

  if (options.mealTypes?.length) {
    contextLines.push(`Meal types: ${options.mealTypes.join(", ")}`);
  }
  if (options.dietaryRestrictions?.length) {
    contextLines.push(
      `Dietary restrictions/tags: ${options.dietaryRestrictions.join(", ")}`,
    );
  }
  if (options.fitnessGoal) {
    contextLines.push(`Fitness goal: ${options.fitnessGoal}`);
  }
  if (options.targetCalories) {
    contextLines.push(`Target calories per recipe: ~${options.targetCalories}`);
  }
  if (options.maxCalories) {
    contextLines.push(`Maximum calories per recipe: ${options.maxCalories}`);
  }

  // PRIORITY: focusIngredient takes precedence over recipePreferences
  if (options.focusIngredient) {
    // Parse comma-separated ingredients
    const focusIngredients = options.focusIngredient
      .split(",")
      .map((ing) => ing.trim())
      .filter((ing) => ing.length > 0);

    if (focusIngredients.length === 1) {
      contextLines.push(
        `PRIMARY INGREDIENT (REQUIRED - OVERRIDES ALL OTHER INGREDIENT REQUIREMENTS): "${focusIngredients[0]}" - This MUST be the main ingredient in each recipe.`,
      );
    } else if (focusIngredients.length > 1) {
      // Multiple ingredients: use the first as primary, others as secondary
      contextLines.push(
        `PRIMARY INGREDIENT (REQUIRED): "${focusIngredients[0]}" MUST be the main ingredient in each recipe.`,
      );
      contextLines.push(
        `SECONDARY INGREDIENTS (PREFERRED): "${focusIngredients.slice(1).join('", "')}" should also be included as primary ingredients when possible.`,
      );
      contextLines.push(
        `IMPORTANT: If multiple ingredients are listed, create recipes that feature "${focusIngredients[0]}" as the main ingredient, and incorporate "${focusIngredients.slice(1).join('", "')}" as secondary primary ingredients.`,
      );
    }
  } else if (options.mainIngredient) {
    const mainIngredients = options.mainIngredient
      .split(",")
      .map((ing) => ing.trim())
      .filter((ing) => ing.length > 0);
    if (mainIngredients.length === 1) {
      contextLines.push(`Main ingredient focus: ${mainIngredients[0]}`);
    } else {
      contextLines.push(
        `Main ingredients focus: ${mainIngredients.join(", ")} (primary: ${mainIngredients[0]})`,
      );
    }
  }
  if (options.difficultyLevel) {
    contextLines.push(`Difficulty level: ${options.difficultyLevel}`);
  }
  if (options.maxPrepTime) {
    contextLines.push(`Maximum prep time: ${options.maxPrepTime} minutes`);
  }
  if (options.maxIngredients) {
    contextLines.push(
      `Maximum ingredients per recipe: ${options.maxIngredients} (including all spices, oils, and seasonings)`,
    );
  }

  // Macro nutrient constraints
  const macroConstraints = [];
  if (options.minProtein || options.maxProtein) {
    const proteinRange = `${options.minProtein || 0}g - ${options.maxProtein || "∞"}g protein`;
    macroConstraints.push(proteinRange);
  }
  if (options.minCarbs || options.maxCarbs) {
    const carbRange = `${options.minCarbs || 0}g - ${options.maxCarbs || "∞"}g carbs`;
    macroConstraints.push(carbRange);
  }
  if (options.minFat || options.maxFat) {
    const fatRange = `${options.minFat || 0}g - ${options.maxFat || "∞"}g fat`;
    macroConstraints.push(fatRange);
  }
  if (macroConstraints.length > 0) {
    contextLines.push(
      `Macro nutrient targets per recipe: ${macroConstraints.join(", ")}`,
    );
  }

  const userPrompt = `Generate ${count} recipe${count > 1 ? "s" : ""} that EXACTLY match the following requirements:

${contextLines.length > 0 ? "SPECIFICATIONS:\n" + contextLines.join("\n") : "No specific requirements - create diverse, healthy recipes."}

MANDATORY CONSTRAINTS (NON-NEGOTIABLE - RECIPES THAT VIOLATE THESE WILL BE REJECTED):
${
  options.focusIngredient
    ? (() => {
        const focusIngredients = options.focusIngredient
          .split(",")
          .map((ing) => ing.trim())
          .filter((ing) => ing.length > 0);
        if (focusIngredients.length === 1) {
          return `✓ PRIMARY INGREDIENT: "${focusIngredients[0]}" MUST be the main ingredient. This overrides any conflicting ingredient mentions in preferences.`;
        } else {
          return `✓ PRIMARY INGREDIENT: "${focusIngredients[0]}" MUST be the main ingredient. SECONDARY INGREDIENTS: "${focusIngredients.slice(1).join('", "')}" should also be included as primary ingredients. mainIngredientTags MUST be ["${focusIngredients[0]}", "${focusIngredients.slice(1).join('", "')}"] (separate strings), NOT a single comma-separated string.`;
        }
      })()
    : ""
}
${options.maxIngredients ? `✓ INGREDIENT COUNT: Maximum ${options.maxIngredients} ingredients TOTAL (count EVERY item: proteins, vegetables, spices, oils, salt, pepper, herbs, seasonings, condiments). Example: If maxIngredients=10, using 11 ingredients is INVALID.` : ""}
${options.maxCalories ? `✓ CALORIE LIMIT: Maximum ${options.maxCalories} calories per recipe. Calculate accurately: protein (4 cal/g) + carbs (4 cal/g) + fat (9 cal/g) = total calories.` : ""}
${options.targetCalories ? `✓ CALORIE TARGET: Aim for ${options.targetCalories} calories (±10% acceptable: ${Math.round(options.targetCalories * 0.9)}-${options.maxCalories ? Math.min(Math.round(options.targetCalories * 1.1), options.maxCalories) : Math.round(options.targetCalories * 1.1)} calories).` : ""}
${options.maxPrepTime ? `✓ TIME LIMIT: prepTimeMinutes + cookTimeMinutes MUST total ${options.maxPrepTime} minutes or LESS. Calculate: if prepTimeMinutes=5 and cookTimeMinutes=12, total=17 minutes (${17 <= (options.maxPrepTime || 999) ? "VALID" : "INVALID"}).` : ""}
${options.minProtein || options.maxProtein ? `✓ PROTEIN RANGE: ${options.minProtein || 0}g - ${options.maxProtein || "∞"}g protein per recipe. Values outside this range are INVALID.` : ""}
${options.minCarbs || options.maxCarbs ? `✓ CARBS RANGE: ${options.minCarbs || 0}g - ${options.maxCarbs || "∞"}g carbs per recipe. Values outside this range are INVALID.` : ""}
${options.minFat || options.maxFat ? `✓ FAT RANGE: ${options.minFat || 0}g - ${options.maxFat || "∞"}g fat per recipe. Values outside this range are INVALID.` : ""}
${options.difficultyLevel ? `✓ DIFFICULTY: Recipes must match "${options.difficultyLevel}" complexity level - adjust techniques, steps, and methods accordingly.` : ""}
${options.fitnessGoal ? `✓ FITNESS GOAL: All recipes must support "${options.fitnessGoal}" - adjust macro ratios and portion sizes accordingly.` : ""}
${options.dietaryRestrictions?.length ? `✓ DIETARY COMPLIANCE: ALL recipes MUST comply with: ${options.dietaryRestrictions.join(", ")}. Verify every ingredient.` : ""}
${options.mealTypes?.length ? `✓ MEAL TYPES: Each recipe's mealTypes array MUST include at least one of: ${options.mealTypes.join(", ")}.` : ""}

QUALITY REQUIREMENTS:
- Recipes must be practical, achievable, and use commonly available ingredients
- Instructions must be clear, step-by-step, and executable
- Nutritional values must be realistic and accurate
- Recipe names should be descriptive and appetizing
- Descriptions should highlight key features (protein content, preparation time, etc.)

VALIDATION BEFORE SUBMISSION:
Before including each recipe in your response, verify:
1. All numeric constraints are met (ingredients, time, calories, macros)
2. Primary ingredient matches "${(() => {
    const focusIng = options.focusIngredient || options.mainIngredient;
    if (focusIng) {
      const parts = focusIng
        .split(",")
        .map((ing) => ing.trim())
        .filter((ing) => ing.length > 0);
      return parts[0] || focusIng;
    }
    return "specifications";
  })()}"${
    options.focusIngredient && options.focusIngredient.includes(",")
      ? ` (and secondary ingredients "${options.focusIngredient
          .split(",")
          .slice(1)
          .map((ing) => ing.trim())
          .join('", "')}" are included)`
      : ""
  }
3. mainIngredientTags is an array of SEPARATE strings (e.g., ["Salmon", "Beef"]), NOT a comma-separated string (e.g., ["salmon, beef"])
4. All dietary restrictions are respected
5. Meal types are correct
6. Difficulty level is appropriate
7. All fields in the interface are populated

If a recipe cannot meet ALL constraints simultaneously, do NOT include it. Only submit recipes that pass all validations.

Respond with { "recipes": [ ... ] }`;

  try {
    console.log(`[generateRecipeBatchSingle] About to call OpenAI API...`);
    console.log(
      `[generateRecipeBatchSingle] System prompt length: ${systemPrompt.length}`,
    );
    console.log(
      `[generateRecipeBatchSingle] User prompt length: ${userPrompt.length}`,
    );
    console.log(`[generateRecipeBatchSingle] Applied constraints:`, {
      focusIngredient: options.focusIngredient || "none",
      difficultyLevel: options.difficultyLevel || "none",
      recipePreferences: options.recipePreferences || "none",
      maxIngredients: options.maxIngredients || "none",
      maxPrepTime: options.maxPrepTime || "none",
      maxCalories: options.maxCalories || "none",
      dietaryRestrictions: options.dietaryRestrictions?.join(", ") || "none",
      mealTypes: options.mealTypes?.join(", ") || "none",
      fitnessGoal: options.fitnessGoal || "none",
      proteinRange:
        options.minProtein || options.maxProtein
          ? `${options.minProtein || 0}-${options.maxProtein || "∞"}g`
          : "none",
      carbsRange:
        options.minCarbs || options.maxCarbs
          ? `${options.minCarbs || 0}-${options.maxCarbs || "∞"}g`
          : "none",
      fatRange:
        options.minFat || options.maxFat
          ? `${options.minFat || 0}-${options.maxFat || "∞"}g`
          : "none",
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    console.log(
      `[generateRecipeBatchSingle] OpenAI API call completed successfully`,
    );

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    console.log(
      `[generateRecipeBatchSingle] Raw content length: ${content.length} characters`,
    );
    console.log(
      `[generateRecipeBatchSingle] First 500 chars of content:`,
      content.substring(0, 500),
    );

    // Use the robust JSON parser
    const parsedJson = parsePartialJson(content);
    console.log(
      `[generateRecipeBatchSingle] Parsed JSON keys:`,
      Object.keys(parsedJson),
    );
    console.log(
      `[generateRecipeBatchSingle] parsedJson.recipes exists:`,
      !!parsedJson.recipes,
    );
    console.log(
      `[generateRecipeBatchSingle] parsedJson.recipes type:`,
      typeof parsedJson.recipes,
    );
    console.log(
      `[generateRecipeBatchSingle] parsedJson.recipes length:`,
      parsedJson.recipes?.length,
    );

    // Extract recipes array, which might be at the top level or nested
    const recipes =
      parsedJson.recipes || (Array.isArray(parsedJson) ? parsedJson : []);
    console.log(
      `[generateRecipeBatchSingle] Extracted recipes array length:`,
      recipes.length,
    );

    if (!Array.isArray(recipes) || recipes.length === 0) {
      console.error(
        "Parsed content that was not a valid recipe array:",
        recipes,
      );
      throw new Error("Invalid or empty recipe array received from OpenAI.");
    }

    // Full validation on each recipe object
    const validRecipes: GeneratedRecipe[] = [];
    const invalidRecipes: any[] = [];

    for (const r of recipes) {
      console.log(`[generateRecipeBatchSingle] Validating recipe:`, {
        hasName: !!r?.name,
        hasIngredients: !!r?.ingredients,
        hasInstructions: !!r?.instructions,
        hasNutrition: !!r?.estimatedNutrition,
        recipeName: r?.name,
      });

      if (
        r &&
        r.name &&
        r.ingredients &&
        r.instructions &&
        r.estimatedNutrition
        // imageUrl is optional - added later by image generation service
      ) {
        validRecipes.push(r as GeneratedRecipe);
        console.log(
          `[generateRecipeBatchSingle] ✅ Recipe "${r.name}" passed validation`,
        );
      } else {
        invalidRecipes.push(r);
        console.warn(
          `[generateRecipeBatchSingle] ❌ Recipe failed validation:`,
          JSON.stringify(r, null, 2),
        );
      }
    }

    console.log(
      `[generateRecipeBatchSingle] Validation complete: ${validRecipes.length} valid, ${invalidRecipes.length} invalid`,
    );

    if (invalidRecipes.length > 0) {
      console.warn(
        `Filtered out ${invalidRecipes.length} invalid recipe objects.`,
      );
      // Log only the first invalid object to avoid flooding logs
      console.debug(
        "Example invalid recipe:",
        JSON.stringify(invalidRecipes[0], null, 2),
      );
    }

    console.log(
      `[generateRecipeBatchSingle] Returning ${validRecipes.length} valid recipes`,
    );
    return validRecipes;
  } catch (error) {
    console.error("Full error in generateRecipeBatch:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    // Log the failing content for debugging
    if (error instanceof Error && error.message.includes("JSON")) {
      // The content is likely logged in parsePartialJson
    }
    throw new Error(`Failed to generate recipe batch: ${errorMessage}`);
  }
}

export async function generateImageForRecipe(
  recipe: GeneratedRecipe,
): Promise<string> {
  const imagePrompt = `
    Generate an ultra-realistic, high-resolution photograph of "${recipe.name}", a ${recipe.mealTypes[0].toLowerCase()} dish.
    It features: ${recipe.description}.
    Present it artfully plated on a clean white ceramic plate set atop a rustic wooden table.
    Illuminate the scene with soft, natural side lighting to bring out the textures and vibrant colors of the ingredients.
    Use a shallow depth of field (aperture f/2.8) and a 45° camera angle for a professional, editorial look.
    Add subtle garnishes and minimal props (e.g., fresh herbs, linen napkin) to enhance context without clutter.
    The final image should be bright, mouthwatering, and ready for a premium fitness-focused recipe website.
    Style: photorealistic.
  `;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "hd",
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("No image data received from OpenAI");
  }

  const imageUrl = response.data[0].url;
  if (!imageUrl) {
    throw new Error("No image URL received from OpenAI");
  }

  // In a real application, you would upload this to your own cloud storage
  return imageUrl;
}

// Alias for backwards compatibility with routes
export const parseNaturalLanguageMealPlan = parseNaturalLanguageForMealPlan;

export async function parseNaturalLanguageForMealPlan(
  naturalLanguageInput: string,
): Promise<Partial<MealPlanGeneration>> {
  const systemPrompt = `
You are an intelligent assistant for a meal planning application.
A user has provided a natural language request to create a meal plan.
Your task is to parse this request and extract the key parameters into a structured JSON object.
The JSON object must strictly adhere to the following Zod schema:
${JSON.stringify(mealPlanGenerationSchema.shape, null, 2)}

- Infer the values from the user's text.
- If a value isn't mentioned, omit the key from the JSON object.
- Be smart about interpreting flexible language (e.g., "for a week" means 7 days).
- For 'fitnessGoal', choose from common goals like 'weight loss', 'muscle gain', 'maintenance', 'athletic performance'.
- The output MUST be a single, valid JSON object. Do not include any other text or explanations.
`;

  const userPrompt = `Parse the following meal plan request: "${naturalLanguageInput}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const parsedJson = parsePartialJson(content);

    // No need to validate against the full schema here,
    // the frontend form and its resolver will do that.
    // We are just extracting what the AI could find.
    return parsedJson as Partial<MealPlanGeneration>;
  } catch (error) {
    console.error("Full error in parseNaturalLanguageForMealPlan:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(
      `Failed to parse natural language for meal plan: ${errorMessage}`,
    );
  }
}

// Additional function for parsing recipe requirements
export async function parseNaturalLanguageRecipeRequirements(
  naturalLanguageInput: string,
): Promise<any> {
  const systemPrompt = `
You are an intelligent assistant for a recipe management application.
A user has provided a natural language request to create or find recipes.
Your task is to parse this request and extract the key parameters into a structured JSON object.

IMPORTANT DISTINCTIONS:
- fitnessGoal: ONLY for fitness objectives like "muscle gain", "weight loss", "maintenance", "endurance", "general health"
- dietaryTags: For ALL diet types, restrictions, and dietary patterns including:
  * Diet types: "vegetarian", "vegan", "keto", "paleo", "pescatarian", "mediterranean"
  * Dietary patterns: "high_carb", "low_carb", "high_protein", "low fat", "high fat"
  * Restrictions: "gluten_free", "dairy_free", "nut_free", "sugar_free"
  * Any mention of "diet" (carb diet, keto diet, etc.) should go in dietaryTags, NOT fitnessGoal

CONTEXT-AWARE PARSING FOR "CARB DIET":
- When user says "carb diet" + mentions "muscle", "build", "gain", "trainer" → use "high_carb" (muscle building needs carbs for energy)
- When user says "carb diet" + mentions "weight loss", "lose weight" → use "low_carb" (weight loss typically uses low carb)
- When user says "carb diet" alone → default to "high_carb" (fitness context usually means higher carbs)
- Always analyze the FULL sentence context to determine the correct dietary tag

The JSON object should include these fields when mentioned in the input:
- count: number (how many recipes to generate, e.g., 10, 15, 30)
- mealTypes: array of strings (e.g., ["breakfast", "lunch", "dinner", "snack"])
- dietaryTags: array of strings - ALL diet types, restrictions, and dietary patterns (e.g., ["vegetarian", "gluten-free", "keto", "high carb", "carb diet", "low carb", "high protein"])
- mainIngredientTags: array of strings (e.g., ["chicken", "beef", "tofu", "fish", "eggs"])
- focusIngredient: string (primary ingredient to feature, e.g., "eggs", "Greek yogurt", "chicken breast")
- maxPrepTime: number (maximum preparation time in minutes)
- minCalories: number (minimum calories per serving)
- maxCalories: number (maximum calories per serving)
- minProtein: number (minimum protein in grams)
- maxProtein: number (maximum protein in grams)
- minCarbs: number (minimum carbohydrates in grams)
- maxCarbs: number (maximum carbohydrates in grams)
- minFat: number (minimum fat in grams)
- maxFat: number (maximum fat in grams)
- difficulty: string (e.g., "easy", "medium", "hard")
- fitnessGoal: string - ONLY for fitness objectives (e.g., "muscle gain", "weight loss", "maintenance", "endurance")
- description: string (any additional context or requirements)

Examples:
Input: "Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet, with 400-600 calories"
Output: {"count": 15, "mealTypes": ["breakfast"], "dietaryTags": ["keto", "high protein"], "maxPrepTime": 20, "focusIngredient": "eggs, Greek yogurt", "minCalories": 400, "maxCalories": 600, "minProtein": 40}

Input: "Create 10 easy vegetarian dinner recipes with 500-700 calories and at least 25g protein"
Output: {"count": 10, "mealTypes": ["dinner"], "dietaryTags": ["vegetarian"], "difficulty": "easy", "minCalories": 500, "maxCalories": 700, "minProtein": 25}

Input: "generate 3 recipes for carb diet trainer with salmon and beef"
Output: {"count": 3, "dietaryTags": ["high_carb"], "mainIngredientTags": ["salmon", "beef"]}

Input: "generate a non-chicken but salmon only and u can add little beef steak with mashed potatos max fat should be 25 grams but 12 g should be the minimum and i need a triple recipes for carb diet trainer and my goal is to build muscles"
Output: {"count": 3, "fitnessGoal": "muscle gain", "dietaryTags": ["high_carb"], "mainIngredientTags": ["salmon", "beef steak", "mashed potatoes"], "minFat": 12, "maxFat": 25}

Input: "10 recipes for weight loss with low carb diet"
Output: {"count": 10, "fitnessGoal": "weight loss", "dietaryTags": ["low_carb"]}

If a value isn't mentioned, omit the key from the JSON object.
The output MUST be a single, valid JSON object. Do not include any other text or explanations.
`;

  const userPrompt = `Parse the following recipe requirements: "${naturalLanguageInput}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const parsedJson = parsePartialJson(content);

    // Post-process to fix common misclassifications and normalize dietary tags
    // Move diet-related terms from fitnessGoal to dietaryTags
    const dietTerms = [
      "carb diet",
      "high carb",
      "low carb",
      "keto diet",
      "paleo diet",
      "vegetarian diet",
      "vegan diet",
      "mediterranean diet",
      "dash diet",
      "atkins diet",
      "south beach diet",
      "whole30",
      "carnivore diet",
    ];

    if (parsedJson.fitnessGoal) {
      const fitnessGoalLower = parsedJson.fitnessGoal.toLowerCase();
      const isDietTerm = dietTerms.some((term) =>
        fitnessGoalLower.includes(term),
      );

      if (isDietTerm) {
        // Move to dietaryTags
        if (!parsedJson.dietaryTags) {
          parsedJson.dietaryTags = [];
        }
        if (!Array.isArray(parsedJson.dietaryTags)) {
          parsedJson.dietaryTags = [parsedJson.dietaryTags];
        }

        // Add to dietaryTags (normalize the term)
        const normalizedDiet = fitnessGoalLower.includes("carb")
          ? "high carb"
          : fitnessGoalLower.includes("keto")
            ? "keto"
            : fitnessGoalLower.includes("paleo")
              ? "paleo"
              : fitnessGoalLower.includes("vegetarian")
                ? "vegetarian"
                : fitnessGoalLower.includes("vegan")
                  ? "vegan"
                  : parsedJson.fitnessGoal;

        if (!parsedJson.dietaryTags.includes(normalizedDiet)) {
          parsedJson.dietaryTags.push(normalizedDiet);
        }

        // Remove from fitnessGoal
        delete parsedJson.fitnessGoal;
      }
    }

    // Normalize dietary tags to match form values
    // Map common variations to form-compatible values
    const dietaryTagMap: Record<string, string> = {
      "high carb": "high_carb",
      "high-carb": "high_carb",
      "carb diet": "high_carb", // Default to high_carb for muscle building context
      "low carb": "low_carb",
      "low-carb": "low_carb",
      "high protein": "high_protein",
      "high-protein": "high_protein",
      "gluten-free": "gluten_free",
      "gluten free": "gluten_free",
      "dairy-free": "dairy_free",
      "dairy free": "dairy_free",
      "nut-free": "dairy_free", // Map nut-free to dairy_free as closest match
    };

    // Analyze context to determine if "carb diet" means high or low carb
    const inputLower = naturalLanguageInput.toLowerCase();
    const isMuscleBuilding =
      inputLower.includes("muscle") ||
      inputLower.includes("build") ||
      inputLower.includes("gain") ||
      inputLower.includes("trainer") ||
      parsedJson.fitnessGoal === "muscle gain";
    const isWeightLoss =
      inputLower.includes("weight loss") ||
      inputLower.includes("lose weight") ||
      parsedJson.fitnessGoal === "weight loss";

    if (parsedJson.dietaryTags && Array.isArray(parsedJson.dietaryTags)) {
      parsedJson.dietaryTags = parsedJson.dietaryTags.map((tag: string) => {
        const tagLower = tag.toLowerCase();

        // Special handling for "carb diet" based on context
        if (tagLower.includes("carb diet") || tagLower === "carb diet") {
          if (isWeightLoss) {
            return "low_carb";
          } else if (isMuscleBuilding) {
            return "high_carb";
          } else {
            // Default to high_carb for general fitness
            return "high_carb";
          }
        }

        // Map other variations
        return dietaryTagMap[tagLower] || tag;
      });
    }

    return parsedJson;
  } catch (error) {
    console.error(
      "Full error in parseNaturalLanguageRecipeRequirements:",
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(
      `Failed to parse natural language for recipe requirements: ${errorMessage}`,
    );
  }
}

// Alias for image generation (referenced in mealPlanGenerator but not implemented)
export const generateMealImage = generateImageForRecipe;
