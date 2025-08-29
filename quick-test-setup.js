#!/usr/bin/env node

/**
 * Quick Test Setup Script
 * 
 * Temporarily disables problematic services to allow the development server
 * to start so that Playwright tests can run.
 */

import fs from 'fs';

console.log('🔧 Setting up environment for E2E testing...\n');

// Backup and modify server/index.ts to comment out problematic routes
const serverIndexPath = 'server/index.ts';
const backupPath = 'server/index.ts.backup';

try {
  console.log('1. Backing up server/index.ts...');
  
  if (!fs.existsSync(backupPath)) {
    const content = fs.readFileSync(serverIndexPath, 'utf8');
    fs.writeFileSync(backupPath, content);
    console.log('   ✅ Backup created: server/index.ts.backup');
  } else {
    console.log('   ✅ Backup already exists');
  }

  console.log('\n2. Checking for problematic route imports...');
  
  let content = fs.readFileSync(serverIndexPath, 'utf8');
  
  // Comment out problematic imports and routes
  const problematicPatterns = [
    // Engagement routes
    { 
      pattern: /import engagementRoutes from ['".].*engagement['"]/g,
      replacement: '// TEMP DISABLED: import engagementRoutes from \'./routes/engagement\';'
    },
    {
      pattern: /app\.use\(['"]/api/engagement['"]\s*,\s*engagementRoutes\)/g,
      replacement: '// TEMP DISABLED: app.use(\'/api/engagement\', engagementRoutes);'
    },
    // Recommendations routes  
    { 
      pattern: /import recommendationRoutes from ['".].*recommendation['"]/g,
      replacement: '// TEMP DISABLED: import recommendationRoutes from \'./routes/recommendation\';'
    },
    {
      pattern: /app\.use\(['"]/api/recommendation['"]\s*,\s*recommendationRoutes\)/g,  
      replacement: '// TEMP DISABLED: app.use(\'/api/recommendation\', recommendationRoutes);'
    },
    // Trending routes
    { 
      pattern: /import trendingRoutes from ['".].*trending['"]/g,
      replacement: '// TEMP DISABLED: import trendingRoutes from \'./routes/trending\';'
    },
    {
      pattern: /app\.use\(['"]/api/trending['"]\s*,\s*trendingRoutes\)/g,
      replacement: '// TEMP DISABLED: app.use(\'/api/trending\', trendingRoutes);'
    }
  ];

  let modified = false;
  problematicPatterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(serverIndexPath, content);
    console.log('   ✅ Problematic routes temporarily disabled');
  } else {
    console.log('   ✅ No problematic routes found or already disabled');
  }

  console.log('\n3. Development server modifications complete!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Restart development server:');
  console.log('   docker restart fitnessmealplanner-dev');
  console.log('');
  console.log('2. Wait for server to start (check logs):');
  console.log('   docker logs fitnessmealplanner-dev --tail 20');
  console.log('');
  console.log('3. Run Playwright tests:');
  console.log('   npx playwright test test/e2e/meal-card-clicking.spec.ts --headed');
  console.log('');
  console.log('4. To restore original server after testing:');
  console.log('   cp server/index.ts.backup server/index.ts');
  console.log('');
  console.log('🎯 Ready to test meal card clicking functionality!');

} catch (error) {
  console.error('❌ Error setting up test environment:', error.message);
  console.log('\n⚠️  Manual setup required:');
  console.log('1. Open server/index.ts');
  console.log('2. Comment out any import/use statements for engagement, recommendation, or trending routes');
  console.log('3. Restart the development server');
}

console.log('\n✅ Quick test setup complete!');