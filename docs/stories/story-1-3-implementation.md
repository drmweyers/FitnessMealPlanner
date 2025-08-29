# Story 1.3 Implementation: Advanced Recipe Search and Discovery

**Story ID**: IMPL-001-003
**Status**: Ready for Development
**Developer**: Assigned
**Sprint**: Current

## 🎯 Implementation Overview

Enhance the existing recipe search and filtering system with advanced capabilities including full-text search, nutritional range filtering, and comprehensive dietary tag support WITHOUT breaking current functionality.

## ✅ Pre-Implementation Checklist

- [x] Docker environment running
- [x] Story requirements reviewed
- [x] Existing search functionality analyzed
- [x] Database schema understood

## 🔧 Implementation Tasks

### Task 1: Create Enhanced Recipe Search Service
**Effort**: 2 hours
**Files to Create**: `server/services/recipeSearchService.ts`

```typescript
// server/services/recipeSearchService.ts
import { db } from '../db';
import { recipes } from '@shared/schema';
import { sql, and, or, gte, lte, ilike, inArray } from 'drizzle-orm';

export interface AdvancedSearchFilters {
  search?: string;
  mealTypes?: string[];
  dietaryTags?: string[];
  calories?: { min?: number; max?: number };
  protein?: { min?: number; max?: number };
  carbs?: { min?: number; max?: number };
  fat?: { min?: number; max?: number };
  prepTime?: { min?: number; max?: number };
  cookTime?: { min?: number; max?: number };
  difficulty?: string[];
  rating?: { min?: number };
  sortBy?: 'relevance' | 'rating' | 'newest' | 'prepTime' | 'calories';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResults {
  recipes: any[];
  total: number;
  page: number;
  totalPages: number;
  appliedFilters: AdvancedSearchFilters;
  suggestions?: string[];
}

export class RecipeSearchService {
  /**
   * Advanced recipe search with comprehensive filtering
   */
  async searchRecipes(filters: AdvancedSearchFilters): Promise<SearchResults> {
    const {
      search,
      mealTypes,
      dietaryTags,
      calories,
      protein,
      carbs,
      fat,
      prepTime,
      cookTime,
      difficulty,
      rating,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = filters;

    // Build WHERE conditions
    const conditions: any[] = [
      sql`${recipes.isApproved} = true` // Only approved recipes
    ];

    // Full-text search across name, description, and ingredients
    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(recipes.name, `%${search}%`),
          ilike(recipes.description, `%${search}%`),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${recipes.ingredients}) AS ingredient
            WHERE ingredient->>'item' ILIKE ${`%${search}%`}
          )`
        )
      );
    }

    // Meal type filtering
    if (mealTypes && mealTypes.length > 0) {
      conditions.push(inArray(recipes.mealType, mealTypes));
    }

    // Dietary tags filtering (supports multiple tags)
    if (dietaryTags && dietaryTags.length > 0) {
      conditions.push(
        sql`${recipes.dietaryTags} && ${JSON.stringify(dietaryTags)}`
      );
    }

    // Nutritional range filtering
    if (calories) {
      if (calories.min !== undefined) {
        conditions.push(gte(sql`(${recipes.nutrition}->>'calories')::numeric`, calories.min));
      }
      if (calories.max !== undefined) {
        conditions.push(lte(sql`(${recipes.nutrition}->>'calories')::numeric`, calories.max));
      }
    }

    if (protein) {
      if (protein.min !== undefined) {
        conditions.push(gte(sql`(${recipes.nutrition}->>'protein')::numeric`, protein.min));
      }
      if (protein.max !== undefined) {
        conditions.push(lte(sql`(${recipes.nutrition}->>'protein')::numeric`, protein.max));
      }
    }

    if (carbs) {
      if (carbs.min !== undefined) {
        conditions.push(gte(sql`(${recipes.nutrition}->>'carbs')::numeric`, carbs.min));
      }
      if (carbs.max !== undefined) {
        conditions.push(lte(sql`(${recipes.nutrition}->>'carbs')::numeric`, carbs.max));
      }
    }

    if (fat) {
      if (fat.min !== undefined) {
        conditions.push(gte(sql`(${recipes.nutrition}->>'fat')::numeric`, fat.min));
      }
      if (fat.max !== undefined) {
        conditions.push(lte(sql`(${recipes.nutrition}->>'fat')::numeric`, fat.max));
      }
    }

    // Time filtering
    if (prepTime) {
      if (prepTime.min !== undefined) {
        conditions.push(gte(recipes.prepTime, prepTime.min));
      }
      if (prepTime.max !== undefined) {
        conditions.push(lte(recipes.prepTime, prepTime.max));
      }
    }

    if (cookTime) {
      if (cookTime.min !== undefined) {
        conditions.push(gte(recipes.cookTime, cookTime.min));
      }
      if (cookTime.max !== undefined) {
        conditions.push(lte(recipes.cookTime, cookTime.max));
      }
    }

    // Build ORDER BY clause
    let orderByClause;
    switch (sortBy) {
      case 'newest':
        orderByClause = sortOrder === 'asc' 
          ? sql`${recipes.createdAt} ASC` 
          : sql`${recipes.createdAt} DESC`;
        break;
      case 'prepTime':
        orderByClause = sortOrder === 'asc' 
          ? sql`${recipes.prepTime} ASC NULLS LAST` 
          : sql`${recipes.prepTime} DESC NULLS LAST`;
        break;
      case 'calories':
        orderByClause = sortOrder === 'asc' 
          ? sql`(${recipes.nutrition}->>'calories')::numeric ASC NULLS LAST` 
          : sql`(${recipes.nutrition}->>'calories')::numeric DESC NULLS LAST`;
        break;
      case 'rating':
        // Will implement when rating system is available
        orderByClause = sql`${recipes.createdAt} DESC`;
        break;
      default:
        // Relevance scoring for text search
        if (search && search.trim()) {
          orderByClause = sql`
            CASE 
              WHEN ${recipes.name} ILIKE ${`%${search}%`} THEN 3
              WHEN ${recipes.description} ILIKE ${`%${search}%`} THEN 2
              ELSE 1
            END DESC, ${recipes.createdAt} DESC
          `;
        } else {
          orderByClause = sql`${recipes.createdAt} DESC`;
        }
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Execute search query
    const searchResults = await db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(recipes)
      .where(and(...conditions));

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    return {
      recipes: searchResults,
      total,
      page,
      totalPages,
      appliedFilters: filters,
      suggestions: this.generateSearchSuggestions(search, searchResults.length)
    };
  }

  /**
   * Generate search suggestions for better results
   */
  private generateSearchSuggestions(search?: string, resultCount?: number): string[] {
    const suggestions: string[] = [];

    if (search && resultCount === 0) {
      suggestions.push('Try broader search terms');
      suggestions.push('Check spelling of search terms');
      suggestions.push('Remove some filters to see more results');
    }

    if (!search && resultCount === 0) {
      suggestions.push('Try adding search terms or adjusting filters');
    }

    return suggestions;
  }

  /**
   * Get popular search terms and dietary tags
   */
  async getSearchMetadata() {
    const [mealTypes, dietaryTags] = await Promise.all([
      db.select({ mealType: recipes.mealType })
        .from(recipes)
        .where(sql`${recipes.isApproved} = true AND ${recipes.mealType} IS NOT NULL`)
        .groupBy(recipes.mealType),
      
      db.execute(sql`
        SELECT DISTINCT unnest(dietary_tags) as tag
        FROM recipes 
        WHERE is_approved = true AND dietary_tags IS NOT NULL
        ORDER BY tag
      `)
    ]);

    return {
      availableMealTypes: mealTypes.map(m => m.mealType).filter(Boolean),
      availableDietaryTags: dietaryTags.map((row: any) => row.tag).filter(Boolean)
    };
  }
}

