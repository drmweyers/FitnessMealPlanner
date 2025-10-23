# BMAD Complete Generation E2E Test Design
**BMAD QA Agent:** Quinn (Test Architect)
**Date:** October 21, 2025
**Test Type:** End-to-End (E2E) Integration Test
**Priority:** P0 - CRITICAL (Business Logic)
**Risk Level:** 9/10

---

## Test Objective

Validate the complete BMAD multi-agent recipe generation workflow from user interaction through 8 agents to final database storage, including real-time SSE progress updates.

**Success Criteria:**
- ✅ 30 recipes generated successfully
- ✅ All recipes have valid images (DALL-E + S3)
- ✅ SSE progress updates received in real-time
- ✅ All 8 agents execute correctly
- ✅ Database transactions commit successfully
- ✅ No orphaned data on failure
- ✅ Recipe quality meets thresholds

---

## Test Scope

### In Scope
- Admin UI interaction (BMAD Generator tab)
- Complete 8-agent workflow execution
- SSE real-time progress streaming
- Database transaction integrity
- S3 image upload and storage
- Error handling and recovery
- Recipe approval workflow
- Performance validation

### Out of Scope
- Individual agent unit testing (already covered)
- Non-BMAD recipe generation methods
- Recipe editing/deletion post-generation
- Mobile browser testing (desktop only for initial test)

---

## Test Architecture

### 8 Agents to Validate

1. **RecipeConceptAgent** - Planning & chunking strategy
2. **ProgressMonitorAgent** - Real-time state tracking
3. **BMADCoordinator** - Workflow orchestration
4. **NutritionalValidatorAgent** - Auto-fix nutrition data
5. **DatabaseOrchestratorAgent** - Transactional saves
6. **ImageGenerationAgent** - DALL-E 3 integration
7. **ImageStorageAgent** - S3 upload handling
8. **BaseAgent** - Lifecycle management (inherited)

### SSE Event Flow
```
Client → POST /api/admin/generate-bmad
    ↓
Server → Create batch, start generation
    ↓
Client → GET /api/admin/bmad-progress-stream/:batchId (SSE)
    ↓
Server → Stream progress events
    {
      status: 'started' | 'in_progress' | 'complete' | 'error',
      agent: 'RecipeConceptAgent' | 'ImageGenerationAgent' | ...,
      currentRecipe: 1-30,
      totalRecipes: 30,
      message: 'Processing recipe 1 of 30',
      timestamp: '2025-10-21T...'
    }
    ↓
Client → Display real-time progress
    ↓
Server → Complete generation, close SSE
    ↓
Client → Fetch final recipes
```

---

## Test Scenarios

### Scenario 1: Happy Path - 30 Recipe Generation
**Description:** Generate 30 breakfast recipes with images
**Steps:**
1. Login as admin
2. Navigate to Admin Dashboard → BMAD Generator tab
3. Configure generation:
   - Recipe count: 30
   - Meal types: [breakfast]
   - Fitness goals: [weight_loss, muscle_gain]
   - Enable image generation: true
4. Click "Start BMAD Generation"
5. Observe SSE progress updates
6. Wait for completion (max 3 minutes)
7. Verify recipes created

**Expected Results:**
- ✅ 30 recipes created in database
- ✅ All recipes have imageUrl populated
- ✅ All recipes marked as unapproved (pending review)
- ✅ SSE events received (>20 progress updates)
- ✅ Each agent reported progress via SSE
- ✅ Generation completed in < 3 minutes
- ✅ No errors in browser console
- ✅ UI shows "Generation Complete" message

**Validation Queries:**
```sql
-- Verify recipe count
SELECT COUNT(*) FROM recipes WHERE meal_type = 'breakfast' AND approved = false;
-- Expected: 30

-- Verify images
SELECT COUNT(*) FROM recipes WHERE meal_type = 'breakfast' AND image_url IS NOT NULL;
-- Expected: 30

-- Verify S3 images exist
SELECT image_url FROM recipes WHERE meal_type = 'breakfast' LIMIT 5;
-- Expected: All URLs return 200 OK
```

---

### Scenario 2: SSE Progress Tracking
**Description:** Validate real-time SSE updates
**Steps:**
1. Start 10 recipe generation
2. Capture all SSE events
3. Analyze event structure and timing

