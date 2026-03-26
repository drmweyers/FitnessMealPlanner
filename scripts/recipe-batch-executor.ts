/**
 * EvoFit 4,000 Recipe Generation - Automated Batch Executor
 *
 * Maps every batch from the generation checklist to exact BMAD API parameters.
 * Executes against production (evofitmeals.com) or local (localhost:4000).
 * Tracks progress, handles failures, and produces a completion report.
 *
 * Usage:
 *   npx tsx scripts/recipe-batch-executor.ts --target production --batch A1
 *   npx tsx scripts/recipe-batch-executor.ts --target production --phase 1
 *   npx tsx scripts/recipe-batch-executor.ts --target production --all
 *   npx tsx scripts/recipe-batch-executor.ts --target production --status
 *   npx tsx scripts/recipe-batch-executor.ts --target local --batch E1 --no-images
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const TARGETS = {
  production: 'https://evofitmeals.com',
  local: 'http://localhost:4000',
} as const;

const ADMIN_CREDENTIALS = {
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123',
};

// Progress file to track completed batches
const PROGRESS_FILE = path.join(__dirname, 'recipe-generation-progress.json');

// ============================================================
// BATCH DEFINITIONS - Exact specs from the Generation Checklist
// ============================================================

interface BatchSpec {
  id: string;
  block: string;
  name: string;
  phase: 1 | 2 | 3;
  tierLevel: 'starter' | 'professional' | 'enterprise';
  target: number;
  mealTypes: string[];
  dietaryRestrictions: string[];
  fitnessGoal?: string;
  mainIngredient?: string;
  targetCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
  maxPrepTime?: number;
  naturalLanguagePrompt: string;
  enableImageGeneration: boolean;
  enableS3Upload: boolean;
  enableNutritionValidation: boolean;
}

const BATCHES: BatchSpec[] = [
  // ============================================================
  // PHASE 1: TIER 3 — FOUNDATIONAL (1,000 Recipes)
  // ============================================================

  // Block A: Chicken (350 Recipes)
  {
    id: 'A1', block: 'A', name: 'Chicken — Weight Loss Meals',
    phase: 1, tierLevel: 'starter', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Weight Loss',
    mainIngredient: 'Chicken',
    targetCalories: 400, maxCalories: 450,
    minProtein: 30, maxProtein: 45,
    maxFat: 12, maxPrepTime: 30,
    naturalLanguagePrompt: 'Create unique weight loss chicken recipes. Each recipe must be distinct with different cooking methods (grilled, baked, poached, stir-fried, slow-cooked), different cuisines (Mediterranean, Asian, Mexican, American, Middle Eastern), and different vegetable pairings. Focus on lean chicken breast and thigh preparations. No duplicate flavor profiles.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'A2', block: 'A', name: 'Chicken — Muscle Building Meals',
    phase: 1, tierLevel: 'starter', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Chicken',
    targetCalories: 500, maxCalories: 550,
    minProtein: 35, maxProtein: 50,
    maxFat: 15, maxPrepTime: 30,
    naturalLanguagePrompt: 'Create unique muscle-building chicken recipes with higher calorie and protein content. Include larger portions, complex carb sides (rice, sweet potato, quinoa), and post-workout recovery meals. Different cooking styles and international cuisines. Each recipe must be completely unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'A3', block: 'A', name: 'Chicken — Breakfast',
    phase: 1, tierLevel: 'starter', target: 100,
    mealTypes: ['Breakfast'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'General Fitness',
    mainIngredient: 'Chicken',
    targetCalories: 350, maxCalories: 400,
    minProtein: 25, maxProtein: 40,
    maxFat: 12, maxPrepTime: 25,
    naturalLanguagePrompt: 'Breakfast recipes featuring chicken, egg and chicken combinations, chicken sausage, suitable for morning meals. Include chicken and egg scrambles, chicken breakfast burritos, chicken and waffle alternatives, chicken hash, savory chicken oatmeal bowls. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'A4', block: 'A', name: 'Chicken — Snacks',
    phase: 1, tierLevel: 'starter', target: 50,
    mealTypes: ['Snack'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Weight Loss',
    mainIngredient: 'Chicken',
    targetCalories: 200, maxCalories: 250,
    minProtein: 15, maxProtein: 25,
    maxFat: 8, maxPrepTime: 15,
    naturalLanguagePrompt: 'Portable chicken snacks, quick preparation, great for meal prep, easy to eat on-the-go. Chicken jerky, mini chicken meatballs, chicken lettuce cups, chicken skewers, stuffed chicken bites. Each must be unique and distinct.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block B: Fish & Seafood (300 Recipes)
  {
    id: 'B1', block: 'B', name: 'Salmon',
    phase: 1, tierLevel: 'starter', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Carb'],
    fitnessGoal: 'General Fitness',
    mainIngredient: 'Salmon',
    targetCalories: 450, maxCalories: 520,
    minProtein: 30, maxProtein: 45,
    maxFat: 22, maxPrepTime: 25,
    naturalLanguagePrompt: 'Heart-healthy salmon recipes, omega-3 rich, variety of cooking methods including baked, grilled, pan-seared, poached, en papillote. Include different glazes, rubs, and sauces. International flavors - teriyaki, Mediterranean herb, Cajun, dill, miso. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'B2', block: 'B', name: 'White Fish (Tilapia/Cod)',
    phase: 1, tierLevel: 'starter', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Weight Loss',
    mainIngredient: 'Tilapia',
    targetCalories: 350, maxCalories: 420,
    minProtein: 28, maxProtein: 42,
    maxFat: 10, maxPrepTime: 25,
    naturalLanguagePrompt: 'Lean white fish recipes, tilapia, cod, halibut, low calorie, high protein, light and fresh preparations. Include baked, pan-fried with minimal oil, steamed, grilled preparations. Pair with vegetables and light sauces. Each recipe must be completely unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'B3', block: 'B', name: 'Shrimp',
    phase: 1, tierLevel: 'starter', target: 100,
    mealTypes: ['Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['High-Protein', 'Low-Carb'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Shrimp',
    targetCalories: 400, maxCalories: 480,
    minProtein: 32, maxProtein: 48,
    maxFat: 14, maxPrepTime: 20,
    naturalLanguagePrompt: 'Quick-cooking shrimp recipes, versatile preparations, stir-fries, grilled, sautéed, great for meal prep. Include garlic shrimp, coconut shrimp (baked), shrimp tacos, shrimp bowls, shrimp skewers. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block C: Vegetarian (250 Recipes) — ALREADY COVERED BY EXISTING 1,654 PRODUCTION RECIPES
  // C1, C2, C3 SKIPPED - production already has 1,654 vegetarian recipes (target was 250)

  // Block D: Turkey & Lean Beef (100 Recipes)
  {
    id: 'D1', block: 'D', name: 'Ground Turkey',
    phase: 1, tierLevel: 'starter', target: 50,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Weight Loss',
    mainIngredient: 'Turkey',
    targetCalories: 420, maxCalories: 480,
    minProtein: 30, maxProtein: 45,
    maxFat: 14, maxPrepTime: 30,
    naturalLanguagePrompt: 'Lean ground turkey recipes, turkey burgers, meatballs, stir-fries, healthy comfort food alternatives. Turkey chili, turkey lettuce wraps, turkey stuffed peppers, turkey bolognese. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'D2', block: 'D', name: 'Lean Beef',
    phase: 1, tierLevel: 'starter', target: 50,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Beef',
    targetCalories: 480, maxCalories: 550,
    minProtein: 32, maxProtein: 50,
    maxFat: 18, maxPrepTime: 30,
    naturalLanguagePrompt: 'Lean beef recipes, sirloin, flank steak, 93% lean ground beef, iron-rich, muscle-building focused. Beef stir-fry, lean beef tacos, steak salads, beef and broccoli, lean burgers. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // ============================================================
  // PHASE 2: TIER 2 — PROFESSIONAL (+1,500 Recipes)
  // ============================================================

  // Block E: Specialized Diets (400 Recipes)
  {
    id: 'E1', block: 'E', name: 'Keto',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['Keto', 'High-Protein', 'Low-Carb'],
    fitnessGoal: 'Weight Loss',
    targetCalories: 450, maxCalories: 550,
    minProtein: 25, maxCarbs: 20, minFat: 25,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Ketogenic diet recipes, very low carb (under 20g net carbs), high fat, moderate protein, no grains or sugar, keto-friendly ingredients. Include avocado, coconut oil, butter, fatty fish, nuts, seeds, low-carb vegetables. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'E2', block: 'E', name: 'Paleo',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['Paleo', 'High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 450, maxCalories: 520,
    minProtein: 28,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Paleo diet recipes, no grains, no legumes, no dairy, whole foods, caveman diet principles, natural ingredients. Include grass-fed meats, wild-caught fish, vegetables, fruits, nuts, seeds. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'E3', block: 'E', name: 'Gluten-Free',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['Gluten-Free', 'High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 500,
    minProtein: 25,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Certified gluten-free recipes, no wheat, barley, rye, safe for celiac, gluten-free grains like rice and quinoa. Include naturally GF proteins, rice bowls, corn tortilla dishes, potato-based meals. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'E4', block: 'E', name: 'Dairy-Free',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['Dairy-Free', 'High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 500,
    minProtein: 25,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Dairy-free recipes, no milk, cheese, butter, yogurt, lactose-free, plant-based alternatives where needed. Use coconut milk, almond milk, nutritional yeast, cashew cream. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block F: Expanded Proteins (400 Recipes)
  {
    id: 'F1', block: 'F', name: 'Pork Tenderloin',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'General Fitness',
    mainIngredient: 'Pork',
    targetCalories: 420, maxCalories: 500,
    minProtein: 28, maxFat: 14,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Lean pork recipes, pork tenderloin, pork loin, lean cuts only, the other white meat, healthy preparations. Include roasted, grilled, stir-fried, slow-cooked pork. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'F2', block: 'F', name: 'Duck/Game Birds',
    phase: 2, tierLevel: 'professional', target: 50,
    mealTypes: ['Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Duck',
    targetCalories: 480, maxCalories: 580,
    minProtein: 30,
    maxPrepTime: 45,
    naturalLanguagePrompt: 'Game bird recipes, duck breast, pheasant, quail, unique poultry options, gourmet but fitness-focused. Include pan-seared duck breast, roasted quail, braised duck legs. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'F3', block: 'F', name: 'Lamb',
    phase: 2, tierLevel: 'professional', target: 50,
    mealTypes: ['Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Lamb',
    targetCalories: 500, maxCalories: 580,
    minProtein: 30,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Lean lamb recipes, lamb loin, leg of lamb, Mediterranean style, Middle Eastern inspired, iron-rich. Include grilled lamb chops, lamb kofta, herb-crusted lamb. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'F4', block: 'F', name: 'Mixed Seafood',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Carb'],
    fitnessGoal: 'General Fitness',
    targetCalories: 420, maxCalories: 500,
    minProtein: 30,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Mixed seafood recipes, scallops, mussels, clams, calamari, crab, variety of shellfish and fish combinations. Include seafood paella, cioppino, seafood stir-fry, grilled seafood platters. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'F5', block: 'F', name: 'Bison/Venison',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Bison',
    targetCalories: 450, maxCalories: 520,
    minProtein: 32, maxFat: 12,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Game meat recipes, bison, venison, elk, ultra-lean red meat alternatives, high protein, low fat, grass-fed. Include bison burgers, venison steaks, elk chili. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block G: Vegan (300 Recipes)
  {
    id: 'G1', block: 'G', name: 'High-Protein Vegan',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['Vegan', 'High-Protein'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Tempeh',
    targetCalories: 420, maxCalories: 500,
    minProtein: 20,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'High-protein vegan meals, tempeh, seitan, edamame, protein-focused plant-based bodybuilding recipes. Include tempeh stir-fry, seitan steaks, edamame bowls, protein-packed grain bowls. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'G2', block: 'G', name: 'Legume Variety',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['Vegan', 'High-Protein'],
    fitnessGoal: 'Weight Loss',
    targetCalories: 380, maxCalories: 450,
    minProtein: 15,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Vegan legume recipes, variety of beans, lentils, split peas, fiber-rich, diverse international preparations. Include Indian dal, Mexican black bean bowls, Middle Eastern falafel, Ethiopian lentil stew. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'G3', block: 'G', name: 'Whole Food Vegan',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['Vegan'],
    fitnessGoal: 'General Fitness',
    mainIngredient: 'Quinoa',
    targetCalories: 400, maxCalories: 480,
    minProtein: 12,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Whole food plant-based recipes, quinoa, nuts, seeds, whole grains, minimally processed vegan ingredients. Include Buddha bowls, smoothie bowls, grain salads, stuffed vegetables. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block H: Meal Prep & Batch Cooking (200 Recipes)
  {
    id: 'H1', block: 'H', name: 'Meal Prep Proteins',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 420, maxCalories: 500,
    minProtein: 30,
    maxPrepTime: 45,
    naturalLanguagePrompt: 'Meal prep friendly recipes, makes 4-6 servings, stores well for 5 days refrigerated, reheats well, great for weekly prep, batch cooking proteins. Include chicken meal prep, beef bowls, fish portions. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'H2', block: 'H', name: 'Batch Cook Bases',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 500,
    minProtein: 25,
    maxPrepTime: 60,
    naturalLanguagePrompt: 'Batch cooking base recipes, makes 6-8 servings, versatile meal foundations, grain bowls, proteins that can be used multiple ways, soups and stews for the week. Include chili, curry bases, roasted protein batches. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block I: Performance Nutrition (200 Recipes)
  {
    id: 'I1', block: 'I', name: 'Endurance/Athletic',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Endurance',
    targetCalories: 550, maxCalories: 650,
    minProtein: 25, minCarbs: 50,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Endurance athlete recipes, marathon training, triathlon fuel, complex carbohydrates, sustained energy, pre and post workout meals for runners and cyclists. Include pasta dishes, rice bowls, energy-dense smoothies. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'I2', block: 'I', name: 'Bodybuilding/Competition',
    phase: 2, tierLevel: 'professional', target: 100,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Muscle Building',
    targetCalories: 450, maxCalories: 520,
    minProtein: 45, maxFat: 12,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Bodybuilding meal prep, competition prep, very high protein, precise macros, lean muscle building, clean bulk and cutting recipes. Include chicken and rice combos, lean beef meals, egg white dishes, protein-packed snacks. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // ============================================================
  // PHASE 3: TIER 1 — ENTERPRISE (+1,500 Recipes)
  // ============================================================

  // Block J: Gourmet & Restaurant-Quality (300 Recipes)
  {
    id: 'J1', block: 'J', name: 'Fine Dining Inspired',
    phase: 3, tierLevel: 'enterprise', target: 100,
    mealTypes: ['Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 480, maxCalories: 580,
    minProtein: 30,
    maxPrepTime: 60,
    naturalLanguagePrompt: 'Fine dining inspired fitness recipes, restaurant-quality presentation, gourmet techniques, elegant plating, premium ingredients, date night worthy while maintaining fitness macros. Include sous vide, reduction sauces, microgreen garnishes. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'J2', block: 'J', name: 'International Gourmet',
    phase: 3, tierLevel: 'enterprise', target: 100,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 450, maxCalories: 550,
    minProtein: 28,
    maxPrepTime: 50,
    naturalLanguagePrompt: 'International gourmet recipes, French techniques, Italian elegance, Japanese precision, upscale interpretations of global cuisines with fitness-friendly macros. Include coq au vin, osso buco, miso-glazed proteins. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'J3', block: 'J', name: "Chef's Specials",
    phase: 3, tierLevel: 'enterprise', target: 100,
    mealTypes: ['Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 500, maxCalories: 600,
    minProtein: 32,
    maxPrepTime: 60,
    naturalLanguagePrompt: "Chef's special recipes, creative flavor combinations, unexpected ingredient pairings, showcase dishes, impressive dinner party meals, culinary creativity with balanced nutrition. Include fusion dishes, deconstructed classics. Each recipe must be unique.",
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block K: World Cuisines Deep Dive (400 Recipes)
  {
    id: 'K1', block: 'K', name: 'Mediterranean',
    phase: 3, tierLevel: 'enterprise', target: 80,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 420, maxCalories: 500,
    minProtein: 25,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Authentic Mediterranean recipes, Greek, Italian, Spanish, Turkish, Lebanese influences, olive oil, fresh herbs, fish, legumes, traditional techniques. Include moussaka, shakshuka, grilled sea bass, Turkish kebabs. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'K2', block: 'K', name: 'Asian (Japanese, Thai, Korean)',
    phase: 3, tierLevel: 'enterprise', target: 80,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Weight Loss',
    targetCalories: 400, maxCalories: 480,
    minProtein: 25,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Asian fitness recipes, Japanese clean eating, Thai flavors, Korean BBQ style, authentic spices and techniques, rice bowls, stir-fries, soups. Include ramen, bibimbap, pad thai, sushi bowls, teriyaki. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'K3', block: 'K', name: 'Mexican/Latin',
    phase: 3, tierLevel: 'enterprise', target: 80,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 440, maxCalories: 520,
    minProtein: 26,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Healthy Mexican and Latin recipes, authentic flavors, fresh salsas, lean proteins, black beans, grilled meats, healthy taco and bowl variations. Include ceviche, carnitas bowls, enchilada bakes, tamale bowls. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'K4', block: 'K', name: 'Indian',
    phase: 3, tierLevel: 'enterprise', target: 80,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 420, maxCalories: 500,
    minProtein: 22,
    maxPrepTime: 45,
    naturalLanguagePrompt: 'Healthy Indian recipes, authentic spices, tandoori, curry, dal, reduced oil versions, traditional flavors with fitness macros, vegetarian and meat options. Include tikka masala, palak paneer, chicken biryani. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'K5', block: 'K', name: 'Middle Eastern',
    phase: 3, tierLevel: 'enterprise', target: 80,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 430, maxCalories: 500,
    minProtein: 24,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Middle Eastern fitness recipes, Persian, Israeli, Egyptian influences, grilled meats, chickpeas, tahini, fresh vegetables, warm spices, healthy mezze. Include shawarma, falafel bowls, kofta. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block L: Ultra-Specialized Diets (300 Recipes)
  {
    id: 'L1', block: 'L', name: 'AIP (Autoimmune Protocol)',
    phase: 3, tierLevel: 'enterprise', target: 75,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['Paleo'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 480,
    minProtein: 25,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'AIP Autoimmune Protocol compliant recipes, no nightshades, no eggs, no nuts, no seeds, no grains, anti-inflammatory, healing foods, gut-friendly. Include bone broth soups, roasted root vegetables, simple grilled proteins. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'L2', block: 'L', name: 'Low-FODMAP',
    phase: 3, tierLevel: 'enterprise', target: 75,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['Gluten-Free'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 480,
    minProtein: 25,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Low-FODMAP recipes, IBS-friendly, no garlic, no onion, limited lactose, digestive-friendly, Monash University guidelines compliant. Use green onion tops, garlic-infused oil, allowed vegetables. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'L3', block: 'L', name: 'Carnivore',
    phase: 3, tierLevel: 'enterprise', target: 75,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Carb'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Beef',
    targetCalories: 500, maxCalories: 650,
    minProtein: 40, maxCarbs: 5,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Carnivore diet recipes, animal products only, beef, organ meats, eggs, fish, zero carb, zero plant foods, variety of meat preparations and cuts. Include ribeye, bone marrow, liver pate, smoked meats. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'L4', block: 'L', name: 'Whole30 Compliant',
    phase: 3, tierLevel: 'enterprise', target: 75,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['Paleo', 'Dairy-Free'],
    fitnessGoal: 'Weight Loss',
    targetCalories: 420, maxCalories: 500,
    minProtein: 25,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Whole30 compliant recipes, no sugar, no alcohol, no grains, no legumes, no dairy, no MSG or sulfites, whole food ingredients only, elimination diet friendly. Include compliant sauces, creative vegetable sides. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block M: Premium Proteins (200 Recipes)
  {
    id: 'M1', block: 'M', name: 'Wagyu/Premium Beef',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Dinner'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Beef',
    targetCalories: 520, maxCalories: 620,
    minProtein: 35,
    maxPrepTime: 45,
    naturalLanguagePrompt: 'Premium beef recipes, wagyu, grass-fed ribeye, filet mignon, prime cuts, steakhouse quality, special occasion worthy, luxury beef preparations. Include reverse-seared steaks, beef carpaccio, beef Wellington. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'M2', block: 'M', name: 'Lobster/Crab',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Carb'],
    fitnessGoal: 'General Fitness',
    targetCalories: 420, maxCalories: 520,
    minProtein: 30,
    maxPrepTime: 40,
    naturalLanguagePrompt: 'Premium shellfish recipes, lobster tail, king crab, Dungeness crab, luxury seafood, celebration meals, elegant presentations with fitness macros. Include lobster thermidor, crab cakes, grilled lobster. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'M3', block: 'M', name: 'Exotic Fish',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 480,
    minProtein: 32,
    maxPrepTime: 35,
    naturalLanguagePrompt: 'Premium fish recipes, Chilean sea bass, mahi mahi, swordfish, branzino, ahi tuna, halibut, upscale fish preparations, restaurant quality. Include miso-glazed sea bass, seared ahi, grilled swordfish. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'M4', block: 'M', name: 'Heritage Poultry',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'Muscle Building',
    mainIngredient: 'Chicken',
    targetCalories: 440, maxCalories: 520,
    minProtein: 35,
    maxPrepTime: 45,
    naturalLanguagePrompt: 'Heritage and premium poultry recipes, free-range chicken, organic turkey, Cornish hen, guinea fowl, specialty poultry preparations, elevated techniques. Include herb-stuffed Cornish hen, organic roasted chicken. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block N: Specific Needs (200 Recipes)
  {
    id: 'N1', block: 'N', name: 'Post-Surgery Recovery',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 350, maxCalories: 450,
    minProtein: 25,
    maxPrepTime: 25,
    naturalLanguagePrompt: 'Post-surgery recovery recipes, easy to digest, soft foods, high protein for healing, anti-inflammatory, gentle on stomach, recovery nutrition. Include bone broth, smoothies, soft proteins, pureed soups. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'N2', block: 'N', name: 'Pregnancy/Postpartum',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'General Fitness',
    targetCalories: 450, maxCalories: 550,
    minProtein: 25,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Pregnancy and postpartum nutrition recipes, folate-rich, iron-rich, safe during pregnancy, nursing-friendly, nutrient-dense for mom and baby, no raw fish or deli meat. Include iron-rich lentil dishes, folate-rich spinach meals. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'N3', block: 'N', name: 'Senior Nutrition',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietaryRestrictions: ['High-Protein', 'Low-Fat'],
    fitnessGoal: 'General Fitness',
    targetCalories: 400, maxCalories: 500,
    minProtein: 25,
    maxPrepTime: 30,
    naturalLanguagePrompt: 'Senior nutrition recipes, easy to chew, bone health focus, calcium-rich, vitamin D, muscle preservation, heart-healthy, appropriate portions for older adults. Include soft fish, tender stews, fortified smoothies. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'N4', block: 'N', name: 'Teen Athletes',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Muscle Building',
    targetCalories: 550, maxCalories: 700,
    minProtein: 30,
    maxPrepTime: 25,
    naturalLanguagePrompt: 'Teen athlete recipes, high school sports nutrition, growth-supporting, quick and appealing to teenagers, pre-game and post-game meals, high energy for active youth. Include protein smoothies, loaded burritos, power bowls. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },

  // Block O: Desserts & Treats (100 Recipes)
  {
    id: 'O1', block: 'O', name: 'Protein Desserts',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Dessert', 'Snack'],
    dietaryRestrictions: ['High-Protein'],
    fitnessGoal: 'Muscle Building',
    targetCalories: 200, maxCalories: 280,
    minProtein: 12, maxFat: 10,
    maxPrepTime: 20,
    naturalLanguagePrompt: 'High-protein dessert recipes, protein powder enhanced, Greek yogurt based, cottage cheese desserts, guilt-free treats, muscle-building sweets. Include protein brownies, cheesecake bites, protein ice cream. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
  {
    id: 'O2', block: 'O', name: 'Low-Cal Treats',
    phase: 3, tierLevel: 'enterprise', target: 50,
    mealTypes: ['Dessert', 'Snack'],
    dietaryRestrictions: ['Low-Fat'],
    fitnessGoal: 'Weight Loss',
    targetCalories: 150, maxCalories: 200,
    minProtein: 5, maxFat: 6,
    maxPrepTime: 20,
    naturalLanguagePrompt: 'Low-calorie dessert recipes, under 200 calories, fruit-based treats, healthy frozen desserts, sugar-free options, satisfying diet-friendly sweets. Include frozen fruit bars, chia pudding, baked apples. Each recipe must be unique.',
    enableImageGeneration: true, enableS3Upload: true, enableNutritionValidation: true,
  },
];

// ============================================================
// EXECUTION ENGINE
// ============================================================

interface BatchProgress {
  batchId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  recipesGenerated?: number;
  targetCount: number;
  serverBatchId?: string;
  error?: string;
}

interface ProgressTracker {
  lastUpdated: string;
  target: string;
  batches: Record<string, BatchProgress>;
}

function loadProgress(): ProgressTracker {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch {}
  return {
    lastUpdated: new Date().toISOString(),
    target: 'unknown',
    batches: {},
  };
}

function saveProgress(progress: ProgressTracker) {
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function login(baseUrl: string): Promise<string> {
  const resp = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });

  if (!resp.ok) {
    throw new Error(`Login failed: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json() as any;
  return data.token;
}

async function startBatch(baseUrl: string, token: string, batch: BatchSpec): Promise<string> {
  const body: Record<string, any> = {
    count: batch.target,
    mealTypes: batch.mealTypes,
    dietaryRestrictions: batch.dietaryRestrictions,
    tierLevels: [batch.tierLevel],
    enableImageGeneration: batch.enableImageGeneration,
    enableS3Upload: batch.enableS3Upload,
    enableNutritionValidation: batch.enableNutritionValidation,
    naturalLanguagePrompt: batch.naturalLanguagePrompt,
  };

  if (batch.fitnessGoal) body.fitnessGoal = batch.fitnessGoal;
  if (batch.mainIngredient) body.mainIngredient = batch.mainIngredient;
  if (batch.targetCalories) body.targetCalories = batch.targetCalories;
  if (batch.maxCalories) body.maxCalories = batch.maxCalories;
  if (batch.minProtein) body.minProtein = batch.minProtein;
  if (batch.maxProtein) body.maxProtein = batch.maxProtein;
  if (batch.minCarbs) body.minCarbs = batch.minCarbs;
  if (batch.maxCarbs) body.maxCarbs = batch.maxCarbs;
  if (batch.minFat) body.minFat = batch.minFat;
  if (batch.maxFat) body.maxFat = batch.maxFat;
  if (batch.maxPrepTime) body.maxPrepTime = batch.maxPrepTime;

  const resp = await fetch(`${baseUrl}/api/admin/generate-bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Batch ${batch.id} failed to start: ${resp.status} ${errorText}`);
  }

  const data = await resp.json() as any;
  console.log(`  Started batch ${batch.id}: batchId=${data.batchId}, estimated=${data.estimatedTime}s`);
  return data.batchId;
}

async function pollBatchStatus(baseUrl: string, token: string, serverBatchId: string): Promise<{ status: string; recipesGenerated: number }> {
  const resp = await fetch(`${baseUrl}/api/admin/generate-bulk/status/${serverBatchId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) {
    return { status: 'unknown', recipesGenerated: 0 };
  }

  const data = await resp.json() as any;
  return {
    status: data.status || 'unknown',
    recipesGenerated: data.recipesGenerated || data.savedCount || 0,
  };
}

async function waitForBatchCompletion(
  baseUrl: string, token: string, serverBatchId: string, batchSpec: BatchSpec
): Promise<{ recipesGenerated: number; success: boolean }> {
  const maxWaitMs = batchSpec.target * 25 * 1000; // ~25s per recipe max
  const pollIntervalMs = 30_000; // poll every 30s
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const { status, recipesGenerated } = await pollBatchStatus(baseUrl, token, serverBatchId);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`  [${elapsed}s] Batch ${batchSpec.id}: status=${status}, recipes=${recipesGenerated}/${batchSpec.target}`);

    if (status === 'completed' || status === 'finished') {
      return { recipesGenerated, success: true };
    }
    if (status === 'failed' || status === 'error') {
      return { recipesGenerated, success: false };
    }
  }

  console.log(`  Batch ${batchSpec.id}: timed out after ${maxWaitMs / 1000}s`);
  return { recipesGenerated: 0, success: false };
}

// ============================================================
// CLI
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1] ||
                    (args.includes('--target') ? args[args.indexOf('--target') + 1] : 'local');
  const baseUrl = TARGETS[targetArg as keyof typeof TARGETS] || targetArg;

  // Status mode
  if (args.includes('--status')) {
    const progress = loadProgress();
    console.log('\n=== EvoFit Recipe Generation Progress ===\n');
    console.log(`Target: ${progress.target}`);
    console.log(`Last updated: ${progress.lastUpdated}\n`);

    let totalTarget = 0, totalGenerated = 0, totalCompleted = 0;

    for (const batch of BATCHES) {
      const bp = progress.batches[batch.id];
      const status = bp?.status || 'pending';
      const generated = bp?.recipesGenerated || 0;
      const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : status === 'skipped' ? '⏭️' : '⬜';
      console.log(`${icon} ${batch.id} ${batch.name.padEnd(35)} ${String(generated).padStart(4)}/${String(batch.target).padStart(4)}  [${batch.tierLevel}]`);
      totalTarget += batch.target;
      totalGenerated += generated;
      if (status === 'completed') totalCompleted++;
    }

    console.log(`\n--- Summary ---`);
    console.log(`Batches: ${totalCompleted}/${BATCHES.length} completed`);
    console.log(`Recipes: ${totalGenerated}/${totalTarget} generated`);
    console.log(`Note: Existing production vegetarian recipes (1,654) are NOT counted above.`);
    console.log(`Total on production after completion: ${totalGenerated + 1654} + existing = target ~5,400+\n`);
    return;
  }

  // Determine which batches to run
  let batchesToRun: BatchSpec[] = [];

  const batchArg = args.find(a => a.startsWith('--batch='))?.split('=')[1] ||
                   (args.includes('--batch') ? args[args.indexOf('--batch') + 1] : null);
  const phaseArg = args.find(a => a.startsWith('--phase='))?.split('=')[1] ||
                   (args.includes('--phase') ? args[args.indexOf('--phase') + 1] : null);
  const blockArg = args.find(a => a.startsWith('--block='))?.split('=')[1] ||
                   (args.includes('--block') ? args[args.indexOf('--block') + 1] : null);

  if (args.includes('--all')) {
    batchesToRun = BATCHES;
  } else if (batchArg) {
    const found = BATCHES.find(b => b.id === batchArg.toUpperCase());
    if (!found) { console.error(`Batch ${batchArg} not found. Valid: ${BATCHES.map(b => b.id).join(', ')}`); return; }
    batchesToRun = [found];
  } else if (phaseArg) {
    batchesToRun = BATCHES.filter(b => b.phase === parseInt(phaseArg));
  } else if (blockArg) {
    batchesToRun = BATCHES.filter(b => b.block === blockArg.toUpperCase());
  } else {
    console.log(`
EvoFit 4,000 Recipe Batch Executor

Usage:
  npx tsx scripts/recipe-batch-executor.ts --target production --batch A1
  npx tsx scripts/recipe-batch-executor.ts --target production --block A
  npx tsx scripts/recipe-batch-executor.ts --target production --phase 1
  npx tsx scripts/recipe-batch-executor.ts --target production --all
  npx tsx scripts/recipe-batch-executor.ts --target production --status
  npx tsx scripts/recipe-batch-executor.ts --target local --batch E1 --no-images

Options:
  --target   production | local (default: local)
  --batch    Single batch ID (A1, B2, E1, etc.)
  --block    All batches in a block (A, B, C, D, E, F, G, H, I, J, K, L, M, N, O)
  --phase    All batches in a phase (1, 2, 3)
  --all      Run all batches
  --status   Show progress report
  --no-images  Skip image generation (faster, for testing)
  --dry-run  Show what would be sent without executing

Batches (${BATCHES.length} total, ${BATCHES.reduce((s, b) => s + b.target, 0)} recipes):
`);
    for (const b of BATCHES) {
      console.log(`  ${b.id.padEnd(4)} ${b.name.padEnd(35)} ${String(b.target).padStart(4)} recipes  [Phase ${b.phase}, ${b.tierLevel}]`);
    }
    return;
  }

  const noImages = args.includes('--no-images');
  const dryRun = args.includes('--dry-run');

  if (noImages) {
    batchesToRun = batchesToRun.map(b => ({ ...b, enableImageGeneration: false, enableS3Upload: false }));
  }

  // Dry run - show what would be sent
  if (dryRun) {
    console.log(`\n=== DRY RUN — Would execute ${batchesToRun.length} batches against ${baseUrl} ===\n`);
    for (const batch of batchesToRun) {
      console.log(`--- Batch ${batch.id}: ${batch.name} ---`);
      console.log(`  Tier: ${batch.tierLevel}`);
      console.log(`  Count: ${batch.target}`);
      console.log(`  Meal Types: ${batch.mealTypes.join(', ')}`);
      console.log(`  Dietary: ${batch.dietaryRestrictions.join(', ')}`);
      if (batch.fitnessGoal) console.log(`  Fitness Goal: ${batch.fitnessGoal}`);
      if (batch.mainIngredient) console.log(`  Main Ingredient: ${batch.mainIngredient}`);
      console.log(`  Calories: target=${batch.targetCalories || 'any'}, max=${batch.maxCalories || 'any'}`);
      console.log(`  Protein: min=${batch.minProtein || 'any'}g, max=${batch.maxProtein || 'any'}g`);
      if (batch.maxFat) console.log(`  Max Fat: ${batch.maxFat}g`);
      if (batch.maxCarbs) console.log(`  Max Carbs: ${batch.maxCarbs}g`);
      if (batch.minCarbs) console.log(`  Min Carbs: ${batch.minCarbs}g`);
      console.log(`  Max Prep Time: ${batch.maxPrepTime || 'any'} min`);
      console.log(`  Images: ${batch.enableImageGeneration ? 'YES' : 'NO'}`);
      console.log(`  Prompt: "${batch.naturalLanguagePrompt.substring(0, 80)}..."`);
      console.log();
    }
    const totalRecipes = batchesToRun.reduce((s, b) => s + b.target, 0);
    const estMinutes = Math.round(totalRecipes * 20 / 60); // ~20s per recipe with images
    console.log(`Total: ${totalRecipes} recipes, ~${estMinutes} minutes (${Math.round(estMinutes / 60)} hours) with images`);
    return;
  }

  // Execute
  console.log(`\n=== Executing ${batchesToRun.length} batches against ${baseUrl} ===\n`);

  const progress = loadProgress();
  progress.target = baseUrl;

  // Login
  console.log('Authenticating...');
  let token: string;
  try {
    token = await login(baseUrl);
    console.log('  Authenticated as admin\n');
  } catch (err) {
    console.error(`  Login failed: ${err}`);
    return;
  }

  for (const batch of batchesToRun) {
    // Skip already completed batches
    if (progress.batches[batch.id]?.status === 'completed') {
      console.log(`⏭️  Batch ${batch.id} already completed, skipping`);
      continue;
    }

    console.log(`\n🚀 Starting Batch ${batch.id}: ${batch.name}`);
    console.log(`   Target: ${batch.target} recipes | Tier: ${batch.tierLevel} | Phase: ${batch.phase}`);

    progress.batches[batch.id] = {
      batchId: batch.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      targetCount: batch.target,
    };
    saveProgress(progress);

    try {
      const serverBatchId = await startBatch(baseUrl, token, batch);
      progress.batches[batch.id].serverBatchId = serverBatchId;
      saveProgress(progress);

      const result = await waitForBatchCompletion(baseUrl, token, serverBatchId, batch);

      if (result.success) {
        progress.batches[batch.id].status = 'completed';
        progress.batches[batch.id].recipesGenerated = result.recipesGenerated;
        progress.batches[batch.id].completedAt = new Date().toISOString();
        console.log(`✅ Batch ${batch.id} completed: ${result.recipesGenerated}/${batch.target} recipes`);
      } else {
        progress.batches[batch.id].status = 'failed';
        progress.batches[batch.id].recipesGenerated = result.recipesGenerated;
        progress.batches[batch.id].error = 'Generation failed or timed out';
        console.log(`❌ Batch ${batch.id} failed: ${result.recipesGenerated}/${batch.target} recipes`);
      }
    } catch (err: any) {
      progress.batches[batch.id].status = 'failed';
      progress.batches[batch.id].error = err.message;
      console.log(`❌ Batch ${batch.id} error: ${err.message}`);
    }

    saveProgress(progress);

    // Re-login periodically (tokens may expire during long runs)
    try { token = await login(baseUrl); } catch {}
  }

  // Final report
  console.log('\n\n=== FINAL REPORT ===\n');
  let totalGenerated = 0;
  for (const batch of batchesToRun) {
    const bp = progress.batches[batch.id];
    const icon = bp?.status === 'completed' ? '✅' : '❌';
    const gen = bp?.recipesGenerated || 0;
    totalGenerated += gen;
    console.log(`${icon} ${batch.id} ${batch.name.padEnd(35)} ${gen}/${batch.target}`);
  }
  console.log(`\nTotal generated this run: ${totalGenerated}`);
  console.log(`Existing production recipes: ~1,654`);
  console.log(`New production total: ~${totalGenerated + 1654}`);
}

main().catch(console.error);
