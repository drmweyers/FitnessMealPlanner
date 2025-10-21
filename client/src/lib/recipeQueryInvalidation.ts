/**
 * Recipe Query Invalidation Utility
 *
 * Centralized function to invalidate all recipe-related queries after generation or updates.
 * This ensures the UI refreshes across all components (Admin, Pending Recipes, etc.)
 * without requiring a browser refresh.
 *
 * Usage: Call this after recipe generation, approval, or deletion.
 */

import type { QueryClient } from "@tanstack/react-query";

export function invalidateRecipeQueries(queryClient: QueryClient, source: string = 'unknown') {
  console.log(`[Recipe Invalidation] Invalidating all recipe queries (source: ${source})`);

  try {
    // Invalidate approved recipes list (Admin.tsx - Recipe Library tab)
    // Uses queryKey: ["admin-recipes", filters]
    queryClient.invalidateQueries({
      queryKey: ["admin-recipes"],
      refetchType: 'all' // Refetch both active and inactive queries
    });
    console.log('[Recipe Invalidation] ✓ admin-recipes invalidated');

    // Invalidate pending recipes list (PendingRecipesTable.tsx)
    // Uses queryKey: ['/api/admin/recipes', filters]
    queryClient.invalidateQueries({
      queryKey: ["/api/admin/recipes"],
      refetchType: 'all'
    });
    console.log('[Recipe Invalidation] ✓ /api/admin/recipes invalidated');

    // Invalidate general recipes endpoint (if used elsewhere)
    queryClient.invalidateQueries({
      queryKey: ["/api/recipes"],
      refetchType: 'all'
    });
    console.log('[Recipe Invalidation] ✓ /api/recipes invalidated');

    // Invalidate admin statistics
    queryClient.invalidateQueries({
      queryKey: ["admin-stats"],
      refetchType: 'all'
    });
    console.log('[Recipe Invalidation] ✓ admin-stats invalidated');

    console.log('[Recipe Invalidation] ✅ All recipe queries invalidated successfully');

    return true;
  } catch (error) {
    console.error('[Recipe Invalidation] ❌ Error invalidating queries:', error);
    return false;
  }
}
