# Cache Invalidation Test Plan

## 🎯 Testing Automatic Cache Invalidation

### What was implemented:

1. **CacheManager Class** (`/client/src/lib/cacheUtils.ts`)
   - Centralized cache invalidation system
   - Smart invalidation for different operations
   - Progressive refresh for recipe generation
   - Periodic refresh functionality

2. **Updated Components:**
   - `Admin.tsx` - Uses cacheManager for all operations
   - `AdminRecipeGenerator.tsx` - Smart generation cache handling
   - All mutations now use centralized cache management

### Test Steps:

#### 1. Basic Cache Invalidation Test
1. Open admin panel at http://localhost:4000/admin
2. Note the current stats (should show 46 approved, 0 pending)
3. Generate 2 new recipes
4. Watch the stats update automatically within 5-10 seconds
5. Verify recipes appear in the list

#### 2. Approval Operation Test
1. Filter to show "Pending" recipes (if any)
2. Approve a recipe
3. Verify stats update immediately
4. Verify recipe moves from pending to approved list

#### 3. Bulk Operations Test
1. Select multiple recipes
2. Perform bulk approve/delete operation
3. Verify stats update immediately
4. Verify UI reflects changes

#### 4. Periodic Refresh Test
1. Leave admin panel open for 2+ minutes
2. Stats should refresh automatically every minute
3. Check browser console for cache refresh logs

### Expected Console Logs:
- "🔄 Invalidating recipe caches..."
- "✅ Recipe caches invalidated"
- "🔄 Handling recipe generation..."
- "🔄 Periodic cache refresh..."

### What Should Be Fixed:
- No more "pending approval 10" with empty list
- Stats should update within 5-10 seconds of operations
- UI should stay in sync with database

### Verification Commands:
```bash
# Check actual database counts
docker compose exec postgres psql -U postgres -d fitmeal -c "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_approved = true) as approved, COUNT(*) FILTER (WHERE is_approved = false) as pending FROM recipes;"
```