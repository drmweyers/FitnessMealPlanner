/**
 * Security Test Setup Validator
 * Validates that all security test dependencies and files are properly configured
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationResult {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

class SecurityTestValidator {
  private results: ValidationResult[] = [];

  async validateSetup(): Promise<ValidationResult[]> {
    console.log('🔍 Validating Security Test Setup...\n');

    await this.validateTestFiles();
    await this.validateDependencies();
    await this.validateOutputDirectories();
    await this.validatePlaywrightSetup();
    await this.validatePackageScripts();

    this.displayResults();
    return this.results;
  }

  private async validateTestFiles(): Promise<void> {
    console.log('📁 Checking security test files...');

    const expectedFiles = [
      'sql-injection-tests.ts',
      'xss-attack-tests.ts',
      'authentication-security-tests.ts',
      'csrf-tests.ts',
      'api-security-tests.ts',
      'file-upload-security-tests.ts',
      '../e2e/security/comprehensive-gui-security.spec.ts',
      '../e2e/security-penetration-edge-cases.spec.ts'
    ];

    for (const file of expectedFiles) {
      try {
        const filePath = path.resolve(__dirname, file);
        await fs.access(filePath);

        const stats = await fs.stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        this.results.push({
          category: 'Test Files',
          status: 'PASS',
          message: `✅ ${path.basename(file)} (${sizeKB} KB)`,
          details: filePath
        });
      } catch (error) {
        this.results.push({
          category: 'Test Files',
          status: 'FAIL',
          message: `❌ Missing: ${path.basename(file)}`,
          details: `Expected at: ${path.resolve(__dirname, file)}`
        });
      }
    }
  }

  private async validateDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');

    const requiredDependencies = [
      '@playwright/test',
      'vitest',
      'tsx'
    ];

    try {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const dep of requiredDependencies) {
        if (allDeps[dep]) {
          this.results.push({
            category: 'Dependencies',
            status: 'PASS',
            message: `✅ ${dep} (${allDeps[dep]})`,
            details: 'Available in package.json'
          });
        } else {
          this.results.push({
            category: 'Dependencies',
            status: 'FAIL',
            message: `❌ Missing: ${dep}`,
            details: 'Required for security test execution'
          });
        }
      }
    } catch (error) {
      this.results.push({
        category: 'Dependencies',
        status: 'FAIL',
        message: '❌ Cannot read package.json',
        details: error.message
      });
    }
  }

  private async validateOutputDirectories(): Promise<void> {
    console.log('📂 Checking output directories...');

    const outputDirs = [
      '../../test-results',
      '../../test-results/security'
    ];

    for (const dir of outputDirs) {
      try {
        const dirPath = path.resolve(__dirname, dir);
        await fs.mkdir(dirPath, { recursive: true });

        // Test write permissions
        const testFile = path.join(dirPath, '.write-test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);

        this.results.push({
          category: 'Output Directories',
          status: 'PASS',
          message: `✅ ${path.basename(dirPath)} (writable)`,
          details: dirPath
        });
      } catch (error) {
        this.results.push({
          category: 'Output Directories',
          status: 'FAIL',
          message: `❌ Cannot access: ${path.basename(path.resolve(__dirname, dir))}`,
          details: error.message
        });
      }
    }
  }

  private async validatePlaywrightSetup(): Promise<void> {
    console.log('🎭 Checking Playwright setup...');

    try {
      // Check if Playwright config exists
      const configPaths = [
        '../../playwright.config.ts',
        '../../playwright.config.js'
      ];

      let configFound = false;
      for (const configPath of configPaths) {
        try {
          await fs.access(path.resolve(__dirname, configPath));
          configFound = true;
          this.results.push({
            category: 'Playwright',
            status: 'PASS',
            message: `✅ Config found: ${path.basename(configPath)}`,
            details: path.resolve(__dirname, configPath)
          });
          break;
        } catch {
          // Continue checking other paths
        }
      }

      if (!configFound) {
        this.results.push({
          category: 'Playwright',
          status: 'WARN',
          message: '⚠️  No Playwright config found',
          details: 'GUI tests may use default configuration'
        });
      }

      // Check for browsers installation
      try {
        const { execSync } = await import('child_process');
        execSync('npx playwright --version', { stdio: 'pipe' });

        this.results.push({
          category: 'Playwright',
          status: 'PASS',
          message: '✅ Playwright CLI available',
          details: 'Browsers can be installed if needed'
        });
      } catch (error) {
        this.results.push({
          category: 'Playwright',
          status: 'WARN',
          message: '⚠️  Playwright CLI not accessible',
          details: 'Run: npx playwright install'
        });
      }

    } catch (error) {
      this.results.push({
        category: 'Playwright',
        status: 'FAIL',
        message: '❌ Playwright validation failed',
        details: error.message
      });
    }
  }

  private async validatePackageScripts(): Promise<void> {
    console.log('📜 Checking package.json scripts...');

    try {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const expectedScripts = [
        'test:security',
        'test:security:verbose',
        'test:security:output'
      ];

      for (const script of expectedScripts) {
        if (packageJson.scripts[script]) {
          this.results.push({
            category: 'Package Scripts',
            status: 'PASS',
            message: `✅ ${script}`,
            details: packageJson.scripts[script]
          });
        } else {
          this.results.push({
            category: 'Package Scripts',
            status: 'FAIL',
            message: `❌ Missing script: ${script}`,
            details: 'Required for easy test execution'
          });
        }
      }
    } catch (error) {
      this.results.push({
        category: 'Package Scripts',
        status: 'FAIL',
        message: '❌ Cannot validate scripts',
        details: error.message
      });
    }
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 SECURITY TEST SETUP VALIDATION RESULTS');
    console.log('='.repeat(80));

    const categories = [...new Set(this.results.map(r => r.category))];

    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'PASS').length;
      const failed = categoryResults.filter(r => r.status === 'FAIL').length;
      const warned = categoryResults.filter(r => r.status === 'WARN').length;

      console.log(`\n📋 ${category}:`);
      console.log(`   ✅ Pass: ${passed} | ❌ Fail: ${failed} | ⚠️  Warn: ${warned}`);

      // Show detailed results
      for (const result of categoryResults) {
        console.log(`   ${result.message}`);
        if (result.details && (result.status === 'FAIL' || result.status === 'WARN')) {
          console.log(`      ${result.details}`);
        }
      }
    }

    // Overall status
    const totalFailed = this.results.filter(r => r.status === 'FAIL').length;
    const totalWarned = this.results.filter(r => r.status === 'WARN').length;

    console.log('\n' + '='.repeat(80));
    if (totalFailed === 0) {
      console.log('✅ SETUP VALIDATION PASSED');
      if (totalWarned > 0) {
        console.log(`⚠️  ${totalWarned} warnings - setup is functional but could be improved`);
      }
      console.log('\n🚀 Ready to run security tests:');
      console.log('   npm run test:security');
    } else {
      console.log('❌ SETUP VALIDATION FAILED');
      console.log(`   ${totalFailed} critical issues must be resolved before running security tests`);
      console.log('\n🔧 Required actions:');

      const criticalIssues = this.results.filter(r => r.status === 'FAIL');
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.message}`);
        if (issue.details) {
          console.log(`     ${issue.details}`);
        }
      });
    }
    console.log('='.repeat(80));
  }
}

// Execute validation if run directly
async function main() {
  const validator = new SecurityTestValidator();
  const results = await validator.validateSetup();

  const failed = results.filter(r => r.status === 'FAIL').length;
  process.exit(failed > 0 ? 1 : 0);
}

// Export for use as module
export { SecurityTestValidator, type ValidationResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}