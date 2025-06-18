import { storage } from '../server/storage.js';

const testRecipes = [
  {
    name: "Greek Yogurt Parfait",
    description: "High-protein breakfast with berries and granola",
    mealTypes: ["breakfast"],
    dietaryTags: ["vegetarian", "high-protein"],
    mainIngredientTags: ["yogurt", "berries"],
    ingredientsJson: [
      { name: "Greek yogurt", amount: "200", unit: "g" },
      { name: "mixed berries", amount: "100", unit: "g" },
      { name: "granola", amount: "30", unit: "g" },
      { name: "honey", amount: "1", unit: "tbsp" }
    ],
    instructionsText: "Layer yogurt, berries, and granola in a bowl. Drizzle with honey.",
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 1,
    caloriesKcal: 320,
    proteinGrams: "20.5",
    carbsGrams: "28.0",
    fatGrams: "12.0",
    imageUrl: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c",
    sourceReference: "Sample Recipe",
    isApproved: true
  },
  {
    name: "Turkey and Avocado Wrap",
    description: "Light lunch wrap with lean turkey and fresh vegetables",
    mealTypes: ["lunch"],
    dietaryTags: ["high-protein", "low-carb"],
    mainIngredientTags: ["turkey", "avocado"],
    ingredientsJson: [
      { name: "whole wheat tortilla", amount: "1", unit: "piece" },
      { name: "sliced turkey", amount: "100", unit: "g" },
      { name: "avocado", amount: "0.5", unit: "piece" },
      { name: "lettuce", amount: "50", unit: "g" },
      { name: "tomato", amount: "1", unit: "medium" }
    ],
    instructionsText: "Spread avocado on tortilla, add turkey, lettuce, and tomato. Roll tightly.",
    prepTimeMinutes: 10,
    cookTimeMinutes: 0,
    servings: 1,
    caloriesKcal: 380,
    proteinGrams: "28.0",
    carbsGrams: "25.0",
    fatGrams: "18.0",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b",
    sourceReference: "Sample Recipe",
    isApproved: true
  },
  {
    name: "Salmon with Sweet Potato",
    description: "Omega-3 rich dinner with roasted sweet potato and broccoli",
    mealTypes: ["dinner"],
    dietaryTags: ["high-protein", "gluten-free"],
    mainIngredientTags: ["salmon", "sweet potato"],
    ingredientsJson: [
      { name: "salmon fillet", amount: "150", unit: "g" },
      { name: "sweet potato", amount: "200", unit: "g" },
      { name: "broccoli", amount: "150", unit: "g" },
      { name: "olive oil", amount: "2", unit: "tbsp" },
      { name: "lemon", amount: "0.5", unit: "piece" }
    ],
    instructionsText: "Roast sweet potato at 400F for 25 minutes. Pan-sear salmon 4 minutes per side. Steam broccoli. Serve with lemon.",
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    servings: 1,
    caloriesKcal: 520,
    proteinGrams: "35.0",
    carbsGrams: "40.0",
    fatGrams: "22.0",
    imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
    sourceReference: "Sample Recipe",
    isApproved: true
  },
  {
    name: "Protein Smoothie Bowl",
    description: "Post-workout smoothie bowl with protein powder and fruits",
    mealTypes: ["breakfast", "snack"],
    dietaryTags: ["high-protein", "vegetarian"],
    mainIngredientTags: ["protein powder", "banana"],
    ingredientsJson: [
      { name: "protein powder", amount: "30", unit: "g" },
      { name: "banana", amount: "1", unit: "medium" },
      { name: "almond milk", amount: "200", unit: "ml" },
      { name: "blueberries", amount: "50", unit: "g" },
      { name: "chia seeds", amount: "1", unit: "tbsp" }
    ],
    instructionsText: "Blend protein powder, banana, and almond milk. Pour into bowl and top with blueberries and chia seeds.",
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 1,
    caloriesKcal: 280,
    proteinGrams: "25.0",
    carbsGrams: "30.0",
    fatGrams: "8.0",
    imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38",
    sourceReference: "Sample Recipe",
    isApproved: true
  },
  {
    name: "Veggie Stir Fry",
    description: "Quick and healthy vegetable stir fry with tofu",
    mealTypes: ["lunch", "dinner"],
    dietaryTags: ["vegetarian", "vegan", "low-carb"],
    mainIngredientTags: ["tofu", "vegetables"],
    ingredientsJson: [
      { name: "firm tofu", amount: "150", unit: "g" },
      { name: "mixed vegetables", amount: "200", unit: "g" },
      { name: "soy sauce", amount: "2", unit: "tbsp" },
      { name: "sesame oil", amount: "1", unit: "tbsp" },
      { name: "garlic", amount: "2", unit: "cloves" }
    ],
    instructionsText: "Heat oil in pan, add garlic and tofu. Cook 3 minutes, add vegetables and soy sauce. Stir fry 5 minutes.",
    prepTimeMinutes: 10,
    cookTimeMinutes: 8,
    servings: 1,
    caloriesKcal: 290,
    proteinGrams: "18.0",
    carbsGrams: "15.0",
    fatGrams: "16.0",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19",
    sourceReference: "Sample Recipe",
    isApproved: true
  }
];

async function addTestRecipes() {
  console.log('Adding test recipes to database...');
  
  for (const recipe of testRecipes) {
    try {
      const result = await storage.createRecipe(recipe);
      console.log(`Added: ${result.name}`);
    } catch (error) {
      console.error(`Failed to add ${recipe.name}:`, error.message);
    }
  }
  
  console.log('Finished adding test recipes');
}

addTestRecipes().catch(console.error);