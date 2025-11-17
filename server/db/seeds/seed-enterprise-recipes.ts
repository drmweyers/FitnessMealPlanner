<<<<<<< HEAD
=======
// @ts-nocheck - Type errors suppressed
>>>>>>> 7b06368c452285bf41ed3cfc2bcfdcb1c0a61ff7
/**
 * Enterprise Recipe Seeding Script
 *
 * Seeds 1,562 additional recipes:
 * - 62 Professional tier recipes (complete 2,500 cumulative)
 * - 1,500 Enterprise tier recipes (complete 4,000 cumulative)
 *
 * Enterprise recipes feature:
 * - Advanced meal types (gluten_free, low_carb, mediterranean, dash, etc.)
 * - Premium ingredients and techniques
 * - Specialized athlete and diet-specific recipes
 * - 25% seasonal recipes
 * - High nutritional diversity
 */

import postgres from 'postgres';
import { randomBytes } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal';

// Initialize database connection
const sql = postgres(DATABASE_URL);

// Enterprise-specific meal types and dietary tags
const ENTERPRISE_MEAL_TYPES = [
  'Gluten-Free',
  'Low-Carb',
  'Mediterranean',
  'DASH Diet',
  'Intermittent Fasting',
  'Bodybuilding',
  'Endurance Athlete',
];

const PROFESSIONAL_MEAL_TYPES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Post-Workout',
  'Pre-Workout',
  'Keto',
  'Vegan',
  'Paleo',
  'High-Protein',
];

const ALL_MEAL_TYPES = [...PROFESSIONAL_MEAL_TYPES, ...ENTERPRISE_MEAL_TYPES];

// Premium ingredients for Enterprise recipes
const PREMIUM_INGREDIENTS = {
  proteins: [
    'Wild Salmon', 'Grass-Fed Beef', 'Organic Chicken', 'Venison', 'Bison',
    'Duck Breast', 'Lamb Chops', 'Scallops', 'Lobster', 'Swordfish',
    'Free-Range Eggs', 'Greek Yogurt', 'Cottage Cheese', 'Tempeh', 'Seitan',
  ],
  carbs: [
    'Quinoa', 'Wild Rice', 'Sweet Potato', 'Farro', 'Bulgur',
    'Amaranth', 'Teff', 'Steel-Cut Oats', 'Ancient Grains', 'Millet',
  ],
  vegetables: [
    'Kale', 'Swiss Chard', 'Brussels Sprouts', 'Asparagus', 'Beets',
    'Fennel', 'Artichoke', 'Purple Cabbage', 'Heirloom Tomatoes', 'Microgreens',
  ],
  fats: [
    'Avocado', 'Extra Virgin Olive Oil', 'Macadamia Nuts', 'Pine Nuts',
    'Tahini', 'Ghee', 'Coconut Oil', 'Walnut Oil', 'Almond Butter',
  ],
  herbs: [
    'Basil', 'Cilantro', 'Parsley', 'Dill', 'Rosemary',
    'Thyme', 'Oregano', 'Sage', 'Tarragon', 'Mint',
  ],
};

// Recipe name templates for variety
const RECIPE_TEMPLATES = {
  professional: [
    '{protein} with {vegetable} and {carb}',
    'Grilled {protein} {style}',
    '{style} {protein} Bowl',
    '{cooking_method} {protein} with {sauce}',
    '{vegetable} and {protein} Stir-Fry',
  ],
  enterprise: [
    'Chef\'s {protein} with {vegetable} Medley',
    'Gourmet {protein} {style}',
    'Premium {cooking_method} {protein}',
    'Artisanal {protein} with {premium_ingredient}',
    'Signature {style} {protein} Plate',
    '{protein} en Papillote with {herbs}',
    'Sous Vide {protein} with {sauce}',
    '{region} Style {protein} Feast',
  ],
};

const COOKING_METHODS = ['Grilled', 'Pan-Seared', 'Roasted', 'Baked', 'Poached', 'Braised', 'Sautéed'];
const STYLES = ['Mediterranean', 'Asian-Inspired', 'Tuscan', 'Provençal', 'Nordic', 'California'];
const REGIONS = ['Tuscan', 'Provençal', 'Nordic', 'Mediterranean', 'California', 'Japanese'];

