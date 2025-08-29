# Story 1.2 Implementation: AI-Powered Recipe Generation Enhancements

**Story ID**: IMPL-001-002
**Status**: Ready for Development
**Developer**: Assigned
**Sprint**: Current

## 🎯 Implementation Overview

Enhance the existing recipe generation system with retry logic, quality scoring, and cost tracking WITHOUT breaking current functionality.

## ✅ Pre-Implementation Checklist

- [ ] Docker environment running
- [ ] OpenAI API key configured
- [ ] Feature branch created
- [ ] Existing recipe generation tested

## 🔧 Implementation Tasks

### Task 1: Add Retry Logic for OpenAI API
**Effort**: 2 hours
**Files to Create**: `server/services/recipeGeneratorEnhanced.ts`

```typescript
// server/services/recipeGeneratorEnhanced.ts
import { RecipeGenerator } from './recipeGenerator';
import type { Recipe, RecipeGenerationParams } from '../../shared/types';

export class EnhancedRecipeGenerator extends RecipeGenerator {
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  private timeout = 30000; // 30 second timeout
  
  /**
   * Generate recipe with automatic retry on failure
   */
  async generateWithRetry(params: RecipeGenerationParams): Promise<Recipe> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[Recipe Generation] Attempt ${attempt}/${this.maxRetries}`);
        
        // Add timeout wrapper
        const recipe = await Promise.race([
          this.generate(params),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Generation timeout')), this.timeout)
          )
        ]);
        
        console.log(`[Recipe Generation] Success on attempt ${attempt}`);
        return recipe;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`[Recipe Generation] Attempt ${attempt} failed:`, error);
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[Recipe Generation] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Recipe generation failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }
  
  /**
   * Determine if an error should trigger a retry
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors or rate limits
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    const retryableMessages = ['rate_limit', 'timeout', '429', '503', '502'];
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';
    
    return retryableCodes.includes(errorCode) ||
           retryableMessages.some(msg => errorMessage.includes(msg));
  }
  
  /**
   * Generate with fallback to simpler model if needed
   */
  async generateWithFallback(params: RecipeGenerationParams): Promise<Recipe> {
    try {
      // Try with GPT-4 first
      return await this.generateWithRetry({ ...params, model: 'gpt-4' });
    } catch (error) {
      console.warn('[Recipe Generation] GPT-4 failed, falling back to GPT-3.5-turbo');
      // Fallback to GPT-3.5-turbo for cost savings
      return await this.generateWithRetry({ ...params, model: 'gpt-3.5-turbo' });
    }
  }
}
```

### Task 2: Implement Recipe Quality Scoring
**Effort**: 2 hours
**Files to Create**: `server/services/recipeQualityScorer.ts`

```typescript
// server/services/recipeQualityScorer.ts
import type { Recipe } from '../../shared/schema';

export interface QualityScore {
  overall: number;          // 0-100
  nutritionalBalance: number;
  ingredientDiversity: number;
  instructionClarity: number;
  preparationComplexity: number;
  metadata: {
    warnings: string[];
    suggestions: string[];
  };
}

export class RecipeQualityScorer {
  /**
   * Calculate comprehensive quality score for a recipe
   */
  scoreRecipe(recipe: Recipe): QualityScore {
    const nutritionalBalance = this.scoreNutritionalBalance(recipe);
    const ingredientDiversity = this.scoreIngredientDiversity(recipe);
    const instructionClarity = this.scoreInstructionClarity(recipe);
    const preparationComplexity = this.scorePreparationComplexity(recipe);
    
    // Weighted average
    const overall = Math.round(
      nutritionalBalance * 0.35 +
      ingredientDiversity * 0.25 +
      instructionClarity * 0.25 +
      preparationComplexity * 0.15
    );
    
    const metadata = this.generateMetadata(recipe, {
      nutritionalBalance,
      ingredientDiversity,
      instructionClarity,
      preparationComplexity
    });
    
    return {
      overall,
      nutritionalBalance,
      ingredientDiversity,
      instructionClarity,
      preparationComplexity,
      metadata
    };
  }
  
  private scoreNutritionalBalance(recipe: Recipe): number {
    let score = 100;
    const nutrition = recipe.nutrition;
    
    // Check protein ratio (should be 15-30% of calories)
    const proteinCalories = (nutrition.protein || 0) * 4;
    const totalCalories = nutrition.calories || 1;
    const proteinRatio = proteinCalories / totalCalories;
    
    if (proteinRatio < 0.15) score -= 15;
    if (proteinRatio > 0.35) score -= 10;
    
    // Check if missing key nutrients
    if (!nutrition.fiber || nutrition.fiber < 3) score -= 10;
    if (nutrition.sodium && nutrition.sodium > 800) score -= 10;
    if (nutrition.sugar && nutrition.sugar > 15) score -= 5;
    
    return Math.max(0, score);
  }
  
