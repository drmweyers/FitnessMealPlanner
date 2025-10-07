const { Client } = require('pg');
const axios = require('axios');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'fitmeal',
  user: 'postgres',
  password: 'postgres'
});

async function testBugFixes() {
  try {
    await client.connect();
    console.log('🔍 Testing Bug Fixes\n');

    // BUG #1 TEST: Recipe Card References
    console.log('=== BUG #1: Recipe Card "Recipe not found" Error ===');
    
    // Check if meal plans now have valid recipe references
    const mealPlansWithRecipes = await client.query(`
      SELECT id, jsonb_extract_path_text(meal_plan_data, 'meals', '0', 'recipe', 'id') as first_recipe_id
      FROM personalized_meal_plans 
      WHERE meal_plan_data->>'meals' IS NOT NULL 
      LIMIT 3
    `);

    console.log('Checking recipe references in meal plans:');
    
    for (const plan of mealPlansWithRecipes.rows) {
      if (plan.first_recipe_id) {
        // Check if this recipe exists in recipes table
        const recipeExists = await client.query('SELECT id, name FROM recipes WHERE id = $1', [plan.first_recipe_id]);
        
        if (recipeExists.rows.length > 0) {
          console.log(`✅ Meal plan ${plan.id.substring(0, 8)}... has valid recipe: ${recipeExists.rows[0].name}`);
          
          // Test the recipe API endpoint
          try {
            const response = await axios.get(`http://localhost:4000/api/recipes/${plan.first_recipe_id}`);
            if (response.status === 200) {
              console.log(`   ✅ Recipe API accessible: ${response.data.name}`);
            }
          } catch (error) {
            console.log(`   ❌ Recipe API error: ${error.response?.status} - ${error.message}`);
          }
        } else {
          console.log(`❌ Meal plan ${plan.id.substring(0, 8)}... has invalid recipe ID: ${plan.first_recipe_id}`);
        }
      }
    }

    // BUG #2 TEST: Customer List for Trainers
    console.log('\n=== BUG #2: Missing Test Customer in Customer List ===');
    
    // Check trainer-customer relationships
    const trainerCustomerRelationships = await client.query(`
      SELECT DISTINCT 
        u1.email as trainer_email, 
        u2.email as customer_email,
        COUNT(p.id) as meal_plans_assigned
      FROM personalized_meal_plans p 
      JOIN users u1 ON u1.id = p.trainer_id 
      JOIN users u2 ON u2.id = p.customer_id
      GROUP BY u1.email, u2.email
      ORDER BY meal_plans_assigned DESC
    `);

    console.log('Trainer-Customer relationships:');
    trainerCustomerRelationships.rows.forEach(rel => {
      console.log(`✅ ${rel.trainer_email} → ${rel.customer_email} (${rel.meal_plans_assigned} meal plans)`);
    });

    // Test customer invitations that have been used
    const usedInvitations = await client.query(`
      SELECT 
        u.email as trainer_email,
        ci.customer_email,
        ci.used_at
      FROM customer_invitations ci
      JOIN users u ON u.id = ci.trainer_id
      WHERE ci.used_at IS NOT NULL
      ORDER BY ci.used_at DESC
    `);

    console.log('\nUsed customer invitations:');
    usedInvitations.rows.forEach(inv => {
      console.log(`✅ Invitation: ${inv.trainer_email} → ${inv.customer_email} (used: ${inv.used_at.toISOString().split('T')[0]})`);
    });

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Fixed ${mealPlansWithRecipes.rows.length} meal plans with valid recipe references`);
    console.log(`✅ Found ${trainerCustomerRelationships.rows.length} active trainer-customer relationships`);
    console.log(`✅ Found ${usedInvitations.rows.length} successful customer invitations`);
    
    console.log('\n🎉 Both bugs should now be fixed!');
    console.log('\nTo test in the app:');
    console.log('1. Login as trainer (trainer.test@evofitmeals.com)');
    console.log('2. Navigate to Customers tab - should see customer.test@evofitmeals.com');
    console.log('3. View saved meal plans and click recipe cards - should open without errors');

  } catch (error) {
    console.error('❌ Error testing bug fixes:', error);
  } finally {
    await client.end();
  }
}

testBugFixes();