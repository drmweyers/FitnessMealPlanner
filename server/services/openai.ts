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
      jsonString.lastIndexOf('}'), 
      jsonString.lastIndexOf(']')
    );

    if (lastValidJsonEnd === -1) {
      throw new Error("No valid JSON structures found in the response.");
    }
    
    // Trim to the last complete structure
    let potentialJson = jsonString.substring(0, lastValidJsonEnd + 1);

    // If it's a list of objects, it needs to be closed with a ']'
    if (potentialJson.lastIndexOf('[') > potentialJson.lastIndexOf('{')) {
       // It's likely an unclosed array
       if (potentialJson.endsWith(',')) {
         potentialJson = potentialJson.slice(0, -1); // remove trailing comma
       }
       potentialJson += ']';
    }
    
    // If the top-level is an object, find its opening and closing
    const jsonStart = potentialJson.indexOf('{');
    const jsonEnd = potentialJson.lastIndexOf('}');
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
  options: GenerateOptions = {}
): Promise<GeneratedRecipe[]> {
  if (count > OPTIMAL_CHUNK_SIZE) {
    console.log(`Large batch detected (${count} recipes). Splitting into chunks of ${OPTIMAL_CHUNK_SIZE}...`);
    return await generateRecipeBatchChunked(count, options);
  }
  return await generateRecipeBatchSingle(count, options);
}

/**
 * Process large batches by splitting into optimal chunks
 */
async function generateRecipeBatchChunked(
  totalCount: number,
  options: GenerateOptions
): Promise<GeneratedRecipe[]> {
  const allRecipes: GeneratedRecipe[] = [];
  const chunks = Math.ceil(totalCount / OPTIMAL_CHUNK_SIZE);

  for (let i = 0; i < chunks; i++) {
    const chunkSize = Math.min(OPTIMAL_CHUNK_SIZE, totalCount - allRecipes.length);
    console.log(`📦 Generating chunk ${i + 1}/${chunks} (${chunkSize} recipes)...`);

    const chunkRecipes = await generateRecipeBatchSingle(chunkSize, options);
    allRecipes.push(...chunkRecipes);

    console.log(`✅ Chunk ${i + 1}/${chunks} complete. Progress: ${allRecipes.length}/${totalCount} recipes generated`);
  }

  console.log(`🎉 All ${totalCount} recipes generated successfully!`);
  return allRecipes;
}

/**
 * Generate a single batch of recipes (internal implementation)
 */
