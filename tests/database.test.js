/**
 * Database-specific tests for FitMeal Pro
 * Tests database operations, connections, and data integrity
 */

import { db } from '../server/db.ts';
import { storage } from '../server/storage.ts';
import { recipes, users, mealPlans } from '../shared/schema.ts';

// Test data
const TEST_USER = {
  id: "test-user-" + Date.now(),
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "client",
  isActive: true
};

const TEST_RECIPE = {
  name: "Test Database Recipe",
  description: "A recipe for testing database operations",
  mealTypes: ["lunch"],
  dietaryTags: ["healthy"],
  mainIngredientTags: ["chicken"],
  ingredients: [
    { name: "chicken breast", amount: "200", unit: "g" }
  ],
  instructions: "Cook the chicken",
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 1,
  caloriesKcal: 300,
  proteinG: 25,
  carbsG: 5,
  fatG: 10,
  fiberG: 2,
  sugarG: 1,
  isApproved: true
};

class DatabaseTestSuite {
  constructor() {
    this.createdRecords = [];
  }

  async cleanup() {
    // Clean up any test data created during tests
    for (const record of this.createdRecords) {
      try {
        if (record.type === 'recipe') {
          await storage.deleteRecipe(record.id);
        } else if (record.type === 'user') {
          // Users are handled by auth system
        }
      } catch (error) {
        console.log(`Cleanup warning: ${error.message}`);
      }
    }
    this.createdRecords = [];
  }

  async testDatabaseConnection() {
    try {
      const result = await db.execute('SELECT 1 as test');
      if (result.length > 0 && result[0].test === 1) {
        return { success: true, message: 'Database connection successful' };
      }
      return { success: false, message: 'Database connection failed - no result' };
    } catch (error) {
      return { success: false, message: `Database connection error: ${error.message}` };
    }
  }

  async testRecipeOperations() {
    try {
      // Test recipe creation
      const recipe = await storage.createRecipe(TEST_RECIPE);
      this.createdRecords.push({ type: 'recipe', id: recipe.id });

      if (!recipe.id || recipe.name !== TEST_RECIPE.name) {
        return { success: false, message: 'Recipe creation failed' };
      }

      // Test recipe retrieval
      const retrievedRecipe = await storage.getRecipe(recipe.id);
      if (!retrievedRecipe || retrievedRecipe.id !== recipe.id) {
        return { success: false, message: 'Recipe retrieval failed' };
      }

      // Test recipe update
      const updatedRecipe = await storage.updateRecipe(recipe.id, {
        name: 'Updated Test Recipe'
      });
      if (!updatedRecipe || updatedRecipe.name !== 'Updated Test Recipe') {
        return { success: false, message: 'Recipe update failed' };
      }

      // Test recipe search
      const searchResults = await storage.searchRecipes({
        search: 'Updated Test Recipe',
        limit: 10
      });
      if (!searchResults.recipes || searchResults.recipes.length === 0) {
        return { success: false, message: 'Recipe search failed' };
      }

      return { 
        success: true, 
        message: 'All recipe operations successful',
        details: {
          created: recipe.id,
          retrieved: retrievedRecipe.id,
          updated: updatedRecipe.name,
          searchResults: searchResults.recipes.length
        }
      };
    } catch (error) {
      return { success: false, message: `Recipe operations error: ${error.message}` };
    }
  }

  async testRecipeFiltering() {
    try {
      // Test various filter combinations
      const filters = [
        { mealType: 'breakfast', limit: 5 },
        { dietaryTag: 'vegetarian', limit: 5 },
        { maxCalories: 500, limit: 5 },
        { minProtein: 20, limit: 5 },
        { search: 'chicken', limit: 5 }
      ];

      const results = [];
      for (const filter of filters) {
        const searchResult = await storage.searchRecipes(filter);
        results.push({
          filter,
          count: searchResult.recipes.length,
          total: searchResult.total
        });
      }

      return {
        success: true,
        message: 'Recipe filtering tests completed',
        details: results
      };
    } catch (error) {
      return { success: false, message: `Recipe filtering error: ${error.message}` };
    }
  }

