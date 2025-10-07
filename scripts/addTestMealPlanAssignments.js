import { db } from '../server/db.js';
import { users, personalizedMealPlans } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const testMealPlans = [
  {
    id: "test-plan-1",
    planName: "High Protein Muscle Building",
    fitnessGoal: "muscle_gain",
    description: "A comprehensive 7-day meal plan designed to support muscle growth and recovery",
    dailyCalorieTarget: 2800,
    clientName: "Test Customer",
    days: 7,
    mealsPerDay: 4,
    generatedBy: "trainer",
    createdAt: new Date(),
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-1",
          name: "Protein Power Breakfast Bowl",
          description: "High-protein breakfast with eggs, oats, and berries",
          caloriesKcal: 680,
          proteinGrams: "45",
          carbsGrams: "55",
          fatGrams: "22",
          prepTimeMinutes: 15,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["high-protein"],
          mainIngredientTags: ["eggs", "oats"]
        }
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: "lunch",
        recipe: {
          id: "recipe-2",
          name: "Grilled Chicken & Quinoa",
          description: "Lean protein with complex carbs and vegetables",
          caloriesKcal: 720,
          proteinGrams: "52",
          carbsGrams: "48",
          fatGrams: "18",
          prepTimeMinutes: 25,
          servings: 1,
          mealTypes: ["lunch"],
          dietaryTags: ["high-protein", "gluten-free"],
          mainIngredientTags: ["chicken", "quinoa"]
        }
      }
    ]
  },
  {
    id: "test-plan-2",
    planName: "Fat Loss Accelerator",
    fitnessGoal: "weight_loss",
    description: "A strategic 5-day plan optimized for sustainable fat loss",
    dailyCalorieTarget: 1800,
    clientName: "Test Customer",
    days: 5,
    mealsPerDay: 3,
    generatedBy: "trainer",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-3",
          name: "Greek Yogurt Berry Bowl",
          description: "Low-calorie, high-protein breakfast with antioxidants",
          caloriesKcal: 420,
          proteinGrams: "28",
          carbsGrams: "35",
          fatGrams: "12",
          prepTimeMinutes: 5,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["low-calorie", "high-protein"],
          mainIngredientTags: ["yogurt", "berries"]
        }
      }
    ]
  },
  {
    id: "test-plan-3",
    planName: "Athletic Performance Fuel",
    fitnessGoal: "athletic_performance",
    description: "Performance-focused nutrition for competitive athletes",
    dailyCalorieTarget: 3200,
    clientName: "Test Customer",
    days: 10,
    mealsPerDay: 5,
    generatedBy: "trainer",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-4",
          name: "Pre-Workout Power Stack",
          description: "Optimized pre-training nutrition for peak performance",
          caloriesKcal: 850,
          proteinGrams: "38",
          carbsGrams: "92",
          fatGrams: "28",
          prepTimeMinutes: 12,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["performance", "high-carb"],
          mainIngredientTags: ["oats", "banana", "protein"]
        }
      }
    ]
  },
  {
    id: "test-plan-4",
    planName: "Maintenance Balance",
    fitnessGoal: "maintenance",
    description: "Balanced nutrition for maintaining current physique",
    dailyCalorieTarget: 2200,
    clientName: "Test Customer",
    days: 14,
    mealsPerDay: 3,
    generatedBy: "trainer",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: "breakfast",
        recipe: {
          id: "recipe-5",
          name: "Balanced Breakfast Plate",
          description: "Well-rounded meal with balanced macronutrients",
          caloriesKcal: 580,
          proteinGrams: "32",
          carbsGrams: "48",
          fatGrams: "22",
          prepTimeMinutes: 18,
          servings: 1,
          mealTypes: ["breakfast"],
          dietaryTags: ["balanced"],
          mainIngredientTags: ["eggs", "toast", "avocado"]
        }
      }
    ]
  }
];

async function addTestMealPlanAssignments() {
  try {
    console.log('🎯 Adding test meal plan assignments...');
    
    // Find a customer user (role = 'customer')
    const customers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'customer'))
      .limit(1);
    
    if (customers.length === 0) {
      console.log('❌ No customer users found. Please create a customer account first.');
      console.log('💡 You can create a customer by registering with role "customer"');
      return;
    }
    
    const customer = customers[0];
    console.log(`📋 Found customer: ${customer.email} (ID: ${customer.id})`);
    
    // Find a trainer user to assign as the trainer
    const trainers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'trainer'))
      .limit(1);
    
    let trainerId;
    if (trainers.length > 0) {
      trainerId = trainers[0].id;
      console.log(`👨‍🏫 Found trainer: ${trainers[0].email} (ID: ${trainerId})`);
    } else {
      // Use admin as fallback
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      
      if (admins.length > 0) {
        trainerId = admins[0].id;
        console.log(`👨‍💼 Using admin as trainer: ${admins[0].email} (ID: ${trainerId})`);
      } else {
        console.log('❌ No trainer or admin users found.');
        return;
      }
    }
    
    // Check existing assignments for this customer
    const existingPlans = await db
      .select()
      .from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, customer.id));
    
    console.log(`📋 Customer currently has ${existingPlans.length} existing meal plan(s)`);
    
    // Insert test meal plan assignments
    const assignments = testMealPlans.map(mealPlan => ({
      customerId: customer.id,
      trainerId: trainerId,
      mealPlanData: mealPlan,
      assignedAt: mealPlan.createdAt
    }));
    
    await db.insert(personalizedMealPlans).values(assignments);
    
    console.log(`✅ Successfully assigned ${testMealPlans.length} additional test meal plans to customer ${customer.email}`);
    
    // Verify multiple assignments
    const finalPlans = await db
      .select()
      .from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, customer.id));
      
    console.log(`📊 Customer now has ${finalPlans.length} total meal plan(s)`);
    console.log('\n📋 All assigned meal plans:');
    finalPlans.forEach((assignment, index) => {
      const planData = assignment.mealPlanData;
      console.log(`  ${index + 1}. ${planData.planName} (${planData.fitnessGoal}) - ${planData.dailyCalorieTarget} cal/day`);
    });
    
    console.log('\n🎉 Test data setup complete! You can now:');
    console.log('  • Log in as the customer to see multiple meal plans');
    console.log('  • Test the filtering and search functionality');
    console.log('  • View the statistics dashboard');
    
  } catch (error) {
    console.error('❌ Error adding test meal plan assignments:', error);
  }
}

// Run the script
addTestMealPlanAssignments()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 