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

export interface NaturalLanguageMealPlan {
  planName: string;
  fitnessGoal: string;
  description: string;
  dailyCalorieTarget: number;
  days: number;
  mealsPerDay: number;
  clientName?: string;
}

export async function parseNaturalLanguageMealPlan(naturalLanguageInput: string): Promise<NaturalLanguageMealPlan> {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const prompt = `Parse the following natural language meal plan request and extract structured information. Return a JSON object with the meal plan parameters.

Natural language input: "${naturalLanguageInput}"

Extract and return a JSON object with these fields:
{
  "planName": "A descriptive name for the meal plan",
  "fitnessGoal": "one of: weight_loss, muscle_gain, maintenance, athletic_performance, general_health, cutting, bulking",
  "description": "A detailed description based on the input",
  "dailyCalorieTarget": "estimated daily calorie target as a number (default 2000)",
  "days": "number of days for the plan (default 7)",
  "mealsPerDay": "number of meals per day (default 3)",
  "clientName": "client name if mentioned, otherwise empty string"
}

Guidelines:
- Infer fitness goals from context (e.g., "lose weight" = weight_loss, "build muscle" = muscle_gain)
- Set realistic calorie targets based on goals (weight loss: 1500-1800, muscle gain: 2200-2800, maintenance: 1800-2200)
- Default to 7 days and 3 meals per day unless specified
- Create descriptive plan names that reflect the goal and duration
- Include any dietary preferences, restrictions, or specific requirements in the description`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fitness nutrition expert that parses natural language meal plan requests into structured data. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure all required fields are present with defaults
    return {
      planName: result.planName || "Custom Meal Plan",
      fitnessGoal: result.fitnessGoal || "general_health",
      description: result.description || naturalLanguageInput,
      dailyCalorieTarget: result.dailyCalorieTarget || 2000,
      days: result.days || 7,
      mealsPerDay: result.mealsPerDay || 3,
      clientName: result.clientName || ""
    };
  } catch (error) {
    console.error("Error parsing natural language meal plan:", error);
    // Return sensible defaults on error
    return {
      planName: "Custom Meal Plan",
      fitnessGoal: "general_health",
      description: naturalLanguageInput,
      dailyCalorieTarget: 2000,
      days: 7,
      mealsPerDay: 3,
      clientName: ""
    };
  }
}

export async function generateMealImage(recipe: {
  name: string;
  description: string;
  mealTypes: string[];
}): Promise<string> {
  // Define image styles for variety
  const imageStyles = [
    "clean minimalist photography",
    "rustic food photography",
    "modern culinary presentation",
    "artisanal food styling",
    "professional kitchen photography"
  ];

  // Select a random style for uniqueness
  const imageStyle = imageStyles[Math.floor(Math.random() * imageStyles.length)];
  
  const imagePrompt = `Generate an ultra-realistic, high-resolution photograph of "${recipe.name}", a ${recipe.mealTypes[0]?.toLowerCase() || 'meal'} dish. It features ${recipe.description}. Present it artfully plated on a clean white ceramic plate set atop a rustic wooden table. Illuminate the scene with soft, natural side lighting to bring out the textures and vibrant colors of the ingredients. Use a shallow depth of field (aperture f/2.8) and a 45° camera angle for a professional, editorial look. Add subtle garnishes and minimal props (e.g., fresh herbs, linen napkin) to enhance context without clutter. The final image should be bright, mouthwatering, and ready for a premium fitness-focused recipe website. Style: ${imageStyle}.`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data received from OpenAI");
    }
    
    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL received from OpenAI");
    }

    return imageUrl;
  } catch (error) {
    console.error("Error generating meal image:", error);
    // Return a fallback placeholder image based on meal type
    const mealType = recipe.mealTypes[0]?.toLowerCase() || 'meal';
    const placeholders = {
      breakfast: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
      snack: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
    };
    
    return placeholders[mealType as keyof typeof placeholders] || placeholders.lunch;
  }
}
