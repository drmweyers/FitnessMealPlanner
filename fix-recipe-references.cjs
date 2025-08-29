const { Client } = require('pg');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'fitmeal',
  user: 'postgres',
  password: 'postgres'
});

async function fixRecipeReferences() {
  try {
    await client.connect();
    console.log('Connected to database');

    // First, get all valid recipe IDs
    const validRecipesResult = await client.query('SELECT id, name FROM recipes WHERE is_approved = true ORDER BY name LIMIT 20');
    const validRecipes = validRecipesResult.rows;
    
    console.log(`Found ${validRecipes.length} valid recipes to use as replacements`);

    // Get all meal plans with broken recipe references
    const mealPlansResult = await client.query('SELECT id, meal_plan_data FROM personalized_meal_plans');
    const mealPlans = mealPlansResult.rows;
    
    console.log(`Checking ${mealPlans.length} meal plans...`);

    let fixedCount = 0;

    for (const plan of mealPlans) {
      let needsUpdate = false;
      const mealPlanData = plan.meal_plan_data;
      
      if (mealPlanData && mealPlanData.meals && Array.isArray(mealPlanData.meals)) {
        for (let i = 0; i < mealPlanData.meals.length; i++) {
          const meal = mealPlanData.meals[i];
          if (meal.recipe && meal.recipe.id) {
            let recipeExists = false;
            
            // Check if the recipe ID is a valid UUID format and exists in database
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            
            if (uuidRegex.test(meal.recipe.id)) {
              const recipeCheck = await client.query('SELECT id FROM recipes WHERE id = $1 AND is_approved = true', [meal.recipe.id]);
              recipeExists = recipeCheck.rows.length > 0;
            }
            
            if (!recipeExists) {
              console.log(`Fixing broken recipe ID: ${meal.recipe.id}`);
              
              // Replace with a valid recipe
              const replacementRecipe = validRecipes[i % validRecipes.length];
              
              // Get full recipe data for the replacement
              const fullRecipeResult = await client.query(`
                SELECT id, name, description, calories_kcal, protein_grams, carbs_grams, 
                       fat_grams, prep_time_minutes, cook_time_minutes, servings, 
                       meal_types, dietary_tags, main_ingredient_tags, 
                       ingredients_json, instructions_text, image_url
                FROM recipes WHERE id = $1
              `, [replacementRecipe.id]);
              
              const fullRecipe = fullRecipeResult.rows[0];
              
              // Update the meal with the new recipe data
              mealPlanData.meals[i].recipe = {
                id: fullRecipe.id,
                name: fullRecipe.name,
                description: fullRecipe.description || '',
                caloriesKcal: fullRecipe.calories_kcal,
                proteinGrams: fullRecipe.protein_grams?.toString() || '0',
                carbsGrams: fullRecipe.carbs_grams?.toString() || '0',
                fatGrams: fullRecipe.fat_grams?.toString() || '0',
                prepTimeMinutes: fullRecipe.prep_time_minutes,
                cookTimeMinutes: fullRecipe.cook_time_minutes,
                servings: fullRecipe.servings,
                mealTypes: fullRecipe.meal_types || [],
                dietaryTags: fullRecipe.dietary_tags || [],
                mainIngredientTags: fullRecipe.main_ingredient_tags || [],
                ingredientsJson: fullRecipe.ingredients_json || [],
                instructionsText: fullRecipe.instructions_text || '',
                imageUrl: fullRecipe.image_url
              };
              
              needsUpdate = true;
            }
          }
        }
      }
      
      if (needsUpdate) {
        await client.query('UPDATE personalized_meal_plans SET meal_plan_data = $1 WHERE id = $2', [
          JSON.stringify(mealPlanData),
          plan.id
        ]);
        fixedCount++;
        console.log(`Fixed meal plan ${plan.id}`);
      }
    }

    console.log(`\nFixed ${fixedCount} meal plans with broken recipe references`);
    
  } catch (error) {
    console.error('Error fixing recipe references:', error);
  } finally {
    await client.end();
  }
}

fixRecipeReferences();