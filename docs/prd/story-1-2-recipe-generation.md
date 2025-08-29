# Story 1.2: AI-Powered Recipe Generation and Management

**Story ID**: STORY-001-002
**Epic**: EPIC-001 - FitnessMealPlanner System Enhancement
**Status**: Draft
**Priority**: High
**Points**: 8
**Type**: Enhancement

## Story Description

As an **admin user**,
I want to generate, manage, and approve AI-powered recipes with comprehensive nutritional data,
so that the platform maintains a high-quality recipe database for meal planning.

## Current State Analysis

### Existing Implementation
- OpenAI GPT-4 integration for recipe generation
- Basic recipe approval workflow
- Nutritional data calculation
- Recipe storage in PostgreSQL
- Admin interface for recipe management
- Image generation placeholder

### Files Involved
- `server/services/recipeGenerator.ts` - Core generation logic
- `server/services/openai.ts` - OpenAI API integration
- `server/routes/recipes.ts` - Recipe API endpoints
- `client/src/components/AdminRecipeGenerator.tsx` - Admin UI
- `shared/schema.ts` - Recipe database schema

## Acceptance Criteria

### Functional Requirements
1. ✅ OpenAI GPT-4 integration generates recipes with complete nutritional information
2. ✅ Recipe approval workflow allows admin review before public availability
3. ✅ Batch recipe generation supports creating multiple recipes efficiently
4. ✅ Recipe categorization includes meal types and dietary restriction tags
5. ✅ Nutritional data includes calories, protein, carbs, fat, fiber, sugar, sodium
6. ✅ Recipe search and filtering works across all nutritional parameters
7. ⚡ Image generation and storage integrates with recipe creation workflow

### Enhancement Opportunities
1. ⚡ Add retry logic for OpenAI API failures
2. ⚡ Implement recipe quality scoring
3. ⚡ Add recipe variation generation
4. ⚡ Improve prompt engineering for better results
5. ⚡ Add cost tracking for API usage
6. ⚡ Implement caching for generated recipes
7. ⚡ Add recipe deduplication checks

## Integration Verification

**IV1**: Verify existing approved recipes remain accessible and functional
**IV2**: Confirm OpenAI API integration maintains rate limiting and error handling
**IV3**: Validate recipe database queries maintain current performance characteristics

## Technical Specifications

### Enhancement Implementation Plan

#### Phase 1: Add Retry Logic and Error Handling
**Files to Create**: `server/services/recipeGeneratorEnhanced.ts`

```typescript
// Wrapper around existing generator with retry logic
class EnhancedRecipeGenerator {
  private maxRetries = 3;
  private retryDelay = 1000;
  
  async generateWithRetry(params: RecipeParams): Promise<Recipe> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.generate(params);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }
}
```

#### Phase 2: Recipe Quality Scoring
**Files to Create**: `server/services/recipeQualityScorer.ts`

```typescript
interface QualityScore {
  overall: number;
  nutritionalBalance: number;
  ingredientDiversity: number;
  instructionClarity: number;
  preparationComplexity: number;
}

class RecipeQualityScorer {
  scoreRecipe(recipe: Recipe): QualityScore {
    // Scoring logic based on multiple factors
    return {
      overall: this.calculateOverallScore(recipe),
      nutritionalBalance: this.scoreNutrition(recipe),
      ingredientDiversity: this.scoreIngredients(recipe),
      instructionClarity: this.scoreInstructions(recipe),
      preparationComplexity: this.scoreComplexity(recipe)
    };
  }
}
```

#### Phase 3: Enhanced Prompt Engineering
**Files to Modify**: `server/services/openai.ts`

```typescript
// Enhanced prompts for better recipe generation
const ENHANCED_RECIPE_PROMPT = `
Generate a detailed recipe with the following requirements:
- Nutritional targets: {calories}, {protein}g protein, {carbs}g carbs, {fat}g fat
- Dietary restrictions: {restrictions}
- Meal type: {mealType}

Please provide:
1. Creative recipe name
2. Brief description (2-3 sentences)
3. Complete ingredient list with exact measurements
4. Step-by-step instructions (numbered)
5. Accurate nutritional breakdown
6. Preparation and cooking times
7. Serving size
8. Chef tips or variations

Format as JSON with proper structure.
`;
```

#### Phase 4: Cost Tracking and Analytics
**Files to Create**: `server/services/apiCostTracker.ts`

```typescript
class APICostTracker {
  private costs = {
    'gpt-4': 0.03,      // per 1K tokens
    'gpt-3.5-turbo': 0.002  // per 1K tokens
  };
  
  async trackUsage(model: string, tokens: number): Promise<void> {
    const cost = (tokens / 1000) * this.costs[model];
    
    await db.insert(apiUsageLog).values({
      service: 'openai',
      model,
      tokens,
      cost,
      timestamp: new Date()
    });
  }
  
  async getMonthlyUsage(): Promise<UsageReport> {
    // Aggregate usage data
  }
}
```

### Database Changes (Backward Compatible)
```sql
-- Add quality scoring to recipes
ALTER TABLE recipes 
  ADD COLUMN IF NOT EXISTS quality_score JSONB,
  ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS api_cost DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB;

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  tokens INTEGER,
  cost DECIMAL(10,4),
  user_id UUID REFERENCES users(id),
  recipe_id UUID REFERENCES recipes(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for cost analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_log(user_id);
```

## Definition of Done

### Required
- [ ] Current recipe generation documented
- [ ] Retry logic implemented and tested
- [ ] Quality scoring system functional
- [ ] Cost tracking operational
- [ ] All existing functionality preserved
- [ ] No performance degradation

### Enhancements (If Implemented)
- [ ] Recipe variation generation working
- [ ] Deduplication checks active
- [ ] Caching layer implemented
- [ ] Enhanced prompts deployed
- [ ] Analytics dashboard created

## Testing Strategy

### Unit Tests
- Test retry logic with simulated failures
- Test quality scoring algorithms
- Test cost calculation accuracy

### Integration Tests
- Test OpenAI API integration with retries
- Test database transaction handling
- Test batch generation workflow

### E2E Tests
- Test complete recipe generation flow
- Test admin approval workflow
- Test recipe search and filtering

## Notes

- Focus on reliability and quality improvements
- Maintain backward compatibility
- Monitor API costs closely
- Consider implementing fallback to GPT-3.5 for cost savings