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

    console.log('[Recipe Search] Executing advanced search with filters:', filters);

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
            SELECT 1 FROM jsonb_array_elements(${recipes.ingredientsJson}) AS ingredient
            WHERE ingredient->>'item' ILIKE ${`%${search}%`}
          )`
        )
      );
    }

    // Meal type filtering (meal_types is JSONB array)
    if (mealTypes && mealTypes.length > 0) {
      conditions.push(
        sql`${recipes.mealTypes} ?| array[${mealTypes.map(mt => `'${mt}'`).join(',')}]`
      );
    }

    // Dietary tags filtering (supports multiple tags)
    if (dietaryTags && dietaryTags.length > 0) {
      conditions.push(
        sql`${recipes.dietaryTags} ?| array[${dietaryTags.map(tag => `'${tag}'`).join(',')}]`
      );
    }

    // Nutritional range filtering using direct columns
    if (calories) {
      if (calories.min !== undefined) {
        conditions.push(gte(recipes.caloriesKcal, calories.min));
      }
      if (calories.max !== undefined) {
        conditions.push(lte(recipes.caloriesKcal, calories.max));
      }
    }

    if (protein) {
      if (protein.min !== undefined) {
        conditions.push(gte(recipes.proteinGrams, protein.min));
      }
      if (protein.max !== undefined) {
        conditions.push(lte(recipes.proteinGrams, protein.max));
      }
    }

    if (carbs) {
      if (carbs.min !== undefined) {
        conditions.push(gte(recipes.carbsGrams, carbs.min));
      }
      if (carbs.max !== undefined) {
        conditions.push(lte(recipes.carbsGrams, carbs.max));
      }
    }

    if (fat) {
      if (fat.min !== undefined) {
        conditions.push(gte(recipes.fatGrams, fat.min));
      }
      if (fat.max !== undefined) {
        conditions.push(lte(recipes.fatGrams, fat.max));
      }
    }

    // Time filtering using correct column names
    if (prepTime) {
      if (prepTime.min !== undefined) {
        conditions.push(gte(recipes.prepTimeMinutes, prepTime.min));
      }
      if (prepTime.max !== undefined) {
        conditions.push(lte(recipes.prepTimeMinutes, prepTime.max));
      }
    }

    if (cookTime) {
      if (cookTime.min !== undefined) {
        conditions.push(gte(recipes.cookTimeMinutes, cookTime.min));
      }
      if (cookTime.max !== undefined) {
        conditions.push(lte(recipes.cookTimeMinutes, cookTime.max));
      }
    }

    // Build ORDER BY clause
    let orderByClause;
    switch (sortBy) {
      case 'newest':
        orderByClause = sortOrder === 'asc' 
          ? sql`${recipes.creationTimestamp} ASC` 
          : sql`${recipes.creationTimestamp} DESC`;
        break;
      case 'prepTime':
        orderByClause = sortOrder === 'asc' 
          ? sql`${recipes.prepTimeMinutes} ASC NULLS LAST` 
          : sql`${recipes.prepTimeMinutes} DESC NULLS LAST`;
        break;
      case 'calories':
        orderByClause = sortOrder === 'asc' 
          ? sql`${recipes.caloriesKcal} ASC NULLS LAST` 
          : sql`${recipes.caloriesKcal} DESC NULLS LAST`;
        break;
      case 'rating':
        // Will implement when rating system is available
        orderByClause = sql`${recipes.creationTimestamp} DESC`;
        break;
      default:
        // Relevance scoring for text search
        if (search && search.trim()) {
          orderByClause = sql`
            CASE 
              WHEN ${recipes.name} ILIKE ${`%${search}%`} THEN 3
              WHEN ${recipes.description} ILIKE ${`%${search}%`} THEN 2
              ELSE 1
            END DESC, ${recipes.creationTimestamp} DESC
          `;
        } else {
          orderByClause = sql`${recipes.creationTimestamp} DESC`;
        }
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    console.log(`[Recipe Search] Executing query with ${conditions.length} conditions, page ${page}, limit ${limit}`);

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

    console.log(`[Recipe Search] Found ${total} matching recipes, returning page ${page} of ${totalPages}`);

    return {
      recipes: searchResults,
      total,
      page,
      totalPages,
      appliedFilters: filters,
      suggestions: this.generateSearchSuggestions(search, searchResults.length, total)
    };
  }

  /**
   * Generate search suggestions for better results
   */
  private generateSearchSuggestions(search?: string, resultCount?: number, totalCount?: number): string[] {
    const suggestions: string[] = [];

    if (search && totalCount === 0) {
      suggestions.push('Try broader search terms');
      suggestions.push('Check spelling of search terms');
      suggestions.push('Remove some filters to see more results');
    }

    if (!search && totalCount === 0) {
      suggestions.push('Try adding search terms or adjusting filters');
    }

    if (totalCount && totalCount > 100) {
      suggestions.push('Consider adding more specific filters to narrow results');
    }

    return suggestions;
  }

  /**
   * Get popular search terms and dietary tags
   */
  async getSearchMetadata() {
    console.log('[Recipe Search] Fetching search metadata...');

    try {
      const [mealTypes, dietaryTags] = await Promise.all([
        db.execute(sql`
          SELECT DISTINCT jsonb_array_elements_text(meal_types) as meal_type
          FROM recipes 
          WHERE is_approved = true AND meal_types IS NOT NULL AND meal_types != '[]'::jsonb
          ORDER BY meal_type
        `),
        
        db.execute(sql`
          SELECT DISTINCT jsonb_array_elements_text(dietary_tags) as tag
          FROM recipes 
          WHERE is_approved = true AND dietary_tags IS NOT NULL AND dietary_tags != '[]'::jsonb
          ORDER BY tag
        `)
      ]);

      const metadata = {
        availableMealTypes: mealTypes.map((row: any) => row.meal_type).filter(Boolean),
        availableDietaryTags: dietaryTags.map((row: any) => row.tag).filter(Boolean)
      };

      console.log(`[Recipe Search] Metadata: ${metadata.availableMealTypes.length} meal types, ${metadata.availableDietaryTags.length} dietary tags`);

      return metadata;
    } catch (error) {
      console.error('[Recipe Search] Failed to fetch metadata:', error);
      return {
        availableMealTypes: [],
        availableDietaryTags: []
      };
    }
  }

  /**
   * Get search statistics for admin analytics
   */
  async getSearchStatistics() {
    try {
      const [totalRecipes, mealTypeStats, avgNutrition] = await Promise.all([
        db.select({ count: sql`count(*)` })
          .from(recipes)
          .where(sql`${recipes.isApproved} = true`),
        
        db.execute(sql`
          SELECT jsonb_array_elements_text(meal_types) as meal_type, COUNT(*) as count
          FROM recipes 
          WHERE is_approved = true AND meal_types IS NOT NULL AND meal_types != '[]'::jsonb
          GROUP BY jsonb_array_elements_text(meal_types)
          ORDER BY count DESC
        `),
        
        db.execute(sql`
          SELECT 
            AVG(calories_kcal) as avg_calories,
            AVG(protein_grams) as avg_protein,
            AVG(carbs_grams) as avg_carbs,
            AVG(fat_grams) as avg_fat
          FROM recipes 
          WHERE is_approved = true
        `)
      ]);

      return {
        totalApprovedRecipes: Number(totalRecipes[0].count),
        mealTypeDistribution: mealTypeStats,
        averageNutrition: avgNutrition[0]
      };
    } catch (error) {
      console.error('[Recipe Search] Failed to get statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const recipeSearchService = new RecipeSearchService();