#!/usr/bin/env tsx
/**
 * Performance Test Setup Validation Script
 *
 * This script validates that the performance test environment is properly
 * configured and all prerequisites are met before running the full test suite.
 *
 * Usage:
 *   tsx test/performance/validate-setup.ts
 */

import { validateEnvironment, TEST_ENVIRONMENT, PERFORMANCE_CONFIG } from './config';

interface ValidationResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class PerformanceSetupValidator {
  private results: ValidationResult[] = [];

  async validate(): Promise<boolean> {
    console.log('🔍 Validating Performance Test Setup');
    console.log('=' .repeat(50));

    await this.validateEnvironmentConfig();
    await this.validateServiceConnectivity();
    await this.validateDependencies();
    await this.validatePermissions();
    await this.validateTestData();

    this.printResults();
    return this.getOverallStatus();
  }

  private async validateEnvironmentConfig() {
    console.log('\n📋 Checking Environment Configuration...');

    // Validate environment configuration
    const envValidation = validateEnvironment();

    if (envValidation.valid) {
      this.addResult('Environment', 'pass', 'Environment configuration is valid');
    } else {
      this.addResult('Environment', 'fail', 'Environment configuration errors',
        envValidation.errors.join(', '));
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      this.addResult('Node.js', 'pass', `Node.js version ${nodeVersion} is supported`);
    } else {
      this.addResult('Node.js', 'warning', `Node.js version ${nodeVersion} may not be optimal (recommended: 18+)`);
    }

    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const optionalEnvVars = ['TEST_API_URL', 'TEST_FRONTEND_URL', 'REDIS_URL'];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.addResult('Env Vars', 'pass', `${envVar} is configured`);
      } else {
        this.addResult('Env Vars', 'warning', `${envVar} is not configured`);
      }
    }

    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.addResult('Env Vars', 'pass', `${envVar} is configured`);
      } else {
        this.addResult('Env Vars', 'pass', `${envVar} using default value`);
      }
    }
  }

  private async validateServiceConnectivity() {
    console.log('\n🌐 Checking Service Connectivity...');

    // Test API connectivity
    try {
      const apiResponse = await fetch(`${TEST_ENVIRONMENT.API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });

      if (apiResponse.ok) {
        this.addResult('API Service', 'pass', `API responding at ${TEST_ENVIRONMENT.API_BASE_URL}`);
      } else {
        this.addResult('API Service', 'fail', `API returned status ${apiResponse.status}`);
      }
    } catch (error) {
      this.addResult('API Service', 'fail', 'API service not reachable',
        `${TEST_ENVIRONMENT.API_BASE_URL} - ${error.message}`);
    }

    // Test frontend connectivity
    try {
      const frontendResponse = await fetch(TEST_ENVIRONMENT.FRONTEND_BASE_URL, {
        method: 'GET',
        timeout: 5000
      });

      if (frontendResponse.ok) {
        this.addResult('Frontend Service', 'pass', `Frontend responding at ${TEST_ENVIRONMENT.FRONTEND_BASE_URL}`);
      } else {
        this.addResult('Frontend Service', 'fail', `Frontend returned status ${frontendResponse.status}`);
      }
    } catch (error) {
      this.addResult('Frontend Service', 'fail', 'Frontend service not reachable',
        `${TEST_ENVIRONMENT.FRONTEND_BASE_URL} - ${error.message}`);
    }

    // Test database connectivity
    if (TEST_ENVIRONMENT.DB_URL) {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: TEST_ENVIRONMENT.DB_URL,
          max: 1,
          connectionTimeoutMillis: 5000,
        });

        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        await pool.end();

        this.addResult('Database', 'pass', 'Database connection successful');
      } catch (error) {
        this.addResult('Database', 'fail', 'Database connection failed', error.message);
      }
    } else {
      this.addResult('Database', 'warning', 'Database URL not configured - database tests will be skipped');
    }
  }

  private async validateDependencies() {
    console.log('\n📦 Checking Dependencies...');

    // Check if Docker is running
    try {
      const { execSync } = await import('child_process');
      execSync('docker ps', { stdio: 'pipe' });
      this.addResult('Docker', 'pass', 'Docker is running');
    } catch (error) {
      this.addResult('Docker', 'warning', 'Docker not detected - may affect development environment tests');
    }

    // Check Playwright installation
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      this.addResult('Playwright', 'pass', 'Playwright browsers are installed');
    } catch (error) {
      this.addResult('Playwright', 'fail', 'Playwright not properly installed',
        'Run: npx playwright install');
    }

    // Check required npm packages
    const requiredPackages = ['vitest', 'playwright', 'pg'];

    for (const pkg of requiredPackages) {
      try {
        await import(pkg);
        this.addResult('Dependencies', 'pass', `${pkg} is available`);
      } catch (error) {
        this.addResult('Dependencies', 'fail', `${pkg} is not available`,
          `Run: npm install ${pkg}`);
      }
    }
  }

  private async validatePermissions() {
    console.log('\n🔒 Checking Permissions...');

    // Check file system permissions
    try {
      const fs = await import('fs/promises');
      const testDir = './test-results/performance';

      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(`${testDir}/test-write.tmp`, 'test');
      await fs.unlink(`${testDir}/test-write.tmp`);

      this.addResult('File System', 'pass', 'Write permissions to test-results directory');
    } catch (error) {
      this.addResult('File System', 'fail', 'Cannot write to test-results directory', error.message);
    }

    // Check network permissions (basic test)
    try {
      await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 5000
      });
      this.addResult('Network', 'pass', 'External network access available');
    } catch (error) {
      this.addResult('Network', 'warning', 'Limited network access - some tests may fail');
    }
  }

  private async validateTestData() {
    console.log('\n📊 Checking Test Data Availability...');

    // Check if test accounts exist
    if (TEST_ENVIRONMENT.DB_URL) {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: TEST_ENVIRONMENT.DB_URL,
          max: 1,
        });

        const client = await pool.connect();

        // Check for test users
        const usersResult = await client.query('SELECT COUNT(*) as count FROM users LIMIT 1');
        const userCount = parseInt(usersResult.rows[0].count);

        if (userCount > 0) {
          this.addResult('Test Data', 'pass', `${userCount} users available for testing`);
        } else {
          this.addResult('Test Data', 'warning', 'No users found - some tests may fail');
        }

        // Check for test recipes
        const recipesResult = await client.query('SELECT COUNT(*) as count FROM recipes LIMIT 1');
        const recipeCount = parseInt(recipesResult.rows[0].count);

        if (recipeCount > 0) {
          this.addResult('Test Data', 'pass', `${recipeCount} recipes available for testing`);
        } else {
          this.addResult('Test Data', 'warning', 'No recipes found - recipe tests may fail');
        }

        client.release();
        await pool.end();

      } catch (error) {
        this.addResult('Test Data', 'warning', 'Could not verify test data availability', error.message);
      }
    }

    // Validate configuration values
    const thresholds = PERFORMANCE_CONFIG.thresholds;

    if (thresholds.API_GET_MAX > 0 && thresholds.API_GET_MAX < 10000) {
      this.addResult('Thresholds', 'pass', 'Performance thresholds are reasonable');
    } else {
      this.addResult('Thresholds', 'warning', 'Performance thresholds may be too strict or lenient');
    }
  }

  private addResult(category: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
    this.results.push({ category, status, message, details });
  }

  private printResults() {
    console.log('\n📋 Validation Results');
    console.log('=' .repeat(50));

    const statusIcons = {
      pass: '✅',
      fail: '❌',
      warning: '⚠️'
    };

    for (const result of this.results) {
      const icon = statusIcons[result.status];
      console.log(`${icon} [${result.category}] ${result.message}`);

      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    }

    // Summary
    const summary = this.results.reduce((acc, result) => {
      acc[result.status]++;
      return acc;
    }, { pass: 0, fail: 0, warning: 0 });

    console.log('\n📊 Summary');
    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log(`❌ Failed: ${summary.fail}`);

    if (summary.fail === 0) {
      console.log('\n🎉 Setup validation successful! You can run performance tests.');
    } else {
      console.log('\n🔧 Please fix the failed validations before running performance tests.');
    }

    // Recommendations
    this.printRecommendations();
  }

  private printRecommendations() {
    console.log('\n💡 Recommendations');
    console.log('-'.repeat(30));

    const failures = this.results.filter(r => r.status === 'fail');
    const warnings = this.results.filter(r => r.status === 'warning');

    if (failures.length > 0) {
      console.log('\n🔧 Required Fixes:');
      for (const failure of failures) {
        console.log(`• ${failure.message}`);
        if (failure.details) {
          console.log(`  ${failure.details}`);
        }
      }
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Suggested Improvements:');
      for (const warning of warnings) {
        console.log(`• ${warning.message}`);
      }
    }

    // General recommendations
    console.log('\n📚 General Tips:');
    console.log('• Run "npm run dev" to start the development server');
    console.log('• Use "docker-compose up -d" for the full development environment');
    console.log('• Install Playwright browsers: "npx playwright install"');
    console.log('• Run baseline tests first: "npm run test:performance:baseline"');
    console.log('• Check the performance test README for detailed setup instructions');
  }

  private getOverallStatus(): boolean {
    const failures = this.results.filter(r => r.status === 'fail');
    return failures.length === 0;
  }
}

// Main execution
async function main() {
  try {
    const validator = new PerformanceSetupValidator();
    const isValid = await validator.validate();

    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { PerformanceSetupValidator };