  async testDataIntegrity() {
    try {
      // Test that required fields are enforced
      try {
        await storage.createRecipe({
          name: "Incomplete Recipe"
          // Missing required fields
        });
        return { success: false, message: 'Data integrity failed - incomplete recipe was created' };
      } catch (error) {
        // This should fail, which is correct
      }

      // Test that valid data is accepted
      const validRecipe = await storage.createRecipe(TEST_RECIPE);
      this.createdRecords.push({ type: 'recipe', id: validRecipe.id });

      if (!validRecipe.id) {
        return { success: false, message: 'Valid recipe creation failed' };
      }

      return {
        success: true,
        message: 'Data integrity tests passed',
        details: { validRecipeId: validRecipe.id }
      };
    } catch (error) {
      return { success: false, message: `Data integrity error: ${error.message}` };
    }
  }

  async testPerformance() {
    try {
      const startTime = Date.now();
      
      // Test concurrent recipe searches
      const searchPromises = [];
      for (let i = 0; i < 10; i++) {
        searchPromises.push(storage.searchRecipes({
          limit: 20,
          page: i + 1
        }));
      }

      const results = await Promise.all(searchPromises);
      const duration = Date.now() - startTime;

      const totalRecipes = results.reduce((sum, result) => sum + result.recipes.length, 0);

      return {
        success: duration < 5000, // Should complete in less than 5 seconds
        message: `Performance test completed in ${duration}ms`,
        details: {
          duration,
          concurrentSearches: 10,
          totalRecipesRetrieved: totalRecipes,
          avgResponseTime: duration / 10
        }
      };
    } catch (error) {
      return { success: false, message: `Performance test error: ${error.message}` };
    }
  }

  async testRecipeStats() {
    try {
      const stats = await storage.getRecipeStats();
      
      if (typeof stats.total !== 'number' || 
          typeof stats.approved !== 'number' ||
          typeof stats.pending !== 'number') {
        return { success: false, message: 'Invalid recipe stats format' };
      }

      return {
        success: true,
        message: 'Recipe statistics retrieved successfully',
        details: stats
      };
    } catch (error) {
      return { success: false, message: `Recipe stats error: ${error.message}` };
    }
  }

  async runAllTests() {
    console.log('Starting Database Test Suite');
    console.log('=' .repeat(40));

    const tests = [
      { name: 'Database Connection', fn: this.testDatabaseConnection },
      { name: 'Recipe Operations', fn: this.testRecipeOperations },
      { name: 'Recipe Filtering', fn: this.testRecipeFiltering },
      { name: 'Data Integrity', fn: this.testDataIntegrity },
      { name: 'Performance', fn: this.testPerformance },
      { name: 'Recipe Statistics', fn: this.testRecipeStats }
    ];

    const results = [];

    for (const test of tests) {
      console.log(`\nRunning: ${test.name}`);
      const startTime = Date.now();
      
      try {
        const result = await test.fn.call(this);
        const duration = Date.now() - startTime;
        
        if (result.success) {
          console.log(`✓ ${test.name} (${duration}ms)`);
          if (result.details) {
            console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
          }
        } else {
          console.log(`✗ ${test.name} (${duration}ms)`);
          console.log(`  Error: ${result.message}`);
        }
        
        results.push({ ...result, name: test.name, duration });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`✗ ${test.name} (${duration}ms)`);
        console.log(`  Error: ${error.message}`);
        results.push({ 
          success: false, 
          name: test.name, 
          message: error.message,
          duration 
        });
      }
    }

    // Cleanup
    await this.cleanup();

    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\nDatabase Test Summary:');
    console.log('-'.repeat(30));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    return {
      success: failed === 0,
      results,
      summary: { passed, failed, totalTime }
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new DatabaseTestSuite();
  testSuite.runAllTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Database test execution failed:', error);
      process.exit(1);
    });
}

export { DatabaseTestSuite };