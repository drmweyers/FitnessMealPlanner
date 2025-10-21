# Manual Testing Guide: Perceptual Hashing Feature

## Overview
This guide will help you manually test the new perceptual hashing feature for recipe image generation to ensure it's working correctly before production deployment.

**Test Duration:** 30-45 minutes
**Prerequisites:** Docker environment running, test accounts available

---

## Test Environment Setup

### 1. Verify Docker is Running
```bash
docker ps
```

**Expected:** You should see these containers:
- `fitnessmealplanner-dev` - Status: Up (healthy)
- `fitnessmealplanner-postgres` - Status: Up (healthy)
- `fitnessmealplanner-redis` - Status: Up (healthy)

### 2. Check Application is Accessible
Open browser to: http://localhost:4000

**Expected:** Landing page loads successfully

### 3. Verify Database Migration
```bash
# Check if recipe_image_hashes table exists
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "\d recipe_image_hashes"
```

**Expected:** Table schema displayed with columns:
- id, recipe_id, perceptual_hash, image_url, created_at, updated_at

---

## Manual Test Scenarios

### Test 1: Single Recipe Generation with Hash Storage

**Objective:** Verify that a single recipe generates an image with a perceptual hash stored in the database.

#### Steps:
1. Log in as Admin
   - Email: `admin@fitmeal.pro`
   - Password: `AdminPass123`

2. Navigate to Admin Dashboard → Recipe Library tab

3. Click "Generate Recipes" button

4. Configure generation:
   - Count: 1 recipe
   - Meal Type: Breakfast
   - Features: Image generation enabled

5. Click "Generate" and wait for completion (~30 seconds)

6. Verify in UI:
   - Recipe appears in list
   - Recipe has an image displayed
   - Image loads correctly (not broken link)

7. Verify in database:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "SELECT recipe_id, LEFT(perceptual_hash, 20) as hash_preview, image_url FROM recipe_image_hashes ORDER BY created_at DESC LIMIT 1;"
```

**Expected Results:**
- ✅ Recipe generated successfully
- ✅ Image displayed in UI
- ✅ Database shows perceptual hash stored
- ✅ Hash is alphanumeric string (hex format)
- ✅ Image URL points to OpenAI DALL-E

---

### Test 2: Batch Generation with Multiple Unique Images

**Objective:** Verify that multiple recipes generate unique images with different hashes.

#### Steps:
1. Still logged in as Admin

2. Click "Generate Recipes" button again

3. Configure generation:
   - Count: 5 recipes
   - Meal Type: Lunch
   - Features: All enabled

4. Click "Generate" and wait (~2-3 minutes)

5. Verify in UI:
   - All 5 recipes appear
   - Each recipe has a different image
   - Images load correctly

6. Verify uniqueness in database:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "
    SELECT
      COUNT(*) as total_hashes,
      COUNT(DISTINCT perceptual_hash) as unique_hashes
    FROM recipe_image_hashes
    WHERE created_at > NOW() - INTERVAL '5 minutes';
  "
```

**Expected Results:**
- ✅ 5 recipes generated
- ✅ All images visually different
- ✅ `total_hashes` = `unique_hashes` (no duplicates)
- ✅ Each hash is unique

---

### Test 3: Duplicate Detection Test

**Objective:** Verify that the system can detect and handle duplicate images.

#### Steps:
1. Check current hash count:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "SELECT COUNT(*) FROM recipe_image_hashes;"
```

2. Generate another batch:
   - Count: 10 recipes
   - Meal Type: Dinner
   - Features: All enabled

3. Monitor console logs for duplicate detection:
```bash
docker logs fitnessmealplanner-dev --tail 100 -f | grep -i "duplicate\|similarity"
```

4. After generation completes, check logs for messages like:
   - `[artist] Duplicate image detected for [Recipe Name]`
   - `[artist] Found X similar image(s) in database`
   - `[artist] Retrying...`

5. Verify final hash count:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "
    SELECT
      COUNT(*) as total_hashes,
      COUNT(DISTINCT perceptual_hash) as unique_hashes
    FROM recipe_image_hashes;
  "
```

**Expected Results:**
- ✅ Some retries logged if duplicates detected
- ✅ Final images all have unique hashes
- ✅ `total_hashes` = `unique_hashes` (no duplicates stored)
- ✅ System automatically retries when duplicate detected

---

### Test 4: Similarity Threshold Validation

**Objective:** Verify that the 95% similarity threshold works correctly.

#### Steps:
1. Query database for similar hashes:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "
    WITH hash_pairs AS (
      SELECT
        a.recipe_id as recipe1,
        b.recipe_id as recipe2,
        a.perceptual_hash as hash1,
        b.perceptual_hash as hash2
      FROM recipe_image_hashes a
      CROSS JOIN recipe_image_hashes b
      WHERE a.recipe_id < b.recipe_id
    )
    SELECT
      recipe1,
      recipe2,
      hash1,
      hash2
    FROM hash_pairs
    WHERE hash1 = hash2
    LIMIT 10;
  "
```

**Expected Results:**
- ✅ No rows returned (no exact hash matches)
- ✅ All hashes are unique

---

### Test 5: Performance Validation

**Objective:** Verify that perceptual hashing doesn't significantly slow down generation.

#### Steps:
1. Record start time

2. Generate 5 recipes with images:
   - Count: 5
   - Meal Type: Snack
   - Features: All enabled

3. Record end time

4. Calculate time per recipe: `(end_time - start_time) / 5`

5. Check database query performance:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "
    EXPLAIN ANALYZE
    SELECT * FROM recipe_image_hashes
    WHERE perceptual_hash = 'test_hash_12345';
  "
```

