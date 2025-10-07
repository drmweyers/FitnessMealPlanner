// Comprehensive Test Data Generator for FitnessMealPlanner
// This script creates detailed TEST Trainer and TEST Customer profiles
// with complete demo data for client presentations

import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  users, 
  recipes, 
  personalizedMealPlans,
  customerGoals,
  progressMeasurements
} from '../shared/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal',
  ssl: false // since we're running locally in development
});

const db = drizzle(pool);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

console.log(`${colors.bright}${colors.blue}🚀 FitnessMealPlanner Test Data Generator${colors.reset}`);
console.log(`${colors.bright}${colors.blue}===========================================${colors.reset}\n`);

async function generateTestData() {
  try {
    // Step 0: Clean up existing test data
    console.log(`${colors.yellow}🧹 Cleaning up existing test data...${colors.reset}`);
    
    // Delete existing test users (this will cascade to related data)
    await db.delete(users).where(eq(users.email, 'test.trainer@evofitmeals.com'));
    await db.delete(users).where(eq(users.email, 'test.customer@gmail.com'));
    
    console.log(`${colors.green}✅ Cleanup complete${colors.reset}`);

    // Step 1: Create TEST Trainer Profile
    console.log(`\n${colors.yellow}📋 Creating TEST Trainer Profile...${colors.reset}`);
    
    const hashedPassword = await bcrypt.hash('TestDemo123!', 10);
    
    const testTrainer = {
      username: 'test_trainer',
      email: 'test.trainer@evofitmeals.com',
      password: hashedPassword,
      role: 'trainer',
      firstName: 'Michael',
      lastName: 'Thompson',
      bio: `Certified Personal Trainer & Nutrition Specialist with 10+ years of experience.

🏆 Certifications:
• NASM Certified Personal Trainer
• Precision Nutrition Level 2 Coach
• ISSA Sports Nutrition Specialist
• ACE Functional Training Specialist

💪 Specializations:
• Body Transformation Programs
• Athletic Performance Nutrition
• Macro-Based Meal Planning
• Sustainable Weight Management
• Competition Prep (Bodybuilding/Physique)

📊 Success Stories:
• Helped 500+ clients achieve their fitness goals
• Average client weight loss: 15-20 lbs in 12 weeks
• Specializing in busy professionals and athletes
• Creator of the "EvoFit 90-Day Transformation" program

🎯 Training Philosophy:
"Nutrition is the foundation of any successful fitness journey. I believe in creating sustainable, enjoyable meal plans that fit your lifestyle while delivering incredible results. No extreme diets, no suffering - just smart, science-based nutrition that works."

📱 Contact: test.trainer@evofitmeals.com
📍 Location: Los Angeles, CA
⏰ Available: Mon-Fri 6AM-8PM PST`,
      phoneNumber: '(555) 123-4567',
      businessName: 'Thompson Elite Fitness & Nutrition',
      website: 'www.thompsonelitefit.com',
      socialMedia: {
        instagram: '@thompson_elite_fit',
        facebook: 'ThompsonEliteFitness',
        youtube: 'ThompsonFitness'
      },
      specialties: ['Weight Loss', 'Muscle Gain', 'Athletic Performance', 'Competition Prep'],
      yearsExperience: 10,
      clientCapacity: 25,
      currentClients: 18
    };

    const [trainer] = await db.insert(users).values(testTrainer).returning();
    console.log(`${colors.green}✅ TEST Trainer created: ${trainer.username}${colors.reset}`);

    // Step 2: Create TEST Customer Profile
    console.log(`\n${colors.yellow}📋 Creating TEST Customer Profile...${colors.reset}`);
    
    const testCustomer = {
      username: 'test_customer',
      email: 'test.customer@gmail.com',
      password: hashedPassword,
      role: 'customer',
      firstName: 'Sarah',
      lastName: 'Johnson',
      trainerId: trainer.id
    };

    const [customer] = await db.insert(users).values(testCustomer).returning();
    
    // Create customer goals
    const currentDate = new Date();
    const customerGoalData = [
      {
        customerId: customer.id,
        goalName: 'Weight Loss Goal',
        goalType: 'weight_loss',
        currentValue: 75,
        targetValue: 65,
        startDate: currentDate,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: 'in_progress',
        notes: 'Primary goal: lose 10kg in 3 months through balanced nutrition and exercise'
      },
      {
        customerId: customer.id,
        goalName: 'Fitness Improvement Goal',
        goalType: 'fitness',
        targetValue: null,
        startDate: currentDate,
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: 'in_progress',
        notes: 'Improve muscle tone and increase energy levels through strength training'
      }
    ];

    const customerGoalsInserted = await db.insert(customerGoals).values(customerGoalData).returning();

    // Create progress measurements (showing 4 weeks of progress)
    const progressData = [
      // Week 1
      {
        customerId: customer.id,
        weight: 75.0,
        bodyFat: 28.0,
        chest: 95.0,
        waist: 82.0,
        hips: 105.0,
        thigh: 58.0,
        arm: 30.0,
        notes: 'Starting measurements - feeling motivated and ready to start!'
      },
      // Week 2  
      {
        customerId: customer.id,
        weight: 74.2,
        bodyFat: 27.5,
        chest: 94.5,
        waist: 81.5,
        hips: 104.5,
        thigh: 57.8,
        arm: 30.0,
        notes: 'Great first week! Energy levels improving, sleeping better'
      },
      // Week 3
      {
        customerId: customer.id,
        weight: 73.8,
        bodyFat: 27.0,
        chest: 94.0,
        waist: 81.0,
        hips: 104.0,
        thigh: 57.5,
        arm: 30.2,
        notes: 'Clothes fitting better! Strength increasing at the gym'
      },
      // Week 4
      {
        customerId: customer.id,
        weight: 73.5,
        bodyFat: 26.8,
        chest: 94.0,
        waist: 80.5,
        hips: 103.5,
        thigh: 57.3,
        arm: 30.3,
        notes: 'Established good meal prep routine. Feeling more confident!'
      }
    ];

    // Insert progress measurements with weekly intervals
    for (let i = 0; i < progressData.length; i++) {
      const measurementDate = new Date();
      measurementDate.setDate(measurementDate.getDate() - (21 - (i * 7))); // Starting 3 weeks ago
      
      await db.insert(progressMeasurements).values({
        ...progressData[i],
        measurementDate
      });
    }
    console.log(`${colors.green}✅ TEST Customer created: ${customer.username}${colors.reset}`);

    // Step 3: Generate Diverse Recipe Database
    console.log(`\n${colors.yellow}📋 Generating Diverse Recipe Database...${colors.reset}`);
    
    const recipeData = [
      // Breakfast Recipe
      {
        name: 'Protein-Packed Greek Yogurt Bowl',
        description: 'High-protein breakfast bowl with Greek yogurt, berries, and granola',
        mealTypes: ['breakfast'],
        dietaryTags: ['high-protein', 'quick', 'no-cook', 'gluten-free-option'],
        mainIngredientTags: ['yogurt', 'berries'],
        ingredientsJson: [
          { name: 'non-fat Greek yogurt', amount: '1', unit: 'cup' },
          { name: 'mixed berries', amount: '1/2', unit: 'cup' },
          { name: 'low-sugar granola', amount: '2', unit: 'tbsp' },
          { name: 'almond butter', amount: '1', unit: 'tbsp' },
          { name: 'honey', amount: '1', unit: 'tsp' },
          { name: 'chia seeds', amount: '1', unit: 'tbsp' }
        ],
        instructionsText: 'Add Greek yogurt to a bowl.\nTop with mixed berries.\nSprinkle granola and chia seeds.\nDrizzle with almond butter and honey.\nMix gently and enjoy.',
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
        servings: 1,
        caloriesKcal: 320,
        proteinGrams: '28.00',
        carbsGrams: '35.00',
        fatGrams: '10.00',
        isApproved: true
      },
      // Lunch Recipe
      {
        name: 'Grilled Chicken Power Salad',
        description: 'Nutrient-dense salad with grilled chicken and superfoods',
        mealTypes: ['lunch'],
        dietaryTags: ['high-protein', 'balanced', 'gluten-free-option'],
        mainIngredientTags: ['chicken', 'quinoa', 'greens'],
        ingredientsJson: [
          { name: 'grilled chicken breast', amount: '6', unit: 'oz' },
          { name: 'mixed greens', amount: '3', unit: 'cups' },
          { name: 'cooked quinoa', amount: '1/2', unit: 'cup' },
          { name: 'avocado', amount: '1/4', unit: 'whole' },
          { name: 'cherry tomatoes', amount: '1/4', unit: 'cup' },
          { name: 'pumpkin seeds', amount: '2', unit: 'tbsp' },
          { name: 'balsamic vinaigrette', amount: '2', unit: 'tbsp' }
        ],
        instructionsText: 'Season and grill chicken breast.\nPrepare quinoa according to package directions.\nArrange mixed greens in bowl.\nTop with sliced chicken.\nAdd quinoa, avocado, tomatoes.\nSprinkle with pumpkin seeds.\nDrizzle with vinaigrette.',
        prepTimeMinutes: 15,
        cookTimeMinutes: 15,
        servings: 1,
        caloriesKcal: 420,
        proteinGrams: '45.00',
        carbsGrams: '28.00',
        fatGrams: '14.00',
        isApproved: true
      },
      // Dinner Recipe
      {
        name: 'Herb-Crusted Salmon with Asparagus',
        description: 'Omega-3 rich salmon with a flavorful herb crust',
        mealTypes: ['dinner'],
        dietaryTags: ['high-protein', 'omega-3', 'quick', 'gluten-free-option'],
        mainIngredientTags: ['salmon', 'asparagus'],
        ingredientsJson: [
          { name: 'salmon fillet', amount: '6', unit: 'oz' },
          { name: 'Dijon mustard', amount: '1', unit: 'tbsp' },
          { name: 'panko breadcrumbs', amount: '2', unit: 'tbsp' },
          { name: 'fresh herbs', amount: '1', unit: 'tbsp' },
          { name: 'asparagus spears', amount: '12', unit: 'pieces' },
          { name: 'olive oil', amount: '1', unit: 'tbsp' }
        ],
        instructionsText: 'Preheat oven to 400°F.\nBrush salmon with mustard.\nMix breadcrumbs with herbs.\nPress mixture onto salmon.\nArrange on baking sheet with asparagus.\nDrizzle with olive oil.\nBake for 12-15 minutes.\nServe with lemon wedges.',
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        servings: 1,
        caloriesKcal: 380,
        proteinGrams: '42.00',
        carbsGrams: '12.00',
        fatGrams: '18.00',
        isApproved: true
      }
    ];

    const insertedRecipes = await db.insert(recipes).values(recipeData).returning();
    console.log(`${colors.green}✅ Created ${insertedRecipes.length} diverse recipes${colors.reset}`);

    // Step 4: Create Multiple Meal Plans
    console.log(`\n${colors.yellow}📋 Creating Meal Plans for TEST Customer...${colors.reset}`);
    
    const mealPlanData = [
      {
        customerId: customer.id,
        trainerId: trainer.id,
        mealPlanData: {
          id: `plan-${Date.now()}-1`,
          planName: 'Week 1: Kickstart Weight Loss Plan',
          fitnessGoal: 'weight_loss',
          description: 'Balanced meal plan to jumpstart your weight loss journey with delicious, satisfying meals',
          dailyCalorieTarget: 1800,
          clientName: 'Sarah Johnson',
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainer.id,
          createdAt: new Date(),
          startOfWeekMealPrep: {
            totalPrepTime: 120,
            shoppingList: [
              { ingredient: 'Greek yogurt', totalAmount: '7', unit: 'cups', usedInRecipes: ['Protein-Packed Greek Yogurt Bowl'] },
              { ingredient: 'Mixed berries', totalAmount: '3.5', unit: 'cups', usedInRecipes: ['Protein-Packed Greek Yogurt Bowl'] },
              { ingredient: 'Chicken breast', totalAmount: '2', unit: 'lbs', usedInRecipes: ['Grilled Chicken Power Salad'] }
            ],
            prepInstructions: [
              { step: 1, instruction: 'Grill chicken breasts for the week', estimatedTime: 30, ingredients: ['chicken breast'] },
              { step: 2, instruction: 'Wash and portion berries', estimatedTime: 15, ingredients: ['mixed berries'] }
            ],
            storageInstructions: [
              { ingredient: 'Grilled chicken', method: 'refrigerate', duration: '4-5 days' },
              { ingredient: 'Berries', method: 'refrigerate', duration: '3-5 days' }
            ]
          },
          weeklyMeals: {
            'day1': {
              breakfast: { recipeId: insertedRecipes[0].id, servings: 1 },
              lunch: { recipeId: insertedRecipes[1].id, servings: 1 },
              dinner: { recipeId: insertedRecipes[2].id, servings: 1 },
              snack: { recipeId: insertedRecipes[0].id, servings: 0.5 }
            },
            'day2': {
              breakfast: { recipeId: insertedRecipes[0].id, servings: 1 },
              lunch: { recipeId: insertedRecipes[1].id, servings: 1 },
              dinner: { recipeId: insertedRecipes[2].id, servings: 1 },
              snack: { recipeId: insertedRecipes[1].id, servings: 0.5 }
            }
          },
          macroTargets: { protein: 135, carbs: 180, fat: 60 },
          isActive: true,
          tags: ['weight-loss', 'balanced', 'meal-prep-friendly']
        }
      },
      {
        customerId: customer.id,
        trainerId: trainer.id,
        mealPlanData: {
          id: `plan-${Date.now()}-2`,
          planName: 'Week 2: Energy Boost Plan',
          fitnessGoal: 'energy_boost',
          description: 'Designed to increase energy levels while maintaining calorie deficit',
          dailyCalorieTarget: 1850,
          clientName: 'Sarah Johnson',
          days: 7,
          mealsPerDay: 4,
          generatedBy: trainer.id,
          createdAt: new Date(),
          startOfWeekMealPrep: {
            totalPrepTime: 90,
            shoppingList: [
              { ingredient: 'Quinoa', totalAmount: '2', unit: 'cups', usedInRecipes: ['Grilled Chicken Power Salad'] },
              { ingredient: 'Sweet potatoes', totalAmount: '5', unit: 'medium', usedInRecipes: ['Various'] }
            ],
            prepInstructions: [
              { step: 1, instruction: 'Cook quinoa in bulk', estimatedTime: 20, ingredients: ['quinoa'] }
            ],
            storageInstructions: [
              { ingredient: 'Cooked quinoa', method: 'refrigerate', duration: '5 days' }
            ]
          },
          weeklyMeals: {
            'day1': {
              breakfast: { recipeId: insertedRecipes[0].id, servings: 1 },
              lunch: { recipeId: insertedRecipes[1].id, servings: 1 },
              dinner: { recipeId: insertedRecipes[2].id, servings: 1 },
              snack: { recipeId: insertedRecipes[1].id, servings: 0.5 }
            }
          },
          macroTargets: { protein: 140, carbs: 185, fat: 58 },
          isActive: false,
          tags: ['energy-boost', 'performance', 'balanced']
        }
      }
    ];

    const insertedMealPlans = await db.insert(personalizedMealPlans).values(mealPlanData).returning();
    console.log(`${colors.green}✅ Created ${insertedMealPlans.length} meal plans${colors.reset}`);

    console.log(`${colors.green}✅ Meal plans created and ready for customization${colors.reset}`);

    // Step 5: Display Summary
    console.log(`\n${colors.bright}${colors.green}🎉 TEST DATA GENERATION COMPLETE!${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}===========================================${colors.reset}`);
    
    console.log(`\n${colors.bright}📊 Summary:${colors.reset}`);
    console.log(`${colors.green}✅ TEST Trainer Profile:${colors.reset}`);
    console.log(`   Username: test_trainer`);
    console.log(`   Email: test.trainer@evofitmeals.com`);
    console.log(`   Password: TestDemo123!`);
    console.log(`   Specialties: Weight Loss, Muscle Gain, Athletic Performance`);
    
    console.log(`\n${colors.green}✅ TEST Customer Profile:${colors.reset}`);
    console.log(`   Username: test_customer`);
    console.log(`   Email: test.customer@gmail.com`);
    console.log(`   Password: TestDemo123!`);
    console.log(`   Goal: Lose 10kg in 3 months`);
    console.log(`   Current Progress: 1.5kg lost in 4 weeks`);
    
    console.log(`\n${colors.green}✅ Recipe Database:${colors.reset}`);
    console.log(`   Total Recipes: ${insertedRecipes.length}`);
    console.log(`   Categories: Breakfast, Lunch, Dinner, Snacks`);
    console.log(`   All recipes include macros and are gluten-free adaptable`);
    
    console.log(`\n${colors.green}✅ Meal Plans:${colors.reset}`);
    console.log(`   Total Plans: ${insertedMealPlans.length}`);
    console.log(`   Duration: 4 weeks of progressive meal planning`);
    console.log(`   Each plan includes daily meals with macro targets`);
    
    console.log(`\n${colors.bright}${colors.yellow}🚀 Next Steps:${colors.reset}`);
    console.log(`1. Login to the application at http://localhost:4000`);
    console.log(`2. Use TEST Trainer credentials to manage recipes and plans`);
    console.log(`3. Use TEST Customer credentials to view meal plans`);
    console.log(`4. Export PDFs to demonstrate functionality`);
    console.log(`5. Show shopping list generation and progress tracking`);
    
    console.log(`\n${colors.bright}${colors.blue}Perfect for client demonstrations!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error generating test data:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the generator
generateTestData();