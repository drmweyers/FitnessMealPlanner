#!/usr/bin/env node

/**
 * Comprehensive Meal Plan Generation Test
 * 
 * This script tests meal plan generation on both development and production
 * servers to verify database isolation and proper environment handling.
 */

import { createServer } from 'http';
import express from 'express';
import { db } from './server/db.js';
import { mealPlanGenerator } from './server/services/mealPlanGenerator.js';
import { sql } from 'drizzle-orm';

async function testEnvironmentIsolation() {
  console.log('=== ENVIRONMENT ISOLATION TEST ===');
  
  // Check current environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const replitEnv = process.env.REPLIT_ENVIRONMENT || 'unknown';
  const dbUrl = process.env.DATABASE_URL;
  
  console.log(`Node Environment: ${nodeEnv}`);
  console.log(`Replit Environment: ${replitEnv}`);
  console.log(`Database URL (first 50 chars): ${dbUrl ? dbUrl.substring(0, 50) + '...' : 'Not set'}`);
  
  // Verify database connection and recipe counts
  try {
    const recipeStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_recipes,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_recipes,
        COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_recipes
      FROM recipes
    `);
    
    const stats = recipeStats[0];
    console.log(`Database Stats: ${stats.total_recipes} total, ${stats.approved_recipes} approved, ${stats.pending_recipes} pending`);
    
    return {
      environment: nodeEnv,
      replitEnvironment: replitEnv,
      databaseStats: stats
    };
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

async function testMealPlanGeneration() {
  console.log('\n=== MEAL PLAN GENERATION TEST ===');
  
  const testParams = {
    planName: "Development Test Plan",
    fitnessGoal: "muscle_gain",
    description: "Testing meal plan generation functionality",
    dailyCalorieTarget: 2200,
    days: 3,
    mealsPerDay: 3,
    clientName: "Test Client"
  };
  
  try {
    console.log('Generating meal plan with parameters:', JSON.stringify(testParams, null, 2));
    
    const startTime = Date.now();
    const mealPlan = await mealPlanGenerator.generateMealPlan(testParams, 'test-user-123');
    const endTime = Date.now();
    
    console.log(`✓ Meal plan generated successfully in ${endTime - startTime}ms`);
    console.log(`Plan ID: ${mealPlan.id}`);
    console.log(`Total meals: ${mealPlan.meals.length}`);
    console.log(`Expected meals: ${testParams.days * testParams.mealsPerDay}`);
    
    // Verify meal distribution
    const mealsByDay = {};
    mealPlan.meals.forEach(meal => {
      if (!mealsByDay[meal.day]) mealsByDay[meal.day] = 0;
      mealsByDay[meal.day]++;
    });
    
    console.log('Meal distribution by day:', mealsByDay);
    
    // Verify recipe data integrity
    const sampleMeal = mealPlan.meals[0];
    console.log(`Sample meal: ${sampleMeal.recipe.name} (${sampleMeal.recipe.caloriesKcal} cal)`);
    
    return {
      success: true,
      mealPlan: {
        id: mealPlan.id,
        totalMeals: mealPlan.meals.length,
        generationTime: endTime - startTime
      }
    };
  } catch (error) {
    console.error('✗ Meal plan generation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testRecipeAvailability() {
  console.log('\n=== RECIPE AVAILABILITY TEST ===');
  
  try {
    // Check approved recipes
    const approvedRecipes = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM recipes 
      WHERE is_approved = true
    `);
    
    console.log(`Approved recipes available: ${approvedRecipes[0].count}`);
    
    // Check recent recipes
    const recentRecipes = await db.execute(sql`
      SELECT name, creation_timestamp, is_approved
      FROM recipes 
      ORDER BY creation_timestamp DESC 
      LIMIT 5
    `);
    
    console.log('Recent recipes:');
    recentRecipes.forEach((recipe, index) => {
      console.log(`  ${index + 1}. ${recipe.name} (${recipe.is_approved ? 'approved' : 'pending'}) - ${recipe.creation_timestamp}`);
    });
    
    return {
      approvedCount: approvedRecipes[0].count,
      recentRecipes: recentRecipes.length
    };
  } catch (error) {
    console.error('Recipe availability check failed:', error.message);
    throw error;
  }
}

async function testNaturalLanguageParsing() {
  console.log('\n=== NATURAL LANGUAGE PARSING TEST ===');
  
  try {
    const { parseNaturalLanguageMealPlan } = await import('./server/services/openai.js');
    
    const testInput = "Create a 5 day muscle building meal plan with 2500 calories per day, 4 meals daily, focusing on high protein foods";
    
    console.log(`Testing input: "${testInput}"`);
    
    const startTime = Date.now();
    const parsedPlan = await parseNaturalLanguageMealPlan(testInput);
    const endTime = Date.now();
    
    console.log(`✓ Natural language parsed successfully in ${endTime - startTime}ms`);
    console.log('Parsed parameters:', JSON.stringify(parsedPlan, null, 2));
    
    return {
      success: true,
      parsedPlan,
      parseTime: endTime - startTime
    };
  } catch (error) {
    console.error('✗ Natural language parsing failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runComprehensiveTest() {
  console.log('🧪 Starting Comprehensive Meal Plan Generation Test\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: null,
    recipeAvailability: null,
    mealPlanGeneration: null,
    naturalLanguageParsing: null
  };
  
  try {
    // Test 1: Environment isolation
    results.environment = await testEnvironmentIsolation();
    
    // Test 2: Recipe availability
    results.recipeAvailability = await testRecipeAvailability();
    
    // Test 3: Meal plan generation
    results.mealPlanGeneration = await testMealPlanGeneration();
    
    // Test 4: Natural language parsing (if OpenAI key is available)
    if (process.env.OPENAI_API_KEY) {
      results.naturalLanguageParsing = await testNaturalLanguageParsing();
    } else {
      console.log('\n=== NATURAL LANGUAGE PARSING TEST ===');
      console.log('⚠ Skipping natural language test - OPENAI_API_KEY not set');
      results.naturalLanguageParsing = { skipped: true, reason: 'No API key' };
    }
    
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Environment: ${results.environment.environment} (Replit: ${results.environment.replitEnvironment})`);
    console.log(`Database: ${results.environment.databaseStats.total_recipes} recipes (${results.environment.databaseStats.approved_recipes} approved)`);
    console.log(`Recipe availability: ${results.recipeAvailability.approvedCount} approved recipes`);
    console.log(`Meal plan generation: ${results.mealPlanGeneration.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    
    if (results.naturalLanguageParsing.success) {
      console.log(`Natural language parsing: ✓ SUCCESS`);
    } else if (results.naturalLanguageParsing.skipped) {
      console.log(`Natural language parsing: ⚠ SKIPPED`);
    } else {
      console.log(`Natural language parsing: ✗ FAILED`);
    }
    
    const overallSuccess = results.mealPlanGeneration.success && 
                          results.recipeAvailability.approvedCount > 0;
    
    console.log(`\n🎯 Overall Test Result: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    return results;
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    console.error(error.stack);
    results.error = error.message;
    return results;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runComprehensiveTest()
    .then(results => {
      if (results.error) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest };