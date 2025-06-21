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

export interface NaturalLanguageRecipeRequirements {
  count: number;
  mealType?: string;
  dietaryTag?: string;
  maxPrepTime?: number;
  maxCalories?: number;
  minCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
  focusIngredient?: string;
  difficulty?: string;
}

export async function parseNaturalLanguageRecipeRequirements(naturalLanguageInput: string): Promise<NaturalLanguageRecipeRequirements> {
  const prompt = `Parse the following natural language recipe generation request and extract structured information. Return a JSON object with the recipe generation parameters.

Natural language input: "${naturalLanguageInput}"

Extract and return a JSON object with these fields:
{
  "count": "number of recipes to generate (default 10)",
  "mealType": "one of: breakfast, lunch, dinner, snack (optional)",
  "dietaryTag": "one of: vegetarian, vegan, keto, paleo, gluten-free, low-carb, high-protein (optional)",
  "maxPrepTime": "maximum preparation time in minutes (optional)",
  "maxCalories": "maximum calories per serving (optional)",
  "minCalories": "minimum calories per serving (optional)",
  "minProtein": "minimum protein in grams (optional)",
  "maxProtein": "maximum protein in grams (optional)",
  "minCarbs": "minimum carbohydrates in grams (optional)",
  "maxCarbs": "maximum carbohydrates in grams (optional)",
  "minFat": "minimum fat in grams (optional)",
  "maxFat": "maximum fat in grams (optional)",
  "focusIngredient": "main ingredient to focus on (optional)",
  "difficulty": "one of: beginner, intermediate, advanced (optional)"
}

Guidelines:
- Infer dietary tags from context (e.g., "high protein" = high-protein, "low carb" = low-carb)
- Set realistic nutritional ranges based on requirements
- Default to 10 recipes unless specified
- Include any specific ingredients mentioned in focusIngredient
- Map time constraints to maxPrepTime (e.g., "quick" = 15, "under 30 minutes" = 30)
- Only include fields that are explicitly mentioned or can be clearly inferred`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert that parses natural language recipe generation requests into structured data. Always respond with valid JSON only."
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
    
    // Ensure required fields are present with defaults
    return {
      count: result.count || 10,
      mealType: result.mealType || undefined,
      dietaryTag: result.dietaryTag || undefined,
      maxPrepTime: result.maxPrepTime || undefined,
      maxCalories: result.maxCalories || undefined,
      minCalories: result.minCalories || undefined,
      minProtein: result.minProtein || undefined,
      maxProtein: result.maxProtein || undefined,
      minCarbs: result.minCarbs || undefined,
      maxCarbs: result.maxCarbs || undefined,
      minFat: result.minFat || undefined,
      maxFat: result.maxFat || undefined,
      focusIngredient: result.focusIngredient || undefined,
      difficulty: result.difficulty || undefined,
    };
  } catch (error) {
    console.error("Error parsing natural language recipe requirements:", error);
    // Return sensible defaults on error
    return {
      count: 10,
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
    "contemporary fine dining presentation with artistic garnishes",
    "vintage diner aesthetic with checkered tablecloth",
    "modern cafe styling with concrete surfaces",
    "elegant restaurant presentation with black backgrounds",
    "home kitchen warmth with natural wood tones",
    "industrial kitchen styling with steel surfaces"
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
    "aesthetically composed on a natural stone plate",
    "served in a colorful Mexican ceramic bowl",
    "presented on a handcrafted pottery dish",
    "arranged on a sleek black granite surface",
    "displayed in a rustic copper serving pan",
    "composed on a vintage blue and white china plate"
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
    "centered composition with symmetrical balance",
    "asymmetrical composition with negative space",
    "low angle shot emphasizing height and volume",
    "extreme close-up highlighting ingredients",
    "wide shot showing table setting context"
  ];

  // Define lighting variations for uniqueness
  const lightingStyles = [
    "soft natural window light from the left",
    "warm golden hour lighting",
    "cool daylight with soft shadows",
    "dramatic side lighting with deep shadows",
    "bright even lighting with minimal shadows",
    "warm tungsten lighting for cozy atmosphere",
    "cool LED lighting for modern feel",
    "backlighting to highlight steam and textures",
    "rim lighting to create depth and separation",
    "diffused overhead lighting for even illumination"
  ];

  // Define color schemes for variety
  const colorSchemes = [
    "warm earth tones with browns and golds",
    "cool blues and whites for fresh appearance",
    "vibrant colors highlighting fresh ingredients",
    "monochromatic styling in neutral tones",
    "high contrast black and white accents",
    "pastel color palette for soft appearance",
    "rich jewel tones for luxury feel",
    "natural green accents from herbs and vegetables",
    "warm orange and red tones for appetite appeal",
    "clean white with single color accent"
  ];

  // Define garnish and styling details
  const garnishStyles = [
    "fresh herb garnish artfully placed",
    "microgreens for professional presentation",
    "edible flowers for elegant decoration",
    "sauce drizzle in artistic pattern",
    "toasted nuts or seeds scattered around",
    "fresh citrus zest or slices as accent",
    "colorful vegetable chips as decoration",
    "herb oil drizzle for color contrast",
    "crispy bacon bits or protein garnish",
    "seasonal fruit accompaniment"
  ];

  // Select random elements for maximum uniqueness
  const imageStyle = imageStyles[Math.floor(Math.random() * imageStyles.length)];
  const platingStyle = platingStyles[Math.floor(Math.random() * platingStyles.length)];
  const composition = compositions[Math.floor(Math.random() * compositions.length)];
  const lightingStyle = lightingStyles[Math.floor(Math.random() * lightingStyles.length)];
  const colorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
  const garnishStyle = garnishStyles[Math.floor(Math.random() * garnishStyles.length)];
  
  // Generate multiple uniqueness factors
  const uniqueId = Date.now() % 10000;
  const randomSeed = Math.floor(Math.random() * 1000000);
  const recipeHash = recipe.name.length + recipe.description.length;
  
  const imagePrompt = `Create a completely UNIQUE and visually distinct photograph of "${recipe.name}" (ID: ${uniqueId}-${randomSeed}-${recipeHash}). This ${recipe.mealTypes[0]?.toLowerCase() || 'meal'} dish features: ${recipe.description}. 

VISUAL REQUIREMENTS FOR ABSOLUTE UNIQUENESS:
- Plating: ${platingStyle}
- Photography style: ${imageStyle}
- Camera composition: ${composition}
- Lighting: ${lightingStyle}
- Color scheme: ${colorScheme}
- Garnish: ${garnishStyle}

RECIPE-SPECIFIC DETAILS:
- Highlight the specific ingredients mentioned in: "${recipe.description}"
- Emphasize textures unique to this recipe's cooking method
- Show the characteristic colors of this particular dish
- Include visual elements that tell the story of this specific recipe

UNIQUENESS REQUIREMENTS:
- This image must be completely different from any other food photograph
- Use the exact combination of styling elements listed above
- Focus on what makes THIS dish special and recognizable
- Include unique visual markers that distinguish it from similar meals
- Ensure the styling choices create a one-of-a-kind appearance

TECHNICAL SPECIFICATIONS:
- Ultra-high resolution, professional food photography
- Lighting must match the specified style: ${lightingStyle}
- Color palette following: ${colorScheme}
- Sharp focus highlighting ingredient textures
- Professional food styling with specified garnish: ${garnishStyle}
- Camera angle and composition as specified: ${composition}

FINAL REQUIREMENT: This image must be instantly distinguishable from other food photos through its unique combination of styling, lighting, plating, and composition elements. Make it magazine-quality and irresistibly appetizing while maintaining complete visual uniqueness.`;

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
