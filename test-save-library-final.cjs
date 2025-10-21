#!/usr/bin/env node

async function testSaveToLibrary() {
  console.log('🧪 Final Test: Save to Library Feature\n');

  try {
    // Step 1: Login as trainer
    console.log('1️⃣ Logging in as trainer...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'trainer.test@evofitmeals.com',
        password: 'TestTrainer123!'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('✅ Login successful - Token received\n');

    // Step 2: Generate a meal plan first
    console.log('2️⃣ Generating a meal plan...');
    const generateResponse = await fetch('http://localhost:4000/api/meal-plan/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        numDays: 3,
        mealsPerDay: 3,
        calorieTarget: 2000,
        fitnessGoal: 'maintenance',
        mealDistribution: [0.25, 0.40, 0.35]
      })
    });

    if (!generateResponse.ok) {
      console.error('❌ Meal plan generation failed:', await generateResponse.text());
      return;
    }

    const generatedPlan = await generateResponse.json();
    console.log('✅ Meal plan generated successfully');
    console.log('   - Days:', generatedPlan.days?.length || 0);
    console.log('   - Total Calories:', generatedPlan.totalCalories || 0);

    // Check for images
    if (generatedPlan.days?.[0]?.meals?.[0]?.recipe?.imageUrl) {
      const imageUrl = generatedPlan.days[0].meals[0].recipe.imageUrl;
      const isAIGenerated = !imageUrl.includes('unsplash');
      console.log('   - Image Type:', isAIGenerated ? '🎨 AI-Generated' : '📷 Stock Photo');
      console.log('   - Image URL sample:', imageUrl.substring(0, 50) + '...');
    }
    console.log('');

    // Step 3: Save the generated meal plan to library
    console.log('3️⃣ Saving meal plan to library...');
    const saveResponse = await fetch('http://localhost:4000/api/trainer/meal-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `Automated Test Plan ${new Date().toLocaleString()}`,
        mealPlan: generatedPlan,
        notes: 'Test of Save to Library feature',
        tags: ['test', 'automated', 'verification'],
        isTemplate: true
      })
    });

    const saveResult = await saveResponse.json();

    if (!saveResponse.ok) {
      console.error('❌ Save to library failed:', saveResult);
      return;
    }

    console.log('✅ Meal plan saved to library successfully!');
    console.log('   - Plan ID:', saveResult.id || saveResult.planId);
    console.log('   - Created At:', saveResult.createdAt || 'N/A');
    console.log('');

    // Step 4: Verify it was saved by fetching library
    console.log('4️⃣ Verifying saved meal plans in library...');
    const libraryResponse = await fetch('http://localhost:4000/api/trainer/meal-plans', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!libraryResponse.ok) {
      console.error('❌ Failed to fetch library:', await libraryResponse.text());
      return;
    }

    const library = await libraryResponse.json();
    console.log('✅ Library fetched successfully');
    console.log('   - Total saved plans:', library.length);

    // Find our just-saved plan
    const ourPlan = library.find(p =>
      p.id === saveResult.id ||
      p.planId === saveResult.planId ||
      p.name?.includes('Automated Test Plan')
    );

    if (ourPlan) {
      console.log('   - ✅ Our test plan found in library!');
      console.log('   - Plan Name:', ourPlan.name);
      console.log('   - Plan Status:', ourPlan.status || 'active');
    } else {
      console.log('   - ⚠️ Could not find our test plan in library');
    }
    console.log('');

    // Step 5: Test image generation status
    console.log('5️⃣ Checking image generation...');
    let aiImageCount = 0;
    let stockImageCount = 0;

    if (generatedPlan.days) {
      generatedPlan.days.forEach(day => {
        day.meals?.forEach(meal => {
          if (meal.recipe?.imageUrl) {
            if (meal.recipe.imageUrl.includes('unsplash')) {
              stockImageCount++;
            } else {
              aiImageCount++;
            }
          }
        });
      });
    }

    console.log('   - AI-Generated Images:', aiImageCount);
    console.log('   - Stock Images:', stockImageCount);
    console.log('   - Image Generation Rate:', aiImageCount > 0 ? `${Math.round(aiImageCount / (aiImageCount + stockImageCount) * 100)}%` : '0%');
    console.log('');

    // Final Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL TEST RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Login: SUCCESS');
    console.log('✅ Meal Plan Generation: SUCCESS');
    console.log(saveResponse.ok ? '✅ Save to Library: SUCCESS' : '❌ Save to Library: FAILED');
    console.log(ourPlan ? '✅ Library Persistence: SUCCESS' : '⚠️ Library Persistence: NEEDS VERIFICATION');
    console.log(aiImageCount > 0 ? '✅ AI Image Generation: SUCCESS' : '⚠️ AI Image Generation: USING FALLBACK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (saveResponse.ok && ourPlan) {
      console.log('\n🎉 ALL CRITICAL FEATURES WORKING!');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testSaveToLibrary();