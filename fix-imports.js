#!/usr/bin/env node

/**
 * Quick Script to Fix Import/Export Issues
 * 
 * This script addresses the main import/export issues preventing 
 * the development server from starting.
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing import/export issues...\n');

// 1. Check and fix EngagementService imports
const engagementServicePath = 'server/services/EngagementService.ts';
console.log('1. Checking EngagementService imports...');

try {
  let content = fs.readFileSync(engagementServicePath, 'utf8');
  
  // Check if schema-engagement items are properly imported
  if (content.includes('from \'../../shared/schema.js\';') && 
      content.includes('recipeViews') && 
      !content.includes('from \'../../shared/schema-engagement.js\';')) {
    
    console.log('   ❌ EngagementService has incorrect imports');
    
    // Fix: Move engagement-specific imports to correct file
    content = content.replace(
      /import { recipes, users } from '\.\.\/\.\.\/shared\/schema\.js';\nimport \{([^}]+)\} from '\.\.\/\.\.\/shared\/schema-engagement\.js';/s,
      `import { recipes, users } from '../../shared/schema.js';
import {
  recipeViews,
  recipeRatings,
  userInteractions,
  recipeShares,
  userPreferences,
  type RecipeView,
  type RecipeRating,
  type UserInteraction,
  type RecipeShare,
  type UserPreferences,
  type Recipe,
  type TrackInteraction,
  type UpdatePreferences,
  type ShareRecipe,
} from '../../shared/schema-engagement.js';`
    );
    
    fs.writeFileSync(engagementServicePath, content);
    console.log('   ✅ Fixed EngagementService imports');
  } else {
    console.log('   ✅ EngagementService imports look correct');
  }
} catch (error) {
  console.log('   ❌ Error checking EngagementService:', error.message);
}

// 2. Check if schema-engagement exports exist
const schemaEngagementPath = 'shared/schema-engagement.ts';
console.log('\n2. Checking schema-engagement exports...');

try {
  const content = fs.readFileSync(schemaEngagementPath, 'utf8');
  
  const requiredExports = [
    'recipeViews',
    'recipeRatings', 
    'userInteractions',
    'recipeShares',
    'userPreferences'
  ];
  
  const missingExports = requiredExports.filter(exportName => 
    !content.includes(`export const ${exportName}`) && 
    !content.includes(`export { ${exportName}`)
  );
  
  if (missingExports.length > 0) {
    console.log('   ❌ Missing exports:', missingExports.join(', '));
    console.log('   ℹ️  These exports need to be added to schema-engagement.ts');
  } else {
    console.log('   ✅ All required exports found');
  }
} catch (error) {
  console.log('   ❌ Error reading schema-engagement.ts:', error.message);
}

// 3. Check FavoritesService export
const favoritesServicePath = 'server/services/FavoritesService.ts';
console.log('\n3. Checking FavoritesService exports...');

try {
  const content = fs.readFileSync(favoritesServicePath, 'utf8');
  
  if (content.includes('getFavoritesService') && content.includes('export function getFavoritesService')) {
    console.log('   ✅ FavoritesService exports look correct');
  } else {
    console.log('   ❌ FavoritesService missing getFavoritesService export');
  }
} catch (error) {
  console.log('   ❌ Error checking FavoritesService:', error.message);
}

// 4. List other potential problematic services
console.log('\n4. Checking for other services with import issues...');

const servicesToCheck = [
  'RecommendationService.ts',
  'TrendingService.ts',
  'RedisService.ts'
];

servicesToCheck.forEach(serviceName => {
  const servicePath = `server/services/${serviceName}`;
  try {
    if (fs.existsSync(servicePath)) {
      const content = fs.readFileSync(servicePath, 'utf8');
      
      // Check for common import patterns that might be problematic
      if (content.includes('from \'../../shared/schema.js\'') && 
          (content.includes('recipeViews') || content.includes('favorites'))) {
        console.log(`   ⚠️  ${serviceName} might have import issues`);
      }
    }
  } catch (error) {
    // Service doesn't exist or can't be read
  }
});

// 5. Provide next steps
console.log('\n📋 NEXT STEPS:');
console.log('1. Review the issues identified above');
console.log('2. Fix any missing exports in schema files');  
console.log('3. Restart development server: docker restart fitnessmealplanner-dev');
console.log('4. Check logs: docker logs fitnessmealplanner-dev --tail 20');
console.log('5. If still failing, check server/index.ts imports');

console.log('\n🚀 To test the meal card clicking functionality:');
console.log('   npx playwright test test/e2e/meal-card-clicking.spec.ts --headed');

console.log('\n✅ Import fix analysis complete!');