  private scoreIngredientDiversity(recipe: Recipe): number {
    const ingredients = recipe.ingredients || [];
    const uniqueIngredients = new Set(
      ingredients.map(i => i.item?.toLowerCase())
    ).size;
    
    // Score based on variety
    if (uniqueIngredients < 5) return 60;
    if (uniqueIngredients < 8) return 75;
    if (uniqueIngredients < 12) return 85;
    return 95;
  }
  
  private scoreInstructionClarity(recipe: Recipe): number {
    const instructions = recipe.instructions || [];
    let score = 100;
    
    // Check for minimum instructions
    if (instructions.length < 3) score -= 20;
    
    // Check instruction quality
    instructions.forEach(instruction => {
      if (instruction.length < 20) score -= 5; // Too brief
      if (instruction.length > 200) score -= 3; // Too verbose
      if (!instruction.match(/[.!?]$/)) score -= 2; // No punctuation
    });
    
    return Math.max(0, Math.min(100, score));
  }
  
  private scorePreparationComplexity(recipe: Recipe): number {
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const instructionCount = recipe.instructions?.length || 0;
    
    // Ideal is moderate complexity
    if (totalTime < 15) return 70; // Too simple
    if (totalTime > 120) return 60; // Too complex
    if (instructionCount < 3) return 70;
    if (instructionCount > 15) return 75;
    
    return 90;
  }
  
  private generateMetadata(
    recipe: Recipe, 
    scores: Omit<QualityScore, 'overall' | 'metadata'>
  ): QualityScore['metadata'] {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (scores.nutritionalBalance < 70) {
      warnings.push('Nutritional balance needs improvement');
      if (!recipe.nutrition.fiber || recipe.nutrition.fiber < 3) {
        suggestions.push('Add more fiber-rich ingredients');
      }
    }
    
    if (scores.ingredientDiversity < 70) {
      warnings.push('Limited ingredient variety');
      suggestions.push('Consider adding more diverse ingredients');
    }
    
    if (scores.instructionClarity < 70) {
      warnings.push('Instructions could be clearer');
      suggestions.push('Expand brief instructions with more detail');
    }
    
    return { warnings, suggestions };
  }
}
```

### Task 3: Add API Cost Tracking
**Effort**: 1.5 hours
**Files to Create**: `server/services/apiCostTracker.ts`

```typescript
// server/services/apiCostTracker.ts
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class APICostTracker {
  // Pricing as of 2025 ($ per 1K tokens)
  private readonly pricing = {
    'gpt-4': {
      prompt: 0.03,
      completion: 0.06
    },
    'gpt-3.5-turbo': {
      prompt: 0.0015,
      completion: 0.002
    }
  };
  
  /**
   * Track API usage and calculate cost
   */
  async trackUsage(
    model: string,
    usage: TokenUsage,
    userId?: string,
    recipeId?: string
  ): Promise<number> {
    const modelPricing = this.pricing[model] || this.pricing['gpt-3.5-turbo'];
    
    const promptCost = (usage.promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completionTokens / 1000) * modelPricing.completion;
    const totalCost = promptCost + completionCost;
    
    // Log to console for now (database table will be added)
    console.log('[API Cost Tracker]', {
      model,
      tokens: usage.totalTokens,
      cost: `$${totalCost.toFixed(4)}`,
      userId,
      recipeId
    });
    
    // Store in database (after migration)
    try {
      await db.execute(sql`
        INSERT INTO api_usage_log (service, model, tokens, cost, user_id, recipe_id)
        VALUES ('openai', ${model}, ${usage.totalTokens}, ${totalCost}, 
                ${userId || null}, ${recipeId || null})
      `);
    } catch (error) {
      // Table might not exist yet, log for now
      console.error('[API Cost Tracker] Failed to store in DB:', error);
    }
    
    return totalCost;
  }
  
  /**
   * Get usage statistics for a time period
   */
  async getUsageStats(startDate: Date, endDate: Date) {
    try {
      const result = await db.execute(sql`
        SELECT 
          DATE_TRUNC('day', timestamp) as day,
          COUNT(*) as requests,
          SUM(tokens) as total_tokens,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost
        FROM api_usage_log
        WHERE timestamp BETWEEN ${startDate} AND ${endDate}
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY day DESC
      `);
      
      return result;
    } catch (error) {
      console.error('[API Cost Tracker] Failed to get stats:', error);
      return [];
    }
  }
  
  /**
   * Get monthly budget status
   */
  async getMonthlyBudgetStatus(budgetLimit: number = 100): Promise<{
    spent: number;
    remaining: number;
    percentUsed: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    try {
      const result = await db.execute(sql`
        SELECT COALESCE(SUM(cost), 0) as total_spent
        FROM api_usage_log
        WHERE timestamp >= ${startOfMonth}
      `);
      
      const spent = Number(result[0]?.total_spent || 0);
      const remaining = Math.max(0, budgetLimit - spent);
      const percentUsed = (spent / budgetLimit) * 100;
      
      return { spent, remaining, percentUsed };
    } catch (error) {
      console.error('[API Cost Tracker] Failed to get budget status:', error);
      return { spent: 0, remaining: budgetLimit, percentUsed: 0 };
    }
  }
}
```

### Task 4: Database Migration
**Effort**: 30 minutes
**Files to Create**: `migrations/0011_add_recipe_enhancements.sql`

```sql
-- Recipe Generation Enhancement Migration
-- Adds quality scoring and API cost tracking