async function generateRecipeBatchSingle(
  count: number,
  options: GenerateOptions = {}
): Promise<GeneratedRecipe[]> {
  console.log(`[generateRecipeBatchSingle] CALLED with count=${count}, options=`, Object.keys(options));
  console.log(`[generateRecipeBatchSingle] OPENAI_API_KEY exists: ${!!process.env.OPENAI_API_KEY}`);

  const systemPrompt = `You are an expert nutritionist and professional chef.
Generate a batch of ${count} diverse and healthy recipes.
${options.fitnessGoal ? `Focus on recipes that support this fitness goal: ${options.fitnessGoal}.` : ''}
${options.targetCalories ? `Target approximately ${options.targetCalories} calories per recipe.` : ''}
${options.maxCalories ? `Ensure recipes do not exceed ${options.maxCalories} calories.` : ''}
${options.mainIngredient ? `Feature "${options.mainIngredient}" as a primary ingredient when possible.` : ''}
${options.maxPrepTime ? `Keep preparation time under ${options.maxPrepTime} minutes.` : ''}
IMPORTANT: Respond with a single JSON object containing a 'recipes' array: { "recipes": [...] }.
Each recipe object in the array MUST be complete and strictly follow this TypeScript interface:
interface GeneratedRecipe {
  name: string;
  description: string;
  mealTypes: string[]; // e.g., ["Breakfast", "Snack"]
  dietaryTags: string[]; // e.g., ["Gluten-Free", "Vegan"]
  mainIngredientTags: string[]; // e.g., ["Chicken", "Broccoli"]
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string; // Detailed, step-by-step instructions.
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  estimatedNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  imageUrl: string; // Set this to an empty string: ""
}
Ensure the final JSON is perfectly valid and complete. Do not omit any fields.`;

  const contextLines = [];
  if (options.naturalLanguagePrompt) {
    contextLines.push(`User requirements: "${options.naturalLanguagePrompt}"`);
  }
  if (options.mealTypes?.length) {
    contextLines.push(`Meal types: ${options.mealTypes.join(", ")}`);
  }
  if (options.dietaryRestrictions?.length) {
    contextLines.push(`Dietary restrictions: ${options.dietaryRestrictions.join(", ")}`);
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
  if (options.mainIngredient) {
    contextLines.push(`Main ingredient focus: ${options.mainIngredient}`);
  }
  if (options.maxPrepTime) {
    contextLines.push(`Maximum prep time: ${options.maxPrepTime} minutes`);
  }
  
  // Macro nutrient constraints
  const macroConstraints = [];
  if (options.minProtein || options.maxProtein) {
    const proteinRange = `${options.minProtein || 0}g - ${options.maxProtein || '∞'}g protein`;
    macroConstraints.push(proteinRange);
  }
  if (options.minCarbs || options.maxCarbs) {
    const carbRange = `${options.minCarbs || 0}g - ${options.maxCarbs || '∞'}g carbs`;
    macroConstraints.push(carbRange);
  }
  if (options.minFat || options.maxFat) {
    const fatRange = `${options.minFat || 0}g - ${options.maxFat || '∞'}g fat`;
    macroConstraints.push(fatRange);
  }
  if (macroConstraints.length > 0) {
    contextLines.push(`Macro nutrient targets per recipe: ${macroConstraints.join(", ")}`);
  }

  const userPrompt = `Generate ${count} recipes with the following specifications:
${contextLines.length > 0 ? contextLines.join('\n') : 'No specific requirements - create diverse, healthy recipes.'}

Respond with { "recipes": [ ... ] }`;

  try {
    console.log(`[generateRecipeBatchSingle] About to call OpenAI API...`);
    console.log(`[generateRecipeBatchSingle] System prompt length: ${systemPrompt.length}`);
    console.log(`[generateRecipeBatchSingle] User prompt length: ${userPrompt.length}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    console.log(`[generateRecipeBatchSingle] OpenAI API call completed successfully`);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    console.log(`[generateRecipeBatchSingle] Raw content length: ${content.length} characters`);
    console.log(`[generateRecipeBatchSingle] First 500 chars of content:`, content.substring(0, 500));

    // Use the robust JSON parser
    const parsedJson = parsePartialJson(content);
    console.log(`[generateRecipeBatchSingle] Parsed JSON keys:`, Object.keys(parsedJson));
    console.log(`[generateRecipeBatchSingle] parsedJson.recipes exists:`, !!parsedJson.recipes);
    console.log(`[generateRecipeBatchSingle] parsedJson.recipes type:`, typeof parsedJson.recipes);
    console.log(`[generateRecipeBatchSingle] parsedJson.recipes length:`, parsedJson.recipes?.length);

    // Extract recipes array, which might be at the top level or nested
    const recipes = parsedJson.recipes || (Array.isArray(parsedJson) ? parsedJson : []);
    console.log(`[generateRecipeBatchSingle] Extracted recipes array length:`, recipes.length);

    if (!Array.isArray(recipes) || recipes.length === 0) {
      console.error("Parsed content that was not a valid recipe array:", recipes);
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
        recipeName: r?.name
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
        console.log(`[generateRecipeBatchSingle] ✅ Recipe "${r.name}" passed validation`);
      } else {
        invalidRecipes.push(r);
        console.warn(`[generateRecipeBatchSingle] ❌ Recipe failed validation:`, JSON.stringify(r, null, 2));
      }
    }

    console.log(`[generateRecipeBatchSingle] Validation complete: ${validRecipes.length} valid, ${invalidRecipes.length} invalid`);

    if (invalidRecipes.length > 0) {
      console.warn(`Filtered out ${invalidRecipes.length} invalid recipe objects.`);
      // Log only the first invalid object to avoid flooding logs
      console.debug('Example invalid recipe:', JSON.stringify(invalidRecipes[0], null, 2));
    }

    console.log(`[generateRecipeBatchSingle] Returning ${validRecipes.length} valid recipes`);
    return validRecipes;

  } catch (error) {
    console.error("Full error in generateRecipeBatch:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // Log the failing content for debugging
    if (error instanceof Error && error.message.includes("JSON")) {
      // The content is likely logged in parsePartialJson
    }
    throw new Error(`Failed to generate recipe batch: ${errorMessage}`);
  }
}

export async function generateImageForRecipe(recipe: GeneratedRecipe): Promise<string> {
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
      model: "gpt-4o",
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
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to parse natural language for meal plan: ${errorMessage}`);
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

The JSON object should include these fields when mentioned in the input:
- count: number (how many recipes to generate, e.g., 10, 15, 30)
- mealTypes: array of strings (e.g., ["breakfast", "lunch", "dinner", "snack"])
- dietaryTags: array of strings (e.g., ["vegetarian", "gluten-free", "keto", "paleo", "dairy-free", "nut-free"])
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
- fitnessGoal: string (e.g., "muscle gain", "weight loss", "maintenance")
- description: string (any additional context or requirements)

Examples:
Input: "Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet, with 400-600 calories"
Output: {"count": 15, "mealTypes": ["breakfast"], "dietaryTags": ["keto"], "maxPrepTime": 20, "focusIngredient": "eggs, Greek yogurt", "minCalories": 400, "maxCalories": 600, "minProtein": 40}

Input: "Create 10 easy vegetarian dinner recipes with 500-700 calories and at least 25g protein"
Output: {"count": 10, "mealTypes": ["dinner"], "dietaryTags": ["vegetarian"], "difficulty": "easy", "minCalories": 500, "maxCalories": 700, "minProtein": 25}

If a value isn't mentioned, omit the key from the JSON object.
The output MUST be a single, valid JSON object. Do not include any other text or explanations.
`;

  const userPrompt = `Parse the following recipe requirements: "${naturalLanguageInput}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
    return parsedJson;

  } catch (error) {
    console.error("Full error in parseNaturalLanguageRecipeRequirements:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to parse natural language for recipe requirements: ${errorMessage}`);
  }
}

// Alias for image generation (referenced in mealPlanGenerator but not implemented)
export const generateMealImage = generateImageForRecipe;