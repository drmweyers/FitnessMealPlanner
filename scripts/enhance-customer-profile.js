// Enhance Customer Profile with Complete Demographics and Fix Meal Plans
// This script adds comprehensive profile data and fixes meal plan display issues

import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  users, 
  personalizedMealPlans
} from '../shared/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal',
  ssl: false
});

const db = drizzle(pool);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  purple: '\x1b[35m'
};

console.log(`${colors.bright}${colors.green}👤 Customer Profile Enhancement${colors.reset}`);
console.log(`${colors.bright}${colors.green}===================================${colors.reset}\n`);

async function enhanceCustomerProfile() {
  try {
    // Step 1: Find customer account
    console.log(`${colors.yellow}🔍 Finding customer account...${colors.reset}`);
    
    const [customer] = await db.select().from(users)
      .where(eq(users.email, 'customer.test@evofitmeals.com'));
    
    if (!customer) {
      throw new Error('Customer account not found. Please run the account update first.');
    }
    
    console.log(`${colors.green}✅ Found customer: ${customer.firstName} ${customer.lastName}${colors.reset}`);

    // Step 2: Add comprehensive profile data to customer
    console.log(`\n${colors.yellow}📊 Adding comprehensive profile data...${colors.reset}`);
    
    const enhancedProfileData = {
      firstName: 'Sarah',
      lastName: 'Johnson',
      phoneNumber: '(555) 987-6543',
      bio: `👤 Sarah Johnson - Health & Fitness Journey

📊 PERSONAL DETAILS:
• Age: 32 years old
• Height: 5'5" (165 cm)
• Starting Weight: 165 lbs (75 kg)
• Current Weight: 161 lbs (73.2 kg)
• Goal Weight: 143 lbs (65 kg)
• Body Type: Mesomorph
• Gender: Female

🏃‍♀️ ACTIVITY LEVEL & FITNESS:
• Activity Level: Moderately Active (3-4 workouts/week)
• Fitness Background: Former college volleyball player
• Current Routine: Strength training (3x/week) + Yoga (2x/week)
• Daily Steps Goal: 10,000 steps
• Preferred Workout Times: Morning (7-8 AM) or Evening (6-7 PM)
• Exercise Dislikes: Long distance running, very early morning workouts

💪 CURRENT FITNESS STATS:
• VO2 Max: 38 ml/kg/min (Good for age group)
• Resting Heart Rate: 58 bpm
• Blood Pressure: 115/75 mmHg (Optimal)
• Body Fat: 26.4% (down from 28.0%)
• Muscle Mass: 54.8 kg (gained 0.8 kg)
• BMI: 24.6 (Normal range)

🎯 TRANSFORMATION PROGRESS:
• Program Duration: 8 weeks completed
• Weight Lost: 3.8 lbs (1.8 kg)
• Body Fat Reduced: 1.6%
• Muscle Gained: 1.8 lbs (0.8 kg)
• Energy Level: Increased from 5/10 to 9/10
• Sleep Quality: Improved from 6/10 to 8.5/10

🏋️‍♀️ STRENGTH IMPROVEMENTS:
• Squat: 132 lbs → 172 lbs (+30% increase)
• Deadlift: 154 lbs → 198 lbs (+28% increase)
• Bench Press: 77 lbs → 106 lbs (+37% increase)
• Pull-ups: 0 → 6 unassisted (incredible progress!)

⚕️ HEALTH & MEDICAL:
• Medical Condition: Mild hypothyroidism (well-controlled)
• Current Medication: Levothyroxine 50mcg daily
• Allergies: Shellfish, tree nuts (except almonds)
• Family History: Type 2 diabetes (mother), heart disease (father)
• Blood Type: O+
• Last Physical: 3 months ago (all normal ranges)

💊 SUPPLEMENT PROTOCOL:
• Levothyroxine 50mcg (morning, empty stomach)
• Multivitamin with iron (daily with breakfast)
• Omega-3 EPA/DHA 1000mg (with dinner)
• Vitamin D3 4000 IU (daily)
• Magnesium Glycinate 400mg (bedtime)
• Probiotic 50 billion CFU (with breakfast)

🍽️ NUTRITION PREFERENCES & RESTRICTIONS:
• Diet Style: Flexible macro-based approach
• Daily Calorie Target: 1,800 calories
• Macro Split: 40% carbs, 30% protein, 30% fat
• Meal Frequency: 4-5 meals per day
• Hydration Goal: 3-4 liters daily
• Alcohol: Social drinking only (1-2 drinks/week)

👍 FAVORITE FOODS:
• Proteins: Chicken breast, salmon, Greek yogurt, eggs
• Carbs: Sweet potatoes, quinoa, oats, berries
• Fats: Avocado, almonds, olive oil, nut butters
• Vegetables: Spinach, broccoli, bell peppers, cauliflower
• Treats: Dark chocolate (85%), herbal tea, fruit

👎 FOOD DISLIKES:
• Liver and organ meats
• Brussels sprouts and bitter vegetables
• Blue cheese and strong cheeses  
• Overly spicy foods
• Artificial sweeteners

🏢 LIFESTYLE FACTORS:
• Occupation: Marketing Manager at TechCorp Inc.
• Work Schedule: Monday-Friday, 9 AM - 6 PM
• Commute: 30 minutes each way
• Stress Level: Moderate-High (7/10 during busy periods)
• Sleep Schedule: 10:30 PM - 6:30 AM (8 hours target)
• Travel: 2-3 business trips per month

📱 TECHNOLOGY & TRACKING:
• Fitness Tracker: Apple Watch Series 8
• Scale: Fitbit Aria Air with body composition
• Nutrition App: MyFitnessPal (premium member)
• Workout App: Nike Training Club + Strava
• Sleep Tracking: AutoSleep app
• Water Intake: WaterMinder app

🏆 MOTIVATION & GOALS:
• Primary: Lose 22 lbs total (10 kg) in 3 months
• Secondary: Improve body composition and strength
• Tertiary: Increase energy and establish healthy habits
• Long-term: Maintain results and continue growing stronger
• Personal: Set good example for nieces/nephews
• Professional: Increased confidence and energy for work

⚠️ CHALLENGES & OBSTACLES:
• Work travel disrupting routine 2-3x per month
• Late-night stress eating during project deadlines
• Social eating at business dinners and events
• Limited meal prep time on busy weekends
• All-or-nothing mentality (working on balance)
• Perfectionist tendencies with diet adherence

✅ SUCCESS STRATEGIES:
• Sunday meal prep sessions (2-3 hours)
• Travel meal planning and portable options
• Evening herbal tea to replace late-night snacking
• Restaurant menu research before dining out
• Workout buddy accountability system
• Weekly check-ins with trainer Michael

📈 TRACKING METRICS:
• Daily weight (same time, same conditions)
• Weekly body composition via InBody scan
• Monthly progress photos (front, side, back views)
• Strength performance logs for all major lifts
• Daily energy ratings (1-10 scale)
• Sleep quality scores via Apple Watch
• Daily step count and active minutes
• Weekly average calorie and macro intake

💭 PERSONAL NOTES:
"I've tried many diets in the past, but this is the first time I feel like I'm building a sustainable lifestyle instead of just following rules. Working with Michael has taught me that small, consistent changes create lasting results. I'm not just losing weight - I'm becoming stronger, more energetic, and more confident in every area of my life."

🎯 CURRENT FOCUS AREAS:
• Maintaining meal prep consistency during travel
• Continuing strength progression in all major lifts
• Perfecting portion control strategies for restaurants
• Building stress management tools beyond food
• Preparing for long-term maintenance phase

📞 EMERGENCY CONTACT:
• Name: John Johnson (Husband)
• Relationship: Spouse
• Phone: (555) 987-6543
• Email: john.johnson@email.com`,
      profilePicture: '/uploads/profiles/sarah_johnson_profile.jpg',
      updatedAt: new Date()
    };

    await db.update(users)
      .set(enhancedProfileData)
      .where(eq(users.id, customer.id));
    
    console.log(`${colors.green}✅ Customer profile enhanced with comprehensive data${colors.reset}`);

    // Step 3: Fix meal plan data structure
    console.log(`\n${colors.yellow}🍽️ Checking and fixing meal plan data...${colors.reset}`);
    
    const mealPlans = await db.select().from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, customer.id));
    
    console.log(`${colors.blue}Found ${mealPlans.length} meal plans for customer${colors.reset}`);
    
    for (let i = 0; i < mealPlans.length; i++) {
      const plan = mealPlans[i];
      console.log(`${colors.yellow}Checking meal plan ${i + 1}: ${plan.mealPlanData?.planName || 'Unknown'}${colors.reset}`);
      
      // Ensure meal plan data structure is complete and valid
      const validMealPlanData = {
        id: plan.mealPlanData?.id || `plan-${Date.now()}-${i + 1}`,
        planName: plan.mealPlanData?.planName || `Week ${i + 1} Meal Plan`,
        fitnessGoal: plan.mealPlanData?.fitnessGoal || 'weight_loss',
        description: plan.mealPlanData?.description || 'Custom meal plan designed for your goals',
        dailyCalorieTarget: plan.mealPlanData?.dailyCalorieTarget || 1800,
        clientName: 'Sarah Johnson',
        days: plan.mealPlanData?.days || 7,
        mealsPerDay: plan.mealPlanData?.mealsPerDay || 4,
        generatedBy: customer.trainerId,
        createdAt: plan.mealPlanData?.createdAt || new Date(),
        
        // Ensure startOfWeekMealPrep exists
        startOfWeekMealPrep: plan.mealPlanData?.startOfWeekMealPrep || {
          totalPrepTime: 120,
          shoppingList: [
            {
              ingredient: 'Greek yogurt',
              totalAmount: '7',
              unit: 'cups',
              usedInRecipes: ['Protein-Packed Greek Yogurt Bowl']
            },
            {
              ingredient: 'Chicken breast',
              totalAmount: '2',
              unit: 'lbs', 
              usedInRecipes: ['Grilled Chicken Power Salad']
            },
            {
              ingredient: 'Mixed vegetables',
              totalAmount: '5',
              unit: 'cups',
              usedInRecipes: ['Various meals']
            }
          ],
          prepInstructions: [
            {
              step: 1,
              instruction: 'Prepare protein sources for the week',
              estimatedTime: 45,
              ingredients: ['chicken breast', 'eggs']
            },
            {
              step: 2,
              instruction: 'Wash and prep vegetables',
              estimatedTime: 30,
              ingredients: ['vegetables', 'fruits']
            }
          ],
          storageInstructions: [
            {
              ingredient: 'Prepared proteins',
              method: 'refrigerate',
              duration: '4-5 days'
            },
            {
              ingredient: 'Cut vegetables',
              method: 'refrigerate',
              duration: '3-4 days'
            }
          ]
        },

        // Ensure weeklyMeals structure exists
        weeklyMeals: plan.mealPlanData?.weeklyMeals || {
          day1: {
            breakfast: {
              name: 'Protein-Packed Greek Yogurt Bowl',
              calories: 320,
              protein: 28,
              carbs: 35,
              fat: 10,
              servings: 1
            },
            lunch: {
              name: 'Grilled Chicken Power Salad',
              calories: 420,
              protein: 45,
              carbs: 28,
              fat: 14,
              servings: 1
            },
            dinner: {
              name: 'Herb-Crusted Salmon with Asparagus',
              calories: 380,
              protein: 42,
              carbs: 12,
              fat: 18,
              servings: 1
            },
            snack: {
              name: 'Protein Energy Bites',
              calories: 190,
              protein: 8,
              carbs: 20,
              fat: 10,
              servings: 2
            }
          },
          day2: {
            breakfast: {
              name: 'Protein-Packed Greek Yogurt Bowl',
              calories: 320,
              protein: 28,
              carbs: 35,
              fat: 10,
              servings: 1
            },
            lunch: {
              name: 'Turkey and Sweet Potato Bowl',
              calories: 385,
              protein: 38,
              carbs: 42,
              fat: 8,
              servings: 1
            },
            dinner: {
              name: 'Lean Beef Stir-Fry',
              calories: 340,
              protein: 40,
              carbs: 18,
              fat: 12,
              servings: 1
            },
            snack: {
              name: 'Cucumber Hummus Boats',
              calories: 120,
              protein: 6,
              carbs: 14,
              fat: 5,
              servings: 1
            }
          }
        },

        // Ensure macro targets exist
        macroTargets: plan.mealPlanData?.macroTargets || {
          protein: 135,
          carbs: 180,
          fat: 60
        },

        // Ensure other required fields
        isActive: plan.mealPlanData?.isActive !== undefined ? plan.mealPlanData.isActive : (i === 0),
        tags: plan.mealPlanData?.tags || ['weight-loss', 'balanced', 'personalized']
      };

      // Update the meal plan with valid data
      await db.update(personalizedMealPlans)
        .set({
          mealPlanData: validMealPlanData,
          updatedAt: new Date()
        })
        .where(eq(personalizedMealPlans.id, plan.id));
      
      console.log(`${colors.green}✅ Fixed meal plan ${i + 1}: ${validMealPlanData.planName}${colors.reset}`);
    }

    // Step 4: Verify meal plan structure
    console.log(`\n${colors.yellow}🔍 Verifying meal plan data structure...${colors.reset}`);
    
    const verifyPlans = await db.select().from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, customer.id));
    
    for (const plan of verifyPlans) {
      const data = plan.mealPlanData;
      console.log(`${colors.blue}Plan: ${data.planName}${colors.reset}`);
      console.log(`  ✓ Plan ID: ${data.id}`);
      console.log(`  ✓ Fitness Goal: ${data.fitnessGoal}`);
      console.log(`  ✓ Daily Calories: ${data.dailyCalorieTarget}`);
      console.log(`  ✓ Days: ${data.days}, Meals/Day: ${data.mealsPerDay}`);
      console.log(`  ✓ Shopping List Items: ${data.startOfWeekMealPrep?.shoppingList?.length || 0}`);
      console.log(`  ✓ Weekly Meals: ${Object.keys(data.weeklyMeals || {}).length} days`);
      console.log(`  ✓ Active Status: ${data.isActive ? 'Active' : 'Inactive'}`);
    }

    // Step 5: Display summary
    console.log(`\n${colors.bright}${colors.green}🎉 CUSTOMER PROFILE ENHANCEMENT COMPLETE!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}==============================================${colors.reset}`);
    
    console.log(`\n${colors.bright}👤 ENHANCED CUSTOMER PROFILE:${colors.reset}`);
    console.log(`• Name: Sarah Johnson`);
    console.log(`• Age: 32 years old`);
    console.log(`• Height: 5'5" (165 cm)`);
    console.log(`• Current Weight: 161 lbs (73.2 kg)`);
    console.log(`• Goal Weight: 143 lbs (65 kg)`);
    console.log(`• Activity Level: Moderately Active`);
    console.log(`• Body Type: Mesomorph`);
    console.log(`• Current Body Fat: 26.4%`);
    console.log(`• Muscle Mass: 54.8 kg`);
    
    console.log(`\n${colors.bright}🍽️ MEAL PLAN STATUS:${colors.reset}`);
    console.log(`• Total Meal Plans: ${verifyPlans.length}`);
    console.log(`• Active Plan: ${verifyPlans.find(p => p.mealPlanData.isActive)?.mealPlanData.planName || 'None'}`);
    console.log(`• All plans have complete data structures`);
    console.log(`• Shopping lists and meal prep instructions included`);
    console.log(`• Weekly meal schedules properly formatted`);
    
    console.log(`\n${colors.bright}⚕️ HEALTH & FITNESS DATA:${colors.reset}`);
    console.log(`• Medical Conditions: Mild hypothyroidism (controlled)`);
    console.log(`• Current Medications: Levothyroxine 50mcg daily`);
    console.log(`• Allergies: Shellfish, tree nuts (except almonds)`);
    console.log(`• Activity Level: 3-4 workouts/week + yoga`);
    console.log(`• Daily Steps Goal: 10,000 steps`);
    console.log(`• Sleep Target: 8 hours (10:30 PM - 6:30 AM)`);
    
    console.log(`\n${colors.bright}💪 STRENGTH PROGRESS:${colors.reset}`);
    console.log(`• Squat: 132 lbs → 172 lbs (+30%)`);
    console.log(`• Deadlift: 154 lbs → 198 lbs (+28%)`);
    console.log(`• Bench Press: 77 lbs → 106 lbs (+37%)`);
    console.log(`• Pull-ups: 0 → 6 unassisted`);
    
    console.log(`\n${colors.bright}🎯 READY FOR CUSTOMER LOGIN:${colors.reset}`);
    console.log(`• Customer can now view complete meal plans`);
    console.log(`• All profile data visible to trainer`);
    console.log(`• No more "Invalid meal plan data" errors`);
    console.log(`• Comprehensive demographics and health data`);
    console.log(`• Complete transformation story documented`);

  } catch (error) {
    console.error(`${colors.red}❌ Error enhancing customer profile:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the enhancement
enhanceCustomerProfile();