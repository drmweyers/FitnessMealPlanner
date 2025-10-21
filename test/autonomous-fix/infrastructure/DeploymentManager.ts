/**
 * Deployment Manager - Handles deployments for the autonomous fix system
 *
 * This class provides utilities for deploying fixes to different environments.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { DeploymentResult } from '../types';
import { GitManager } from './GitManager';

const execPromise = promisify(exec);

export class DeploymentManager {
  private workingDir: string;
  private gitManager: GitManager;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.gitManager = new GitManager(workingDir);
  }

  /**
   * Deploy to development environment
   */
  async deployToDevelopment(branchName: string): Promise<DeploymentResult> {
    console.log('🚀 Deploying to development...');
    const startTime = Date.now();

    try {
      // For development, we just merge to qa-ready branch
      await this.gitManager.checkout('qa-ready');
      await this.gitManager.pull('qa-ready');
      const mergeResult = await this.gitManager.merge(branchName);

      if (!mergeResult.success) {
        return {
          success: false,
          environment: 'development',
          error: `Failed to merge to qa-ready: ${mergeResult.error}`,
        };
      }

      // Push to remote
      const pushResult = await this.gitManager.push('qa-ready');
      if (!pushResult.success) {
        return {
          success: false,
          environment: 'development',
          error: `Failed to push to qa-ready: ${pushResult.error}`,
        };
      }

      return {
        success: true,
        environment: 'development',
        deploymentTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        environment: 'development',
        error: error.message,
      };
    }
  }

  /**
   * Deploy to staging environment
   */
  async deployToStaging(branchName: string): Promise<DeploymentResult> {
    console.log('🚀 Deploying to staging...');
    const startTime = Date.now();

    try {
      // Merge to qa-ready (our staging branch)
      await this.gitManager.checkout('qa-ready');
      await this.gitManager.pull('qa-ready');
      const mergeResult = await this.gitManager.merge(branchName);

      if (!mergeResult.success) {
        return {
          success: false,
          environment: 'staging',
          error: `Failed to merge to qa-ready: ${mergeResult.error}`,
        };
      }

      // Push to remote
      const pushResult = await this.gitManager.push('qa-ready');
      if (!pushResult.success) {
        return {
          success: false,
          environment: 'staging',
          error: `Failed to push to qa-ready: ${pushResult.error}`,
        };
      }

      // Trigger Docker rebuild if needed
      try {
        await execPromise('docker-compose --profile dev up -d --build', {
          cwd: this.workingDir,
        });
      } catch (error) {
        console.warn('⚠️  Docker rebuild failed, but deployment succeeded:', error.message);
      }

      return {
        success: true,
        environment: 'staging',
        deploymentTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        environment: 'staging',
        error: error.message,
      };
    }
  }

  /**
   * Deploy to production environment
   */
  async deployToProduction(branchName: string): Promise<DeploymentResult> {
    console.log('🚀 Deploying to production...');
    const startTime = Date.now();

    try {
      // Merge to main (production branch)
      await this.gitManager.checkout('main');
      await this.gitManager.pull('main');
      const mergeResult = await this.gitManager.merge(branchName, true); // no fast-forward

      if (!mergeResult.success) {
        return {
          success: false,
          environment: 'production',
          error: `Failed to merge to main: ${mergeResult.error}`,
        };
      }

      // Push to remote
      const pushResult = await this.gitManager.push('main');
      if (!pushResult.success) {
        return {
          success: false,
          environment: 'production',
          error: `Failed to push to main: ${pushResult.error}`,
        };
      }

      // Build production Docker image
      console.log('📦 Building production Docker image...');
      try {
        await execPromise('docker build --target prod -t fitnessmealplanner:prod .', {
          cwd: this.workingDir,
          maxBuffer: 50 * 1024 * 1024,
        });

        // Tag for DigitalOcean registry
        await execPromise(
          'docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod',
          {
            cwd: this.workingDir,
          }
        );

        console.log('✅ Docker image built and tagged');
      } catch (error) {
        console.warn('⚠️  Docker build failed:', error.message);
        return {
          success: true, // Git operations succeeded, manual deployment may be needed
          environment: 'production',
          deploymentTime: Date.now() - startTime,
          error: 'Git operations succeeded, but Docker build failed. Manual deployment may be required.',
        };
      }

      return {
        success: true,
        environment: 'production',
        deploymentTime: Date.now() - startTime,
        url: 'https://evofitmeals.com',
      };
    } catch (error) {
      return {
        success: false,
        environment: 'production',
        error: error.message,
      };
    }
  }

  /**
   * Deploy based on classification level
   */
  async deployByLevel(
    branchName: string,
    level: 1 | 2 | 3 | 4
  ): Promise<DeploymentResult> {
    // Level 1: Deploy to development
    if (level === 1) {
      return await this.deployToDevelopment(branchName);
    }

    // Level 2: Deploy to staging
    if (level === 2) {
      return await this.deployToStaging(branchName);
    }

    // Level 3: Requires manual approval, don't auto-deploy
    // Level 4: Not fixable, don't deploy
    return {
      success: false,
      environment: 'development',
      error: `Level ${level} fixes require manual approval and deployment`,
    };
  }

  /**
   * Create pull request for human review
   */
  async createPullRequest(
    branchName: string,
    title: string,
    description: string
  ): Promise<{ success: boolean; prUrl?: string; error?: string }> {
    try {
      // Check if gh CLI is installed
      await execPromise('gh --version', { cwd: this.workingDir });

      // Create PR
      const { stdout, stderr } = await execPromise(
        `gh pr create --title "${title}" --body "${description}" --base main --head ${branchName}`,
        {
          cwd: this.workingDir,
        }
      );

      const prUrl = stdout.trim();
      return {
        success: true,
        prUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create PR: ${error.message}. GitHub CLI (gh) may not be installed.`,
      };
    }
  }

  /**
   * Check deployment status
   */
  async checkDeploymentStatus(
    environment: 'development' | 'staging' | 'production'
  ): Promise<{
    healthy: boolean;
    url?: string;
    error?: string;
  }> {
    const urls = {
      development: 'http://localhost:4000',
      staging: 'http://localhost:4000', // Same as dev for this project
      production: 'https://evofitmeals.com',
    };

    const url = urls[environment];

    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);

      // Simple health check with curl
      await execPromise(`curl -f -s -o /dev/null ${url}/health || curl -f -s -o /dev/null ${url}`, {
        timeout: 10000,
      });

      return {
        healthy: true,
        url,
      };
    } catch (error) {
      return {
        healthy: false,
        url,
        error: `Health check failed for ${environment}: ${error.message}`,
      };
    }
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(
    environment: 'development' | 'staging' | 'production',
    commitSha: string
  ): Promise<DeploymentResult> {
    const startTime = Date.now();

    try {
      const branch = environment === 'production' ? 'main' : 'qa-ready';

      await this.gitManager.checkout(branch);
      const resetResult = await this.gitManager.reset(commitSha, true);

      if (!resetResult.success) {
        return {
          success: false,
          environment,
          error: `Failed to rollback: ${resetResult.error}`,
        };
      }

      // Force push to remote
      const pushResult = await this.gitManager.push(branch, true);
      if (!pushResult.success) {
        return {
          success: false,
          environment,
          error: `Failed to push rollback: ${pushResult.error}`,
        };
      }

      return {
        success: true,
        environment,
        deploymentTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        environment,
        error: error.message,
      };
    }
  }
}
