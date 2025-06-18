import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-api-key"
});

export interface GeneratedRecipe {
  name: string;
  description: string;
  mealTypes: string[];
  dietaryTags: string[];
  mainIngredientTags: string[];
  ingredients: { name: string; amount: string; unit?: string }[];
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
}

export async function generateRecipe(options: {
  mealType?: string;
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
} = {}): Promise<GeneratedRecipe> {
  const prompt = `Generate a healthy, balanced recipe with the following requirements:
${options.mealType ? `- Meal type: ${options.mealType}` : ''}
${options.dietaryRestrictions?.length ? `- Dietary restrictions: ${options.dietaryRestrictions.join(', ')}` : ''}
${options.targetCalories ? `- Target calories: around ${options.targetCalories} per serving` : ''}
${options.mainIngredient ? `- Must include: ${options.mainIngredient}` : ''}

Please respond with a JSON object containing:
{
  "name": "Recipe name",
  "description": "Brief description",
  "mealTypes": ["breakfast", "lunch", "dinner", or "snack"],
  "dietaryTags": ["vegetarian", "vegan", "keto", "paleo", "gluten-free", etc.],
  "mainIngredientTags": ["chicken", "salmon", "beef", "vegetarian", etc.],
  "ingredients": [{"name": "ingredient name", "amount": "1 cup", "unit": "cup"}],
  "instructions": "Step-by-step cooking instructions",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 25,
  "servings": 2,
  "estimatedNutrition": {
    "calories": 400,
    "protein": 25,
    "carbs": 30,
    "fat": 15
  }
}

Make sure the recipe is realistic, nutritionally balanced, and follows fitness meal planning principles.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and chef specializing in fitness meal planning. Generate healthy, balanced recipes with accurate nutritional estimates."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const recipe = JSON.parse(content) as GeneratedRecipe;
    
    // Validate required fields
    if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
      throw new Error("Invalid recipe format received from OpenAI");
    }

    return recipe;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw new Error(`Failed to generate recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateRecipeBatch(count: number = 10, options: {
  mealTypes?: string[];
  dietaryRestrictions?: string[];
} = {}): Promise<GeneratedRecipe[]> {
  const recipes: GeneratedRecipe[] = [];
  const mealTypes = options.mealTypes || ['breakfast', 'lunch', 'dinner', 'snack'];
  const dietaryOptions = options.dietaryRestrictions || ['vegetarian', 'keto', 'paleo', 'gluten-free', ''];

  console.log(`Generating ${count} recipes...`);

  for (let i = 0; i < count; i++) {
    try {
      const mealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
      const dietary = dietaryOptions[Math.floor(Math.random() * dietaryOptions.length)];
      const targetCalories = 200 + Math.floor(Math.random() * 600); // 200-800 calories
      
      const recipe = await generateRecipe({
        mealType,
        dietaryRestrictions: dietary ? [dietary] : [],
        targetCalories,
      });

      recipes.push(recipe);
      console.log(`Generated recipe ${i + 1}/${count}: ${recipe.name}`);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to generate recipe ${i + 1}:`, error);
      // Continue with next recipe on error
    }
  }

  return recipes;
}