BEGIN;

-- Add quality scoring and metadata to recipes
ALTER TABLE recipes 
  ADD COLUMN IF NOT EXISTS quality_score JSONB,
  ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS api_cost DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB,
  ADD COLUMN IF NOT EXISTS model_used VARCHAR(50);

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  tokens INTEGER,
  cost DECIMAL(10,4),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_cost ON api_usage_log(cost);
CREATE INDEX IF NOT EXISTS idx_recipes_quality_score ON recipes((quality_score->>'overall')::int);

-- Add comments for documentation
COMMENT ON COLUMN recipes.quality_score IS 'Quality scoring metrics for the recipe';
COMMENT ON COLUMN recipes.generation_attempts IS 'Number of generation attempts before success';
COMMENT ON COLUMN recipes.api_cost IS 'Cost in USD for generating this recipe';
COMMENT ON TABLE api_usage_log IS 'Tracks API usage and costs for monitoring';

COMMIT;
```

### Task 5: Integration with Existing Code
**Effort**: 1 hour
**Files to Modify**: `server/routes/recipes.ts`

Add these enhancements to the existing recipe generation endpoint:

```typescript
// In server/routes/recipes.ts
import { EnhancedRecipeGenerator } from '../services/recipeGeneratorEnhanced';
import { RecipeQualityScorer } from '../services/recipeQualityScorer';
import { APICostTracker } from '../services/apiCostTracker';

const enhancedGenerator = new EnhancedRecipeGenerator();
const qualityScorer = new RecipeQualityScorer();
const costTracker = new APICostTracker();

// Enhance the existing generate endpoint
router.post('/generate', requireAdmin, async (req, res) => {
  try {
    // Use enhanced generator with retry logic
    const recipe = await enhancedGenerator.generateWithFallback(req.body);
    
    // Score the recipe quality
    const qualityScore = qualityScorer.scoreRecipe(recipe);
    
    // Track API cost (mock usage for now)
    const cost = await costTracker.trackUsage(
      'gpt-4',
      { promptTokens: 500, completionTokens: 800, totalTokens: 1300 },
      req.user?.id,
      recipe.id
    );
    
    // Add metadata to recipe
    recipe.quality_score = qualityScore;
    recipe.api_cost = cost;
    
    res.json({
      status: 'success',
      data: recipe,
      metadata: {
        qualityScore: qualityScore.overall,
        cost: `$${cost.toFixed(4)}`,
        suggestions: qualityScore.metadata.suggestions
      }
    });
  } catch (error) {
    console.error('Recipe generation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate recipe',
      error: error.message
    });
  }
});
```

## 🚀 Implementation Sequence

1. Create feature branch
2. Run database migration
3. Create enhanced generator service
4. Add quality scorer
5. Implement cost tracking
6. Integrate with existing endpoints
7. Test thoroughly

## 🧪 Testing Checklist

- [ ] Recipe generation still works
- [ ] Retry logic handles failures
- [ ] Quality scores are accurate
- [ ] Cost tracking records properly
- [ ] No performance degradation
- [ ] Admin UI still functional

## 📊 Success Metrics

- ✅ Recipe generation success rate > 95%
- ✅ Average quality score > 75
- ✅ API costs tracked accurately
- ✅ Retry logic reduces failures by 50%

## 🎉 Definition of Done

- [ ] All enhancements implemented
- [ ] Existing functionality preserved
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated