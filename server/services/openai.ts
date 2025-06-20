/**
 * OpenAI Integration Service
 * 
 * This service handles all AI-powered functionality in FitMeal Pro using OpenAI's GPT models.
 * It provides recipe generation, natural language meal plan parsing, and AI-generated
 * recipe images to enhance the user experience.
 * 
 * Key Features:
 * - Intelligent recipe generation with nutritional constraints
 * - Natural language meal plan parsing and form population
 * - AI-generated recipe images using DALL-E
 * - Batch recipe generation for database seeding
 * - Comprehensive error handling and fallbacks
 */

import OpenAI from "openai";

// Using GPT-4o for optimal performance and accuracy
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-api-key"
});

/**
 * Generated Recipe Interface
 * 
 * Defines the structure of AI-generated recipes before they're stored in the database.
 * This interface ensures consistency between OpenAI responses and our database schema.
 */
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
  // Define diverse image styles for maximum uniqueness
  const imageStyles = [
    "clean minimalist photography with stark white background",
    "rustic farmhouse food styling with weathered wood textures",
    "modern culinary presentation with geometric plating",
    "artisanal food photography with natural lighting and shadows",
    "professional kitchen styling with marble surfaces",
    "bright airy photography with soft pastel backgrounds",
    "dramatic food styling with dark moody lighting",
    "Mediterranean-inspired presentation with ceramic bowls",
    "Scandinavian minimalist styling with light oak surfaces",
    "contemporary fine dining presentation with artistic garnishes"
  ];

  // Define unique plating and presentation elements
  const platingStyles = [
    "elegantly arranged in a white ceramic bowl",
    "artfully plated on a slate serving board",
    "beautifully presented in a cast iron skillet",
    "carefully composed on a bamboo cutting board",
    "thoughtfully arranged on a marble serving plate",
    "stylishly displayed in a glass serving dish",
    "creatively plated on a wooden serving tray",
    "perfectly arranged on a vintage ceramic plate",
    "tastefully presented in a modern square dish",
    "aesthetically composed on a natural stone plate"
  ];

  // Define varied camera angles and compositions
  const compositions = [
    "overhead flat lay composition at 90 degrees",
    "45-degree angle with shallow depth of field",
    "close-up macro shot focusing on textures",
    "three-quarter view with dramatic side lighting",
    "eye-level perspective with blurred background",
    "slightly elevated angle showing depth and layers",
    "diagonal composition with dynamic visual flow",
    "centered composition with symmetrical balance"
  ];

  // Select random elements for maximum uniqueness
  const imageStyle = imageStyles[Math.floor(Math.random() * imageStyles.length)];
  const platingStyle = platingStyles[Math.floor(Math.random() * platingStyles.length)];
  const composition = compositions[Math.floor(Math.random() * compositions.length)];
  
  // Generate unique timestamp-based variation
  const uniqueId = Date.now() % 1000;
  
  const imagePrompt = `Create a completely UNIQUE and visually distinct photograph of "${recipe.name}" (variation #${uniqueId}). This ${recipe.mealTypes[0]?.toLowerCase() || 'meal'} dish features: ${recipe.description}. 

VISUAL REQUIREMENTS FOR UNIQUENESS:
- ${platingStyle}
- Photography style: ${imageStyle}
- Camera composition: ${composition}
- Specific to this dish's ingredients and colors described in: "${recipe.description}"
- Must look distinctly different from other food photographs
- Focus on the unique characteristics and textures of THIS specific meal
- Use lighting and styling that emphasizes the meal's individual components
- Include props and garnishes that complement this particular dish's flavor profile

TECHNICAL SPECIFICATIONS:
- Ultra-high resolution, professional food photography
- Perfect lighting to showcase ingredient textures and colors
- Sharp focus on the main dish with appropriate depth of field
- Food styling that makes this specific meal look appetizing and fresh
- Color palette that enhances the natural colors of the ingredients
- Composition that tells the story of this particular recipe

The final image must be completely unique, instantly recognizable as THIS specific dish, and unlike any other food photograph. Make it magazine-quality and irresistibly appetizing.`;

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