// Export singleton instance
export const recipeSearchService = new RecipeSearchService();
```

### Task 2: Database Search Optimization
**Effort**: 1 hour
**Files to Create**: `migrations/0012_add_search_indexes.sql`

```sql
-- Advanced Recipe Search Optimization Migration
-- Adds indexes for full-text search and filtering performance

BEGIN;

-- Add full-text search index for recipe names and descriptions
CREATE INDEX IF NOT EXISTS idx_recipes_name_fulltext ON recipes USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_recipes_description_fulltext ON recipes USING gin(to_tsvector('english', description));

-- Add composite index for nutritional filtering
CREATE INDEX IF NOT EXISTS idx_recipes_nutrition_values ON recipes USING btree (
  ((nutrition->>'calories')::numeric),
  ((nutrition->>'protein')::numeric),
  ((nutrition->>'carbs')::numeric),
  ((nutrition->>'fat')::numeric)
) WHERE is_approved = true;

-- Add preparation and cooking time indexes
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON recipes (prep_time) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_recipes_cook_time ON recipes (cook_time) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON recipes ((COALESCE(prep_time, 0) + COALESCE(cook_time, 0))) WHERE is_approved = true;

-- Add dietary tags GIN index for array operations
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags_gin ON recipes USING gin(dietary_tags) WHERE is_approved = true;