**Expected Results:**
- ✅ Average time per recipe: 20-40 seconds (depends on OpenAI)
- ✅ Database query execution time: < 10ms
- ✅ Index on `perceptual_hash` being used (check EXPLAIN output)

---

### Test 6: Error Handling and Placeholder Fallback

**Objective:** Verify that system handles OpenAI errors gracefully.

#### Steps:
1. Temporarily break OpenAI API key (optional - skip if you don't want to risk API):
   - Stop dev container
   - Set invalid API key in .env: `OPENAI_API_KEY=invalid_key_test`
   - Restart dev container

2. Try to generate 1 recipe

3. Check for placeholder image used

4. Restore correct API key and restart

**Expected Results (if testing with invalid key):**
- ✅ Generation doesn't crash
- ✅ Placeholder image used (Unsplash image)
- ✅ Error logged in console
- ✅ Recipe still created, just without custom image

**Alternative (safer - skip API key test):**
- ✅ Just verify placeholder URL exists in code: `server/services/agents/ImageGenerationAgent.ts`
- ✅ Confirm `PLACEHOLDER_IMAGE_URL` constant is defined

---

### Test 7: BMAD Generator UI Testing

**Objective:** Verify the BMAD Generator tab works with perceptual hashing.

#### Steps:
1. Navigate to Admin Dashboard

2. Click "BMAD Generator" tab (4th tab with robot icon)

3. Configure batch generation:
   - Count: 20 recipes
   - Meal Types: Select multiple (Breakfast, Lunch, Dinner)
   - Features: All enabled

4. Click "Start BMAD Generation"

5. Watch real-time SSE progress updates

6. Verify progress bar updates

7. After completion, check database:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" \
  psql -c "
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT perceptual_hash) as unique,
      MIN(created_at) as first_generated,
      MAX(created_at) as last_generated
    FROM recipe_image_hashes
    WHERE created_at > NOW() - INTERVAL '10 minutes';
  "
```

**Expected Results:**
- ✅ SSE progress updates in real-time
- ✅ All 20 recipes generated
- ✅ All images unique
- ✅ Generation time: 3-5 minutes total
- ✅ Database shows 20 unique hashes

---

## Validation Checklist

After completing all tests, verify:

- [ ] Perceptual hash stored for every generated image
- [ ] All hashes are unique (no duplicates in database)
- [ ] Database queries are fast (< 10ms for hash lookups)
- [ ] Duplicate detection works (retries logged if needed)
- [ ] Images display correctly in UI
- [ ] Placeholder fallback works on errors
- [ ] BMAD Generator UI works with real-time updates
- [ ] No broken images in recipe list
- [ ] Performance is acceptable (20-40 seconds per recipe)

---

## Database Verification Queries

### Query 1: Overall Hash Statistics
```sql
SELECT
  COUNT(*) as total_recipes,
  COUNT(DISTINCT perceptual_hash) as unique_hashes,
  COUNT(*) - COUNT(DISTINCT perceptual_hash) as duplicate_count,
  ROUND(COUNT(DISTINCT perceptual_hash)::numeric / COUNT(*) * 100, 2) as uniqueness_percentage
FROM recipe_image_hashes;
```

**Expected:**
- `duplicate_count` = 0
- `uniqueness_percentage` = 100.00

### Query 2: Recent Hashes
```sql
SELECT
  recipe_id,
  LEFT(perceptual_hash, 30) as hash_preview,
  LEFT(image_url, 50) as url_preview,
  created_at
FROM recipe_image_hashes
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- Each hash is different
- All created_at timestamps are recent

### Query 3: Hash Distribution
```sql
SELECT
  LENGTH(perceptual_hash) as hash_length,
  COUNT(*) as count
FROM recipe_image_hashes
GROUP BY LENGTH(perceptual_hash);
```

**Expected:**
- Consistent hash length across all records
- Typical perceptual hash length: 16-32 characters

---

## Troubleshooting

### Issue: No hashes in database
**Solution:**
1. Check migration was run: `scripts/0019_create_recipe_image_hashes.sql`
2. Verify table exists: `\d recipe_image_hashes` in psql
3. Check ImageGenerationAgent logs for errors

### Issue: Duplicate hashes found
**Solution:**
1. Check similarity threshold: Should be 0.95 (95%)
2. Verify retry logic is working (check logs)
3. May be legitimate if recipes are very similar

### Issue: Images not loading
**Solution:**
1. Check OpenAI API key is valid
2. Verify DALL-E 3 quota not exceeded
3. Check network connectivity
4. Look for placeholder images (expected on errors)

### Issue: Slow generation
**Solution:**
1. Check OpenAI API rate limits
2. Verify database indexes exist
3. Check Docker container resources
4. Normal: 20-40 seconds per recipe with image generation

---

## Success Criteria

**All tests pass if:**
- ✅ 100% uniqueness in database (`duplicate_count` = 0)
- ✅ All images display correctly in UI
- ✅ Database queries perform well (< 10ms)
- ✅ Duplicate detection and retry logic works
- ✅ Error handling provides placeholder fallback
- ✅ No crashes or critical errors in logs

---

## Next Steps After Manual Testing

If all tests pass:
1. Document results in test report
2. Proceed with production deployment
3. Run final validation on production after deployment

If tests fail:
1. Document specific failures
2. Review logs for error details
3. Fix issues and re-test
4. Update code and re-validate

---

**Testing Date:** _______________________
**Tester Name:** _______________________
**Results:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Notes:**
