#!/usr/bin/env node

async function testAdminFeatures() {
  console.log('🧪 Testing FitnessMealPlanner Admin Features...\n');

  // First, login as admin
  console.log('1️⃣ Logging in as admin...');
  const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@fitmeal.pro',
      password: 'AdminPass123'
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('✅ Login successful, got token\n');

  // Test 1: Natural Language Parsing
  console.log('2️⃣ Testing Natural Language Parsing...');
  try {
    const parseResponse = await fetch('http://localhost:4000/api/admin/parse-natural-language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        naturalLanguageInput: 'Create 5 high-protein breakfast recipes for weight loss, around 400 calories each, with eggs as main ingredient'
      })
    });

    if (parseResponse.ok) {
      const parseData = await parseResponse.json();
      console.log('✅ Natural language parsing works!');
      console.log('   Parsed data:', JSON.stringify(parseData, null, 2).substring(0, 200) + '...\n');
    } else {
      console.error('❌ Natural language parsing failed:', await parseResponse.text());
    }
  } catch (error) {
    console.error('❌ Natural language parsing error:', error.message);
  }

  // Test 2: Recipe Generation with Manual Config
  console.log('3️⃣ Testing Manual Recipe Generation...');
  try {
    const generateResponse = await fetch('http://localhost:4000/api/admin/generate-recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        count: 2,
        mealType: 'breakfast',
        dietaryTag: 'keto',
        maxPrepTime: 30,
        minCalories: 300,
        maxCalories: 500,
        minProtein: 20,
        maxProtein: 40,
        focusIngredient: 'eggs'
      })
    });

    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Manual recipe generation initiated!');
      console.log('   Response:', JSON.stringify(generateData, null, 2).substring(0, 200) + '...\n');
    } else {
      console.error('❌ Recipe generation failed:', await generateResponse.text());
    }
  } catch (error) {
    console.error('❌ Recipe generation error:', error.message);
  }

  // Test 3: Fetch Admin Recipes
  console.log('4️⃣ Testing Recipe Fetching...');
  try {
    const recipesResponse = await fetch('http://localhost:4000/api/admin/recipes?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (recipesResponse.ok) {
      const recipesData = await recipesResponse.json();
      console.log('✅ Recipe fetching works!');
      console.log(`   Found ${recipesData.recipes?.length || 0} recipes`);
      console.log(`   Total recipes in database: ${recipesData.total || 0}\n`);
    } else {
      console.error('❌ Recipe fetching failed:', await recipesResponse.text());
    }
  } catch (error) {
    console.error('❌ Recipe fetching error:', error.message);
  }

  // Test 4: Get Admin Stats
  console.log('5️⃣ Testing Admin Stats...');
  try {
    const statsResponse = await fetch('http://localhost:4000/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Admin stats work!');
      console.log('   Stats:', JSON.stringify(statsData, null, 2).substring(0, 300) + '...\n');
    } else {
      console.error('❌ Stats fetching failed:', await statsResponse.text());
    }
  } catch (error) {
    console.error('❌ Stats fetching error:', error.message);
  }

  // Test 5: Test Natural Language Meal Plan Parsing
  console.log('6️⃣ Testing Meal Plan Natural Language Parsing...');
  try {
    const mealPlanResponse = await fetch('http://localhost:4000/api/meal-plan/parse-natural-language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        naturalLanguageInput: 'I need a 7-day meal plan for weight loss, 1800 calories per day, high protein, low carb'
      })
    });

    if (mealPlanResponse.ok) {
      const mealPlanData = await mealPlanResponse.json();
      console.log('✅ Meal plan natural language parsing works!');
      console.log('   Parsed plan:', JSON.stringify(mealPlanData, null, 2).substring(0, 200) + '...\n');
    } else {
      console.error('❌ Meal plan parsing failed:', await mealPlanResponse.text());
    }
  } catch (error) {
    console.error('❌ Meal plan parsing error:', error.message);
  }

  console.log('\n🎯 Test Summary:');
  console.log('- Login: ✅');
  console.log('- Natural Language Parsing: Check above');
  console.log('- Manual Recipe Generation: Check above');
  console.log('- Recipe Fetching: Check above');
  console.log('- Admin Stats: Check above');
  console.log('- Meal Plan Parsing: Check above');

  console.log('\n✨ All API endpoints have been tested!');
}

// Run the test
testAdminFeatures().catch(console.error);