**Expected SSE Events:**
```javascript
[
  { status: 'started', agent: 'BMADCoordinator', currentRecipe: 0, totalRecipes: 10, message: 'Starting BMAD generation' },
  { status: 'in_progress', agent: 'RecipeConceptAgent', currentRecipe: 1, totalRecipes: 10, message: 'Planning recipes (chunk 1 of 2)' },
  { status: 'in_progress', agent: 'NutritionalValidatorAgent', currentRecipe: 1, totalRecipes: 10, message: 'Validating nutrition for recipe 1' },
  { status: 'in_progress', agent: 'ImageGenerationAgent', currentRecipe: 1, totalRecipes: 10, message: 'Generating image for recipe 1' },
  { status: 'in_progress', agent: 'ImageStorageAgent', currentRecipe: 1, totalRecipes: 10, message: 'Uploading image to S3 for recipe 1' },
  { status: 'in_progress', agent: 'DatabaseOrchestratorAgent', currentRecipe: 1, totalRecipes: 10, message: 'Saving recipe 1 to database' },
  // ... repeat for recipes 2-10 ...
  { status: 'complete', agent: 'BMADCoordinator', currentRecipe: 10, totalRecipes: 10, message: 'BMAD generation complete' }
]
```

**Assertions:**
- ✅ Minimum 20 SSE events for 10 recipes
- ✅ All 8 agents appear in events
- ✅ Events ordered chronologically
- ✅ No duplicate events
- ✅ status transitions: started → in_progress (multiple) → complete
- ✅ currentRecipe increments from 1 to 10
- ✅ totalRecipes remains 10 throughout

---

### Scenario 3: Agent Failure Recovery
**Description:** Validate error handling when agent fails
**Steps:**
1. Mock ImageGenerationAgent failure (network timeout)
2. Start 5 recipe generation
3. Observe error handling

**Expected Results:**
- ✅ SSE event with status: 'error'
- ✅ Error message displayed in UI
- ✅ Database transaction rolled back
- ✅ No partial recipes saved
- ✅ No orphaned S3 images
- ✅ Batch marked as failed
- ✅ User can retry generation

**Error SSE Event:**
```javascript
{
  status: 'error',
  agent: 'ImageGenerationAgent',
  currentRecipe: 3,
  totalRecipes: 5,
  message: 'Image generation failed: Network timeout',
  error: 'DALL-E API timeout after 30s',
  timestamp: '2025-10-21T...'
}
```

---

### Scenario 4: Concurrent Generation Jobs
**Description:** Validate multiple BMAD jobs can run simultaneously
**Steps:**
1. Admin 1 starts 10 recipe generation (breakfast)
2. Admin 2 starts 10 recipe generation (lunch)
3. Both generations complete successfully

**Expected Results:**
- ✅ Both jobs complete without interference
- ✅ 20 total recipes created (10 breakfast + 10 lunch)
- ✅ SSE streams remain isolated (no cross-contamination)
- ✅ Database transactions don't conflict
- ✅ S3 uploads don't conflict

---

### Scenario 5: Generation Cancellation
**Description:** User cancels generation mid-process
**Steps:**
1. Start 30 recipe generation
2. After 5 recipes complete, click "Cancel"
3. Verify cleanup

**Expected Results:**
- ✅ SSE connection closed
- ✅ Generation stops gracefully
- ✅ Only completed recipes saved (5)
- ✅ No partial recipes in database
- ✅ S3 images for 5 recipes preserved
- ✅ Batch marked as cancelled

---

## Performance Requirements

### Response Time Targets
| Metric | Target | Max Acceptable |
|--------|--------|----------------|
| Recipe generation (per recipe) | < 5s | < 10s |
| Total time (30 recipes) | < 150s (2.5min) | < 180s (3min) |
| SSE event latency | < 100ms | < 500ms |
| Initial page load | < 2s | < 3s |
| Image generation (DALL-E) | < 3s | < 5s |
| S3 upload | < 1s | < 2s |

### Resource Constraints
- **Memory:** < 512MB per generation job
- **Database connections:** < 5 per job
- **S3 upload concurrency:** Max 5 simultaneous
- **OpenAI API rate limit:** 100 requests/minute

---

## Test Data Requirements

### Admin User
```javascript
{
  email: 'admin@fitmeal.pro',
  password: 'AdminPass123',
  role: 'admin'
}
```

### Generation Configurations

**Config 1: Small Batch**
```javascript
{
  count: 5,
  mealTypes: ['breakfast'],
  fitnessGoals: ['weight_loss'],
  dietaryRestrictions: [],
  enableImageGeneration: true
}
```

**Config 2: Medium Batch**
```javascript
{
  count: 10,
  mealTypes: ['breakfast', 'lunch'],
  fitnessGoals: ['weight_loss', 'muscle_gain'],
  dietaryRestrictions: ['gluten_free'],
  enableImageGeneration: true
}
```