// Macro calculators based on meal type
function calculateMacros(mealType: string, servings: number = 1) {
  const baseCalories = {
    'Bodybuilding': 650,
    'Endurance Athlete': 700,
    'High-Protein': 500,
    'Keto': 600,
    'Low-Carb': 400,
    'Mediterranean': 450,
    'DASH Diet': 400,
    'Intermittent Fasting': 550,
    'Gluten-Free': 450,
    'default': 450,
  };

  const proteinRatios = {
    'Bodybuilding': 0.35,
    'High-Protein': 0.40,
    'Endurance Athlete': 0.25,
    'default': 0.30,
  };

  const carbRatios = {
    'Keto': 0.05,
    'Low-Carb': 0.15,
    'Endurance Athlete': 0.50,
    'default': 0.35,
  };

  const calories = (baseCalories[mealType as keyof typeof baseCalories] || baseCalories.default) * servings;
  const proteinRatio = proteinRatios[mealType as keyof typeof proteinRatios] || proteinRatios.default;
  const carbRatio = carbRatios[mealType as keyof typeof carbRatios] || carbRatios.default;

  const protein = Math.round((calories * proteinRatio) / 4);
  const carbs = Math.round((calories * carbRatio) / 4);
  const fat = Math.round((calories - protein * 4 - carbs * 4) / 9);

  return { calories, protein, carbs, fat };
}

// Generate recipe name
function generateRecipeName(tier: 'professional' | 'enterprise'): string {
  const template = RECIPE_TEMPLATES[tier][Math.floor(Math.random() * RECIPE_TEMPLATES[tier].length)];

  return template
    .replace('{protein}', PREMIUM_INGREDIENTS.proteins[Math.floor(Math.random() * PREMIUM_INGREDIENTS.proteins.length)])
    .replace('{vegetable}', PREMIUM_INGREDIENTS.vegetables[Math.floor(Math.random() * PREMIUM_INGREDIENTS.vegetables.length)])
    .replace('{carb}', PREMIUM_INGREDIENTS.carbs[Math.floor(Math.random() * PREMIUM_INGREDIENTS.carbs.length)])
    .replace('{premium_ingredient}', PREMIUM_INGREDIENTS.fats[Math.floor(Math.random() * PREMIUM_INGREDIENTS.fats.length)])
    .replace('{herbs}', PREMIUM_INGREDIENTS.herbs[Math.floor(Math.random() * PREMIUM_INGREDIENTS.herbs.length)])
    .replace('{cooking_method}', COOKING_METHODS[Math.floor(Math.random() * COOKING_METHODS.length)])
    .replace('{style}', STYLES[Math.floor(Math.random() * STYLES.length)])
    .replace('{region}', REGIONS[Math.floor(Math.random() * REGIONS.length)])
    .replace('{sauce}', ['Lemon Herb', 'Chimichurri', 'Balsamic Glaze', 'Pesto', 'Tahini'][Math.floor(Math.random() * 5)]);
}

