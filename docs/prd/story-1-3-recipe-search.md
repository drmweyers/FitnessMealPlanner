# Story 1.3: Advanced Recipe Search and Discovery

**Story ID**: STORY-001-003
**Epic**: EPIC-001 - FitnessMealPlanner System Enhancement
**Status**: Ready for Implementation
**Priority**: High
**Points**: 5
**Type**: Enhancement

## Story Description

As a **trainer or customer**,
I want to search and filter recipes by comprehensive criteria including nutritional parameters,
so that I can find appropriate recipes for specific dietary needs and meal planning requirements.

## Current State Analysis

### Existing Implementation
- Basic recipe search functionality exists
- Simple filtering by approved status
- Pagination support in place
- Recipe storage in PostgreSQL with proper indexing
- Basic REST API endpoints for recipe retrieval

### Files Involved
- `server/routes/recipes.ts` - Public recipe API endpoints
- `server/storage/index.ts` - Recipe search and filtering logic
- `client/src/pages/Customer.tsx` - Customer recipe browsing interface
- `client/src/pages/Trainer.tsx` - Trainer recipe selection interface
- `shared/schema.ts` - Recipe database schema

## Acceptance Criteria

### Functional Requirements
1. ✅ Text search works across recipe names, descriptions, and ingredients
2. ⚡ Filtering by meal type (breakfast, lunch, dinner, snack) functions correctly
3. ⚡ Dietary restriction filtering (vegan, keto, gluten-free) works accurately
4. ⚡ Nutritional range filtering supports min/max values for all nutrients
5. ⚡ Preparation time filtering enables quick meal discovery
6. ✅ Pagination and sorting maintain performance with large recipe databases
7. ⚡ Search results display complete recipe information and ratings

### Enhancement Opportunities
1. ⚡ Implement advanced full-text search with PostgreSQL
2. ⚡ Add nutritional range filtering (calories, protein, carbs, fat)
3. ⚡ Enhanced dietary tag filtering with multiple selection
4. ⚡ Preparation time range filtering
5. ⚡ Recipe rating and popularity sorting
6. ⚡ Search result highlighting and relevance scoring
7. ⚡ Save and reuse search filters

## Integration Verification

**IV1**: Verify existing search functionality maintains current response times
**IV2**: Confirm recipe filtering preserves all current database relationships
**IV3**: Validate search performance scales appropriately with recipe database growth

## Technical Specifications

### Enhancement Implementation Plan

#### Phase 1: Enhanced Text Search with PostgreSQL Full-Text Search
**Files to Modify**: `server/storage/index.ts`, `server/routes/recipes.ts`

```typescript
// Add full-text search capabilities
const searchRecipesWithFullText = async (query: string) => {
  return await db.execute(sql`
    SELECT *, 
           ts_rank(to_tsvector('english', name || ' ' || description || ' ' || 
                   array_to_string(ingredients, ' ')), plainto_tsquery('english', ${query})) as rank
    FROM recipes 
    WHERE to_tsvector('english', name || ' ' || description || ' ' || 
          array_to_string(ingredients, ' ')) @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
  `);
};
```

#### Phase 2: Advanced Filtering System
**Files to Create**: `server/services/recipeSearchService.ts`

```typescript
interface AdvancedSearchFilters {
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
}

class RecipeSearchService {
  async searchRecipes(filters: AdvancedSearchFilters): Promise<SearchResults> {
    // Build dynamic query based on filters
    // Implement efficient querying with proper indexing
    // Return paginated results with metadata
  }
}
```

#### Phase 3: Enhanced Frontend Search Interface
**Files to Modify**: `client/src/components/RecipeSearch.tsx` (new)

```typescript
const RecipeSearch = () => {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  return (
    <div className="recipe-search">
      <SearchInput />
      <FilterPanel filters={filters} onChange={setFilters} />
      <SortOptions />
      <SavedSearches searches={savedSearches} />
      <SearchResults />
    </div>
  );
};
```

#### Phase 4: Database Optimization
**Files to Create**: `migrations/0012_add_search_indexes.sql`

```sql
-- Add full-text search indexes
CREATE INDEX IF NOT EXISTS idx_recipes_fulltext ON recipes 
USING gin(to_tsvector('english', name || ' ' || description));

-- Add nutritional filtering indexes
CREATE INDEX IF NOT EXISTS idx_recipes_nutrition ON recipes 
USING btree (
  (nutrition->>'calories')::numeric,
  (nutrition->>'protein')::numeric,
  (nutrition->>'carbs')::numeric,
  (nutrition->>'fat')::numeric
);

-- Add preparation time indexes
CREATE INDEX IF NOT EXISTS idx_recipes_time ON recipes (prepTime, cookTime);

-- Add dietary tags index
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON recipes USING gin(dietaryTags);
```

### API Endpoint Enhancements

#### Enhanced Search Endpoint
```typescript
// GET /api/recipes/search - Advanced recipe search
router.get('/search', async (req, res) => {
  try {
    const filters = parseSearchFilters(req.query);
    const results = await recipeSearchService.searchRecipes(filters);
    res.json({
      recipes: results.recipes,
      total: results.total,
      filters: results.appliedFilters,
      suggestions: results.suggestions
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid search parameters' });
  }
});
```

## Definition of Done

### Required
- [ ] Full-text search implemented with PostgreSQL
- [ ] Advanced filtering supports all nutritional parameters
- [ ] Dietary tag filtering with multiple selection
- [ ] Preparation time range filtering
- [ ] Performance optimization with proper indexing
- [ ] Enhanced API endpoints with comprehensive filtering

### Enhancements (If Implemented)
- [ ] Search result highlighting and relevance scoring
- [ ] Saved search functionality
- [ ] Recipe recommendation based on search history
- [ ] Advanced sorting options (rating, popularity, newest)
- [ ] Search analytics for admins

## Testing Strategy

### Unit Tests
- Test search service with various filter combinations
- Test query building and parameter validation
- Test performance with large datasets

### Integration Tests
- Test API endpoints with complex filter combinations
- Test database query performance
- Test pagination with filtered results

### E2E Tests
- Test complete search workflow from frontend
- Test filter combinations and result accuracy
- Test performance with realistic data volumes

## Notes

- Focus on performance and user experience
- Maintain backward compatibility with existing search
- Implement proper caching for frequently used searches
- Consider search analytics for future improvements
- Ensure mobile-responsive design for search interface