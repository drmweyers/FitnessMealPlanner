/**
 * Configuration for Autonomous Bug Fixer System
 */

import { FixConfig } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Default configuration for the autonomous fix system
 */
export const defaultFixConfig: FixConfig = {
  // AI Configuration - Supports both Anthropic (Claude) and OpenAI
  // Prefer Anthropic Claude for better code understanding
  aiProvider: (process.env.AI_PROVIDER as 'anthropic' | 'openai') || 'anthropic',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: 'claude-3-5-sonnet-20241022', // Claude 3.5 Sonnet - best for code
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: 'gpt-4-turbo-preview',

  // Fix Limits
  maxFixesPerRun: 10,

  // Auto-deployment settings
  autoDeployLevel1: true, // Auto-deploy Level 1 fixes (selectors, imports, types)
  autoDeployLevel2: false, // Require verification for Level 2 (UI, API, etc.)
  requireApprovalLevel3: true, // Always require human approval for Level 3

  // Retry Configuration
  maxRetries: 3,
  verificationTimeout: 300000, // 5 minutes

  // Git Configuration
  gitBranchPrefix: 'auto-fix',
};

/**
 * Get configuration with environment overrides
 */
export function getFixConfig(): FixConfig {
  return {
    ...defaultFixConfig,
    aiProvider: (process.env.AI_PROVIDER as 'anthropic' | 'openai') || defaultFixConfig.aiProvider,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || defaultFixConfig.anthropicApiKey,
    anthropicModel: process.env.ANTHROPIC_MODEL || defaultFixConfig.anthropicModel,
    openaiApiKey: process.env.OPENAI_API_KEY || defaultFixConfig.openaiApiKey,
    openaiModel: process.env.OPENAI_MODEL || defaultFixConfig.openaiModel,
    maxFixesPerRun: parseInt(process.env.MAX_FIXES_PER_RUN || String(defaultFixConfig.maxFixesPerRun)),
    autoDeployLevel1: process.env.AUTO_DEPLOY_LEVEL1 === 'true' || defaultFixConfig.autoDeployLevel1,
    autoDeployLevel2: process.env.AUTO_DEPLOY_LEVEL2 === 'true' || defaultFixConfig.autoDeployLevel2,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: FixConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check AI provider configuration
  if (config.aiProvider === 'anthropic') {
    if (!config.anthropicApiKey) {
      errors.push('Anthropic API key is required (set ANTHROPIC_API_KEY environment variable)');
    }
  } else if (config.aiProvider === 'openai') {
    if (!config.openaiApiKey) {
      errors.push('OpenAI API key is required (set OPENAI_API_KEY environment variable)');
    }
  } else {
    errors.push('Invalid AI provider. Must be "anthropic" or "openai"');
  }

  if (config.maxFixesPerRun < 1) {
    errors.push('maxFixesPerRun must be at least 1');
  }

  if (config.maxRetries < 0) {
    errors.push('maxRetries must be non-negative');
  }

  if (config.verificationTimeout < 30000) {
    errors.push('verificationTimeout must be at least 30 seconds');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