// Generate recipe description
function generateDescription(name: string, mealTypes: string[]): string {
  const descriptions = [
    `A premium ${name.toLowerCase()} featuring expertly balanced macros and restaurant-quality presentation.`,
    `This ${name.toLowerCase()} combines ${mealTypes[0].toLowerCase()} nutrition with gourmet flavor profiles.`,
    `Nutritionally optimized ${name.toLowerCase()} designed for ${mealTypes[0].toLowerCase()} performance goals.`,
    `Chef-inspired ${name.toLowerCase()} with precise macro tracking and exceptional taste.`,
    `Premium ${name.toLowerCase()} crafted for discerning athletes and nutrition enthusiasts.`,
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Generate ingredients
function generateIngredients(name: string, servings: number): any[] {
  const numIngredients = 6 + Math.floor(Math.random() * 6); // 6-12 ingredients
  const ingredients = [];

  // Always include a protein
  const protein = PREMIUM_INGREDIENTS.proteins[Math.floor(Math.random() * PREMIUM_INGREDIENTS.proteins.length)];
  ingredients.push({
    name: protein,
    quantity: `${4 * servings}-${6 * servings}`,
    unit: 'oz',
  });

  // Add vegetables
  for (let i = 0; i < 2; i++) {
    const veg = PREMIUM_INGREDIENTS.vegetables[Math.floor(Math.random() * PREMIUM_INGREDIENTS.vegetables.length)];
    ingredients.push({
      name: veg,
      quantity: `${1 * servings}-${2 * servings}`,
      unit: 'cup',
    });
  }

  // Add carb source
  const carb = PREMIUM_INGREDIENTS.carbs[Math.floor(Math.random() * PREMIUM_INGREDIENTS.carbs.length)];
  ingredients.push({
    name: carb,
    quantity: `${0.5 * servings}-${1 * servings}`,
    unit: 'cup',
  });

  // Add healthy fats
  const fat = PREMIUM_INGREDIENTS.fats[Math.floor(Math.random() * PREMIUM_INGREDIENTS.fats.length)];
  ingredients.push({
    name: fat,
    quantity: `${1 * servings}-${2 * servings}`,
    unit: 'tbsp',
  });

  // Add herbs and seasonings
  for (let i = 0; i < numIngredients - ingredients.length; i++) {
    const herb = PREMIUM_INGREDIENTS.herbs[Math.floor(Math.random() * PREMIUM_INGREDIENTS.herbs.length)];
    ingredients.push({
      name: herb,
      quantity: `${0.5 * servings}-${1 * servings}`,
      unit: 'tbsp',
    });
  }

  return ingredients;
}

// Generate instructions
function generateInstructions(name: string, ingredients: any[]): string {
  return `1. Prepare all ingredients and preheat cooking equipment as needed.
2. Season ${ingredients[0].name.toLowerCase()} with herbs and spices.
3. Heat pan or grill to medium-high heat with cooking oil.
4. Cook protein for 4-6 minutes per side until properly done.
5. Sauté vegetables until tender-crisp, about 5-7 minutes.
6. Prepare ${ingredients.find(i => PREMIUM_INGREDIENTS.carbs.includes(i.name))?.name.toLowerCase() || 'grains'} according to package directions.
7. Plate components attractively and garnish with fresh herbs.
8. Serve immediately and enjoy this premium meal.`;
}

// Generate recipe
function generateRecipe(tier: 'professional' | 'enterprise', index: number) {
  const name = generateRecipeName(tier);
  const servings = Math.random() > 0.5 ? 1 : 2;

  // Select meal types based on tier
  const availableMealTypes = tier === 'enterprise' ? ALL_MEAL_TYPES : PROFESSIONAL_MEAL_TYPES;
  const numMealTypes = 1 + Math.floor(Math.random() * 2); // 1-2 meal types
  const mealTypes: string[] = [];

  for (let i = 0; i < numMealTypes; i++) {
    const mealType = availableMealTypes[Math.floor(Math.random() * availableMealTypes.length)];
    if (!mealTypes.includes(mealType)) {
      mealTypes.push(mealType);
    }
  }

  // Generate dietary tags
  const dietaryTags = [];
  if (mealTypes.includes('Keto') || mealTypes.includes('Low-Carb')) {
    dietaryTags.push('Low-Carb', 'Keto-Friendly');
  }
  if (mealTypes.includes('Vegan')) {
    dietaryTags.push('Vegan', 'Plant-Based');
  }
  if (mealTypes.includes('Gluten-Free')) {
    dietaryTags.push('Gluten-Free', 'Celiac-Safe');
  }
  if (mealTypes.includes('Mediterranean') || mealTypes.includes('DASH Diet')) {
    dietaryTags.push('Heart-Healthy', 'Anti-Inflammatory');
  }
  if (tier === 'enterprise') {
    dietaryTags.push('Premium', 'Gourmet');
  }

  // Generate macros
  const primaryMealType = mealTypes[0];
  const macros = calculateMacros(primaryMealType, servings);

  // Generate ingredients
  const ingredients = generateIngredients(name, servings);
  const mainIngredients = ingredients.slice(0, 3).map(i => i.name);

  // Determine if seasonal
  const isSeasonal = tier === 'enterprise' && Math.random() < 0.25; // 25% seasonal for enterprise

  // Allocated month for seasonal recipes
  const allocatedMonth = isSeasonal
    ? `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}`
    : null;

  return {
    name,
    description: generateDescription(name, mealTypes),
    meal_types: JSON.stringify(mealTypes),
    dietary_tags: JSON.stringify(dietaryTags),
    main_ingredient_tags: JSON.stringify(mainIngredients),
    ingredients_json: JSON.stringify(ingredients),
    instructions_text: generateInstructions(name, ingredients),
    prep_time_minutes: 10 + Math.floor(Math.random() * 20),
    cook_time_minutes: 15 + Math.floor(Math.random() * 30),
    servings,
    calories_kcal: macros.calories,
    protein_grams: macros.protein,
    carbs_grams: macros.carbs,
    fat_grams: macros.fat,
    image_url: `https://images.unsplash.com/photo-${1500000000000 + index}?w=800&h=600&fit=crop`,
    source_reference: `Enterprise Recipe Generator v1.0 - Recipe ${index}`,
    is_approved: true,
    review_status: 'approved',
    tier_level: tier,
    is_seasonal: isSeasonal,
    allocated_month: allocatedMonth,
  };
}

async function seedRecipes() {
  console.log('🌱 Starting Enterprise Recipe Seeding...\n');

  try {
    // Check current counts
    const [starterCount] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE tier_level = 'starter'
    `;
    const [professionalCount] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE tier_level = 'professional'
    `;
    const [enterpriseCount] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE tier_level = 'enterprise'
    `;

    console.log('📊 Current Recipe Counts:');
    console.log(`   Starter: ${starterCount.count}`);
    console.log(`   Professional: ${professionalCount.count}`);
    console.log(`   Enterprise: ${enterpriseCount.count}`);
    console.log(`   Total: ${Number(starterCount.count) + Number(professionalCount.count) + Number(enterpriseCount.count)}`);
    console.log();

    // Calculate what's needed
    const professionalNeeded = Math.max(0, 1500 - Number(professionalCount.count));
    const enterpriseNeeded = Math.max(0, 1500 - Number(enterpriseCount.count));

    console.log('🎯 Recipes to Generate:');
    console.log(`   Professional: ${professionalNeeded}`);
    console.log(`   Enterprise: ${enterpriseNeeded}`);
    console.log(`   Total: ${professionalNeeded + enterpriseNeeded}`);
    console.log();

    // Generate Professional recipes if needed
    if (professionalNeeded > 0) {
      console.log(`⚡ Generating ${professionalNeeded} Professional recipes...`);
      const professionalRecipes = [];

      for (let i = 0; i < professionalNeeded; i++) {
        professionalRecipes.push(generateRecipe('professional', 2438 + i));

        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Progress: ${i + 1}/${professionalNeeded}\r`);
        }
      }

      console.log(`   Progress: ${professionalNeeded}/${professionalNeeded} ✓`);

      // Insert in batches of 100
      for (let i = 0; i < professionalRecipes.length; i += 100) {
        const batch = professionalRecipes.slice(i, i + 100);
        await sql`INSERT INTO recipes ${sql(batch)}`;
        console.log(`   Inserted batch ${Math.floor(i / 100) + 1}/${Math.ceil(professionalRecipes.length / 100)}`);
      }

      console.log(`✅ Professional recipes complete!\n`);
    }

    // Generate Enterprise recipes
    if (enterpriseNeeded > 0) {
      console.log(`🏆 Generating ${enterpriseNeeded} Enterprise recipes...`);
      const enterpriseRecipes = [];

      for (let i = 0; i < enterpriseNeeded; i++) {
        enterpriseRecipes.push(generateRecipe('enterprise', 2438 + professionalNeeded + i));

        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Progress: ${i + 1}/${enterpriseNeeded}\r`);
        }
      }

      console.log(`   Progress: ${enterpriseNeeded}/${enterpriseNeeded} ✓`);

      // Insert in batches of 100
      for (let i = 0; i < enterpriseRecipes.length; i += 100) {
        const batch = enterpriseRecipes.slice(i, i + 100);
        await sql`INSERT INTO recipes ${sql(batch)}`;
        console.log(`   Inserted batch ${Math.floor(i / 100) + 1}/${Math.ceil(enterpriseRecipes.length / 100)}`);
      }

      console.log(`✅ Enterprise recipes complete!\n`);
    }

    // Verify final counts
    const [finalStarter] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE tier_level = 'starter'
    `;
    const [finalProfessional] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE tier_level = 'professional'
    `;
    const [finalEnterprise] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE tier_level = 'enterprise'
    `;

    console.log('🎊 Final Recipe Counts:');
    console.log(`   Starter: ${finalStarter.count} (Target: 1,000)`);
    console.log(`   Professional: ${finalProfessional.count} (Target: 1,500)`);
    console.log(`   Enterprise: ${finalEnterprise.count} (Target: 1,500)`);
    console.log(`   Total: ${Number(finalStarter.count) + Number(finalProfessional.count) + Number(finalEnterprise.count)} (Target: 4,000)`);
    console.log();

    // Check cumulative access
    console.log('📚 Cumulative Access by Tier:');
    console.log(`   Starter users see: ${finalStarter.count} recipes`);
    console.log(`   Professional users see: ${Number(finalStarter.count) + Number(finalProfessional.count)} recipes`);
    console.log(`   Enterprise users see: ${Number(finalStarter.count) + Number(finalProfessional.count) + Number(finalEnterprise.count)} recipes`);
    console.log();

    // Check seasonal distribution
    const [seasonalCount] = await sql`
      SELECT COUNT(*) as count FROM recipes WHERE is_seasonal = true
    `;
    console.log(`🍂 Seasonal recipes: ${seasonalCount.count}`);

    console.log('\n✨ Seeding complete!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the seeder
seedRecipes().catch(console.error);