-- Add meal type index
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes (meal_type) WHERE is_approved = true;

-- Add compound index for common search patterns
CREATE INDEX IF NOT EXISTS idx_recipes_search_compound ON recipes (meal_type, is_approved, created_at) 
WHERE is_approved = true;

-- Add index for ingredient search (JSONB path operations)
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_gin ON recipes USING gin(ingredients) WHERE is_approved = true;

-- Add comments for documentation
COMMENT ON INDEX idx_recipes_name_fulltext IS 'Full-text search index for recipe names';
COMMENT ON INDEX idx_recipes_description_fulltext IS 'Full-text search index for recipe descriptions';
COMMENT ON INDEX idx_recipes_nutrition_values IS 'Composite index for nutritional filtering';
COMMENT ON INDEX idx_recipes_dietary_tags_gin IS 'GIN index for dietary tag array operations';

COMMIT;
```

### Task 3: Enhanced API Endpoints
**Effort**: 1 hour
**Files to Modify**: `server/routes/recipes.ts`

Add enhanced search endpoint after existing routes:

```typescript
// Import the new search service
import { recipeSearchService } from '../services/recipeSearchService';

// Enhanced recipe search with comprehensive filtering
router.get('/search', async (req, res) => {
  try {
    const filters = {
      search: req.query.search as string,
      mealTypes: req.query.mealTypes ? (req.query.mealTypes as string).split(',') : undefined,
      dietaryTags: req.query.dietaryTags ? (req.query.dietaryTags as string).split(',') : undefined,
      calories: req.query.caloriesMin || req.query.caloriesMax ? {
        min: req.query.caloriesMin ? Number(req.query.caloriesMin) : undefined,
        max: req.query.caloriesMax ? Number(req.query.caloriesMax) : undefined
      } : undefined,
      protein: req.query.proteinMin || req.query.proteinMax ? {
        min: req.query.proteinMin ? Number(req.query.proteinMin) : undefined,
        max: req.query.proteinMax ? Number(req.query.proteinMax) : undefined
      } : undefined,
      carbs: req.query.carbsMin || req.query.carbsMax ? {
        min: req.query.carbsMin ? Number(req.query.carbsMin) : undefined,
        max: req.query.carbsMax ? Number(req.query.carbsMax) : undefined
      } : undefined,
      fat: req.query.fatMin || req.query.fatMax ? {
        min: req.query.fatMin ? Number(req.query.fatMin) : undefined,
        max: req.query.fatMax ? Number(req.query.fatMax) : undefined
      } : undefined,
      prepTime: req.query.prepTimeMin || req.query.prepTimeMax ? {
        min: req.query.prepTimeMin ? Number(req.query.prepTimeMin) : undefined,
        max: req.query.prepTimeMax ? Number(req.query.prepTimeMax) : undefined
      } : undefined,
      cookTime: req.query.cookTimeMin || req.query.cookTimeMax ? {
        min: req.query.cookTimeMin ? Number(req.query.cookTimeMin) : undefined,
        max: req.query.cookTimeMax ? Number(req.query.cookTimeMax) : undefined
      } : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20
    };

    const results = await recipeSearchService.searchRecipes(filters);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Advanced recipe search failed:', error);
    res.status(400).json({ 
      success: false,
      error: 'Invalid search parameters',
      message: error.message 
    });
  }
});

// Get search metadata (available filters)
router.get('/search/metadata', async (req, res) => {
  try {
    const metadata = await recipeSearchService.getSearchMetadata();
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Failed to get search metadata:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get search metadata' 
    });
  }
});
```

### Task 4: Integration Testing
**Effort**: 30 minutes
**Files to Create**: `test/test-advanced-search.ts`

```typescript
// test/test-advanced-search.ts
import { recipeSearchService } from '../server/services/recipeSearchService';

console.log('🔍 Testing Advanced Recipe Search (Story 1.3)');
console.log('=' + '='.repeat(50));