**Config 3: Large Batch**
```javascript
{
  count: 30,
  mealTypes: ['breakfast'],
  fitnessGoals: ['weight_loss'],
  dietaryRestrictions: [],
  enableImageGeneration: true
}
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] Admin can access BMAD Generator tab
- [ ] Admin can configure generation parameters
- [ ] Admin can start generation
- [ ] SSE progress updates display in UI
- [ ] Generation completes successfully
- [ ] All recipes saved to database
- [ ] All images uploaded to S3
- [ ] Admin can view generated recipes
- [ ] Admin can approve/reject recipes
- [ ] Error messages displayed on failure

### Non-Functional Requirements
- [ ] 30 recipes generated in < 3 minutes
- [ ] SSE events received with < 500ms latency
- [ ] No memory leaks during generation
- [ ] Database transactions commit atomically
- [ ] S3 cleanup on transaction rollback
- [ ] Concurrent jobs don't interfere
- [ ] UI remains responsive during generation
- [ ] Browser console has 0 errors

---

## Risk Assessment

### High Risk Areas
1. **SSE Connection Stability** (8/10 risk)
   - Network interruptions could break SSE
   - Mitigation: Implement reconnection logic

2. **Database Transaction Integrity** (9/10 risk)
   - Failure mid-generation could leave partial data
   - Mitigation: Rollback on any agent failure

3. **S3 Orphaned Files** (7/10 risk)
   - S3 upload succeeds but database fails
   - Mitigation: Delete S3 file on rollback

4. **OpenAI Rate Limits** (6/10 risk)
   - DALL-E API rate limiting
   - Mitigation: Exponential backoff + retry

5. **Memory Exhaustion** (5/10 risk)
   - Large batches could exhaust memory
   - Mitigation: Limit batch size to 30

---

## Test Environment Setup

### Prerequisites
```bash
# 1. Start Docker development environment
docker-compose --profile dev up -d

# 2. Verify services running
docker ps | grep fitnessmealplanner

# 3. Check database connectivity
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" npm run db:push

# 4. Verify S3 credentials
echo $DO_SPACES_KEY && echo $DO_SPACES_SECRET

# 5. Install Playwright browsers
npx playwright install chromium
```

### Environment Variables Required
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/fitnessmealplanner
OPENAI_API_KEY=<your-key>
DO_SPACES_KEY=<your-key>
DO_SPACES_SECRET=<your-secret>
DO_SPACES_ENDPOINT=https://sfo3.digitaloceanspaces.com
DO_SPACES_BUCKET=pti
```

---

## Test Execution Plan

### Phase 1: Smoke Test (5 recipes)
- Verify basic functionality works
- Validate SSE connection
- Check database + S3 integration

### Phase 2: Full Test (30 recipes)
- Run complete happy path
- Measure performance
- Validate all agents

### Phase 3: Error Scenarios
- Test agent failures
- Test network interruptions
- Test concurrent jobs

### Phase 4: Performance Validation
- Measure response times
- Check resource usage
- Validate rate limits

---

## Success Metrics

### Must Pass (P0)
- ✅ 100% test pass rate
- ✅ 0 critical defects
- ✅ < 3 minute generation time (30 recipes)
- ✅ 100% recipe image coverage
- ✅ SSE events received for all 8 agents
- ✅ 0 database orphans
- ✅ 0 S3 orphans

### Should Pass (P1)
- ✅ < 5s per recipe generation
- ✅ < 100ms SSE latency
- ✅ Graceful error handling
- ✅ Concurrent job support

---

## Test Automation

### Playwright Test Structure
```typescript
test.describe('BMAD Complete Generation E2E', () => {
  test('should generate 30 recipes with SSE updates', async ({ page }) => {
    // Test implementation here
  });

  test('should handle agent failures gracefully', async ({ page }) => {
    // Test implementation here
  });

  test('should support concurrent generation jobs', async ({ page, context }) => {
    // Test implementation here
  });
});
```

---

## QA Test Design Decision

**Status:** ✅ **APPROVED FOR IMPLEMENTATION**
**Quality Score:** 9.5/10
**Estimated Effort:** 20 hours

**Recommendation:** Proceed with test implementation following this design. All scenarios, acceptance criteria, and risk mitigations are well-defined.

**Next Step:** BMAD SM Agent to refine story for implementation

---

**QA Agent:** Quinn
**Test Design Date:** October 21, 2025
**Review Date:** After implementation