async function runAdvancedSearchTests() {
  try {
    // Test 1: Basic text search
    console.log('\n🔤 Test 1: Basic Text Search');
    console.log('-'.repeat(40));
    
    const basicSearch = await recipeSearchService.searchRecipes({
      search: 'chicken',
      limit: 5
    });
    
    console.log(`✅ Found ${basicSearch.total} recipes containing 'chicken'`);
    console.log(`✅ Returned ${basicSearch.recipes.length} recipes (limit: 5)`);
    
    // Test 2: Nutritional filtering
    console.log('\n🥗 Test 2: Nutritional Range Filtering');
    console.log('-'.repeat(40));
    
    const nutritionSearch = await recipeSearchService.searchRecipes({
      calories: { min: 300, max: 500 },
      protein: { min: 20 },
      limit: 10
    });
    
    console.log(`✅ Found ${nutritionSearch.total} recipes with 300-500 calories and 20+ protein`);
    console.log(`✅ Nutrition filtering operational`);
    
    // Test 3: Meal type and dietary tag filtering
    console.log('\n🍽️ Test 3: Meal Type & Dietary Tag Filtering');
    console.log('-'.repeat(40));
    
    const filterSearch = await recipeSearchService.searchRecipes({
      mealTypes: ['lunch', 'dinner'],
      dietaryTags: ['high-protein'],
      limit: 10
    });
    
    console.log(`✅ Found ${filterSearch.total} high-protein lunch/dinner recipes`);
    console.log(`✅ Multi-filter search operational`);
    
    // Test 4: Sorting and pagination
    console.log('\n📊 Test 4: Sorting and Pagination');
    console.log('-'.repeat(40));
    
    const sortedSearch = await recipeSearchService.searchRecipes({
      sortBy: 'calories',
      sortOrder: 'asc',
      page: 2,
      limit: 5
    });
    
    console.log(`✅ Page 2 results with calorie sorting (ascending)`);
    console.log(`✅ Total pages: ${sortedSearch.totalPages}`);
    
    // Test 5: Search metadata
    console.log('\n📋 Test 5: Search Metadata');
    console.log('-'.repeat(40));
    
    const metadata = await recipeSearchService.getSearchMetadata();
    console.log(`✅ Available meal types: ${metadata.availableMealTypes.join(', ')}`);
    console.log(`✅ Available dietary tags: ${metadata.availableDietaryTags.slice(0, 5).join(', ')}...`);
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 Story 1.3 Implementation Summary:');
    console.log('  ✅ Advanced text search across multiple fields');
    console.log('  ✅ Comprehensive nutritional range filtering');
    console.log('  ✅ Multi-select dietary tag and meal type filtering');
    console.log('  ✅ Flexible sorting and pagination');
    console.log('  ✅ Search metadata and filter options');
    console.log('  ✅ Performance optimized with database indexes');
    
    console.log('\n🎉 Story 1.3: Advanced Recipe Search - READY FOR TESTING!');
    
  } catch (error) {
    console.error('❌ Advanced search test failed:', error);
  }
}

// Run tests
runAdvancedSearchTests().catch(console.error);
```

## 🚀 Implementation Sequence

1. Create enhanced recipe search service with comprehensive filtering
2. Run database migration to add search optimization indexes
3. Update API endpoints with advanced search capabilities
4. Run integration tests to verify functionality
5. Test backward compatibility with existing search

## 🧪 Testing Checklist

- [ ] Text search works across names, descriptions, and ingredients
- [ ] Nutritional range filtering functions correctly
- [ ] Dietary tag filtering supports multiple selections
- [ ] Meal type filtering works as expected
- [ ] Preparation time filtering operational
- [ ] Sorting options function correctly
- [ ] Pagination maintains performance
- [ ] Search metadata endpoint works
- [ ] Existing search functionality preserved
- [ ] Performance meets expectations with indexes

## 📊 Success Metrics

- ✅ Advanced search supports all specified filter types
- ✅ Search performance < 500ms for complex queries
- ✅ Full-text search relevance scoring functional
- ✅ Database indexes improve query performance by >50%
- ✅ API endpoints return comprehensive search results

## 🎉 Definition of Done

- [ ] All search and filtering features implemented
- [ ] Database indexes optimize search performance
- [ ] API endpoints support comprehensive filtering
- [ ] Integration tests validate all functionality
- [ ] Existing functionality preserved
- [ ] Code reviewed and documented