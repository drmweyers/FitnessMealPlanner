# Story: BMAD Complete Generation E2E Test Implementation
**BMAD SM Agent:** Story refinement
**Story ID:** E2E-BMAD-001
**Epic:** E2E Test Coverage Enhancement
**Priority:** P0 - CRITICAL
**Estimate:** 20 hours
**Status:** Ready for Development

---

## Story Overview

**As a:** QA Engineer
**I want to:** Implement end-to-end tests for BMAD multi-agent recipe generation
**So that:** We can validate the complete 8-agent workflow with SSE progress tracking in production-like environment

**Acceptance Criteria:**
- ✅ 5 E2E test scenarios implemented (happy path, SSE, errors, concurrent, cancellation)
- ✅ All tests pass on Chromium browser
- ✅ SSE event validation complete
- ✅ Database integrity verified
- ✅ S3 image upload verified
- ✅ Performance targets met (< 3min for 30 recipes)

---

## Reference Documents

- **QA Test Design:** `docs/qa/assessments/bmad-e2e-test-design.md`
- **BMAD Architecture:** `server/services/agents/`
- **Existing BMAD Tests:** `test/unit/agents/*.test.ts`
- **Existing E2E Patterns:** `test/e2e/role-collaboration-workflows.spec.ts`

---

## Tasks Breakdown

### Task 1: Setup Test File and Utilities
**File:** `test/e2e/bmad-complete-generation.spec.ts`
**Estimated:** 3 hours

**Subtasks:**
1. Create test file with Playwright setup
2. Create SSE event listener utility
3. Create database query helpers
4. Create S3 verification helpers
5. Create test data fixtures

**Implementation:**
```typescript
// test/e2e/bmad-complete-generation.spec.ts
import { test, expect, Page } from '@playwright/test';

// SSE Event Listener Utility
class SSEEventListener {
  private events: any[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async listen(batchId: string) {
    await this.page.evaluate((id) => {
      const eventSource = new EventSource(`/api/admin/bmad-progress-stream/${id}`);
      (window as any).sseEvents = [];

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        (window as any).sseEvents.push(data);
      };

      eventSource.onerror = () => {
        eventSource.close();
      };
    }, batchId);
  }

  async getEvents(): Promise<any[]> {
    return await this.page.evaluate(() => (window as any).sseEvents || []);
  }

  async waitForStatus(status: string, timeout = 180000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const events = await this.getEvents();
      if (events.some(e => e.status === status)) {
        return events;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout waiting for SSE status: ${status}`);
  }
}

// Database Query Helpers
async function getRecentRecipes(count: number) {
  // Query database for recent recipes
  const { db } = await import('@db/index');
  const { recipes } = await import('@db/schema');
  const { desc } = await import('drizzle-orm');

  return await db.select().from(recipes).orderBy(desc(recipes.createdAt)).limit(count);
}

// S3 Verification Helpers
async function verifyS3ImageExists(imageUrl: string): Promise<boolean> {
  const response = await fetch(imageUrl);
  return response.ok;
}
```

---

### Task 2: Implement Scenario 1 - Happy Path (30 Recipes)
**Estimated:** 5 hours

**Test Steps:**
1. Login as admin
2. Navigate to BMAD Generator tab
3. Configure: 30 recipes, breakfast, weight_loss
4. Start generation
5. Listen to SSE events
6. Wait for completion
7. Verify recipes + images

**Implementation:**
```typescript
test.describe('BMAD Complete Generation E2E', () => {
  test('Scenario 1: Generate 30 recipes with SSE updates', async ({ page }) => {
    // 1. Login as admin
    await page.goto('http://localhost:4000/login');
    await page.fill('input[name="email"]', 'admin@fitmeal.pro');
    await page.fill('input[name="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');

    // 2. Navigate to BMAD Generator tab
    await page.click('text=BMAD Generator');
    await expect(page.locator('h2:has-text("BMAD Recipe Generator")')).toBeVisible();

    // 3. Configure generation
    await page.selectOption('select[name="recipeCount"]', '30');
    await page.check('input[value="breakfast"]');
    await page.check('input[value="weight_loss"]');
    await page.check('input[name="enableImageGeneration"]');

    // 4. Setup SSE listener
    const sseListener = new SSEEventListener(page);

    // 5. Start generation and capture batch ID
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/admin/generate-bmad') && res.status() === 200),
      page.click('button:has-text("Start BMAD Generation")')
    ]);

    const { batchId } = await response.json();
    expect(batchId).toBeDefined();

    // 6. Start listening to SSE
    await sseListener.listen(batchId);

    // 7. Wait for completion (max 3 minutes)
    const events = await sseListener.waitForStatus('complete', 180000);

    // 8. Verify SSE events
    expect(events.length).toBeGreaterThan(20); // Minimum 20 events for 30 recipes
    expect(events.filter(e => e.agent === 'RecipeConceptAgent').length).toBeGreaterThan(0);
    expect(events.filter(e => e.agent === 'ImageGenerationAgent').length).toBe(30);
    expect(events.filter(e => e.agent === 'DatabaseOrchestratorAgent').length).toBe(30);
    expect(events.filter(e => e.agent === 'ImageStorageAgent').length).toBe(30);

    // 9. Verify recipes in database
    const recipes = await getRecentRecipes(30);
    expect(recipes.length).toBe(30);
    expect(recipes.every(r => r.mealType === 'breakfast')).toBe(true);
    expect(recipes.every(r => r.approved === false)).toBe(true);
    expect(recipes.every(r => r.imageUrl !== null)).toBe(true);

    // 10. Verify S3 images exist
    const imageChecks = await Promise.all(
      recipes.slice(0, 5).map(r => verifyS3ImageExists(r.imageUrl!))
    );
    expect(imageChecks.every(exists => exists)).toBe(true);

    // 11. Verify UI shows completion
    await expect(page.locator('text=Generation Complete')).toBeVisible();
    await expect(page.locator('text=30 recipes generated')).toBeVisible();
  });
});
```

---

### Task 3: Implement Scenario 2 - SSE Progress Tracking
**Estimated:** 3 hours

**Test Focus:** Validate SSE event structure and ordering

**Implementation:**
```typescript
test('Scenario 2: SSE progress tracking validation', async ({ page }) => {
  // Login and navigate (same as Scenario 1)
  // ...

  // Start 10 recipe generation
  await page.selectOption('select[name="recipeCount"]', '10');
  await page.check('input[value="breakfast"]');

  const sseListener = new SSEEventListener(page);

  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin/generate-bmad')),
    page.click('button:has-text("Start BMAD Generation")')
  ]);

  const { batchId } = await response.json();
  await sseListener.listen(batchId);

  // Wait for completion
  const events = await sseListener.waitForStatus('complete');

  // Validate event structure
  expect(events[0]).toMatchObject({
    status: 'started',
    agent: 'BMADCoordinator',
    totalRecipes: 10,
    message: expect.any(String)
  });

  expect(events[events.length - 1]).toMatchObject({
    status: 'complete',
    agent: 'BMADCoordinator',
    currentRecipe: 10,
    totalRecipes: 10
  });

  // Validate all agents appeared
  const agentNames = new Set(events.map(e => e.agent));
  expect(agentNames.has('RecipeConceptAgent')).toBe(true);
  expect(agentNames.has('ProgressMonitorAgent')).toBe(true);
  expect(agentNames.has('NutritionalValidatorAgent')).toBe(true);
  expect(agentNames.has('ImageGenerationAgent')).toBe(true);
  expect(agentNames.has('ImageStorageAgent')).toBe(true);
  expect(agentNames.has('DatabaseOrchestratorAgent')).toBe(true);

  // Validate chronological ordering
  for (let i = 1; i < events.length; i++) {
    const prevTimestamp = new Date(events[i-1].timestamp);
    const currTimestamp = new Date(events[i].timestamp);
    expect(currTimestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
  }

  // Validate currentRecipe increments
  const dbEvents = events.filter(e => e.agent === 'DatabaseOrchestratorAgent');
  for (let i = 0; i < dbEvents.length; i++) {
    expect(dbEvents[i].currentRecipe).toBe(i + 1);
  }
});
```

---

### Task 4: Implement Scenario 3 - Agent Failure Recovery
**Estimated:** 4 hours

**Test Focus:** Error handling and rollback

**Note:** This requires mocking agent failures, which may need backend support

**Implementation:**
```typescript
test('Scenario 3: Agent failure recovery', async ({ page }) => {
  // This test validates error handling
  // May need to skip if we can't mock failures in E2E environment

  test.skip(!process.env.ENABLE_FAILURE_TESTING, 'Failure testing not enabled');

  // Login and navigate
  // ...

  // Configure generation with failure injection
  await page.evaluate(() => {
    (window as any).TEST_INJECT_FAILURE = 'ImageGenerationAgent';
  });

  await page.selectOption('select[name="recipeCount"]', '5');
  const sseListener = new SSEEventListener(page);

  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin/generate-bmad')),
    page.click('button:has-text("Start BMAD Generation")')
  ]);

  const { batchId } = await response.json();
  await sseListener.listen(batchId);

  // Wait for error status
  const events = await sseListener.waitForStatus('error', 30000);

  // Validate error event
  const errorEvent = events.find(e => e.status === 'error');
  expect(errorEvent).toBeDefined();
  expect(errorEvent.agent).toBe('ImageGenerationAgent');
  expect(errorEvent.error).toBeDefined();

  // Verify UI shows error
  await expect(page.locator('text=Generation failed')).toBeVisible();

  // Verify no partial recipes saved
  const recipes = await getRecentRecipes(5);
  expect(recipes.length).toBe(0); // Rollback should delete all
});
```

---

### Task 5: Implement Scenario 4 - Concurrent Generation Jobs
**Estimated:** 3 hours

**Test Focus:** Multiple simultaneous generations

**Implementation:**
```typescript
test('Scenario 4: Concurrent generation jobs', async ({ browser }) => {
  // Create two browser contexts (two admins)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Login both admins
  await Promise.all([
    loginAsAdmin(page1),
    loginAsAdmin(page2)
  ]);

  // Navigate both to BMAD Generator
  await Promise.all([
    page1.goto('http://localhost:4000/admin'),
    page2.goto('http://localhost:4000/admin')
  ]);

  await Promise.all([
    page1.click('text=BMAD Generator'),
    page2.click('text=BMAD Generator')
  ]);

  // Configure different meal types
  await page1.selectOption('select[name="recipeCount"]', '10');
  await page1.check('input[value="breakfast"]');

  await page2.selectOption('select[name="recipeCount"]', '10');
  await page2.check('input[value="lunch"]');

  // Start both generations simultaneously
  const [response1, response2] = await Promise.all([
    page1.waitForResponse(res => res.url().includes('/api/admin/generate-bmad')),
    page2.waitForResponse(res => res.url().includes('/api/admin/generate-bmad')),
    page1.click('button:has-text("Start BMAD Generation")'),
    page2.click('button:has-text("Start BMAD Generation")')
  ]);

  const { batchId: batch1 } = await response1.json();
  const { batchId: batch2 } = await response2.json();

  expect(batch1).not.toBe(batch2); // Different batches

  // Setup SSE listeners
  const listener1 = new SSEEventListener(page1);
  const listener2 = new SSEEventListener(page2);

  await Promise.all([
    listener1.listen(batch1),
    listener2.listen(batch2)
  ]);

  // Wait for both to complete
  const [events1, events2] = await Promise.all([
    listener1.waitForStatus('complete'),
    listener2.waitForStatus('complete')
  ]);

  // Verify both completed successfully
  expect(events1.some(e => e.status === 'complete')).toBe(true);
  expect(events2.some(e => e.status === 'complete')).toBe(true);

  // Verify correct recipe counts
  const breakfastRecipes = await db.select().from(recipes)
    .where(eq(recipes.mealType, 'breakfast'))
    .orderBy(desc(recipes.createdAt))
    .limit(10);

  const lunchRecipes = await db.select().from(recipes)
    .where(eq(recipes.mealType, 'lunch'))
    .orderBy(desc(recipes.createdAt))
    .limit(10);

  expect(breakfastRecipes.length).toBe(10);
  expect(lunchRecipes.length).toBe(10);

  // Cleanup
  await context1.close();
  await context2.close();
});
```

---

### Task 6: Implement Scenario 5 - Generation Cancellation
**Estimated:** 2 hours

**Test Focus:** User cancels mid-generation

**Implementation:**
```typescript
test('Scenario 5: Generation cancellation', async ({ page }) => {
  // Login and navigate
  // ...

  await page.selectOption('select[name="recipeCount"]', '30');
  await page.check('input[value="breakfast"]');

  const sseListener = new SSEEventListener(page);

  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin/generate-bmad')),
    page.click('button:has-text("Start BMAD Generation")')
  ]);

  const { batchId } = await response.json();
  await sseListener.listen(batchId);

  // Wait for 5 recipes to complete
  await page.waitForTimeout(25000); // ~5s per recipe

  // Click cancel button
  await page.click('button:has-text("Cancel Generation")');

  // Verify SSE connection closed
  const events = await sseListener.getEvents();
  const lastEvent = events[events.length - 1];
  expect(['cancelled', 'complete'].includes(lastEvent.status)).toBe(true);

  // Verify only partial recipes saved
  const recipes = await getRecentRecipes(30);
  expect(recipes.length).toBeLessThan(30);
  expect(recipes.length).toBeGreaterThan(0); // At least some completed

  // Verify UI shows cancellation
  await expect(page.locator('text=Generation cancelled')).toBeVisible();
});
```

---

## Acceptance Criteria Checklist

### Functional
- [ ] Scenario 1: 30 recipe generation works
- [ ] Scenario 2: SSE events validated
- [ ] Scenario 3: Error handling works (if testable)
- [ ] Scenario 4: Concurrent jobs work
- [ ] Scenario 5: Cancellation works
- [ ] All tests pass on Chromium
- [ ] Database integrity maintained
- [ ] S3 images validated

### Non-Functional
- [ ] 30 recipes in < 3 minutes
- [ ] SSE latency < 500ms
- [ ] 0 browser console errors
- [ ] Memory usage reasonable
- [ ] Tests run reliably (no flakiness)

---

## Definition of Done

1. ✅ Test file created: `test/e2e/bmad-complete-generation.spec.ts`
2. ✅ All 5 scenarios implemented
3. ✅ All tests passing (100% pass rate)
4. ✅ SSE event validation complete
5. ✅ Database queries verified
6. ✅ S3 image checks verified
7. ✅ Performance targets met
8. ✅ Documentation updated
9. ✅ QA review approved

---

## Testing the Tests

```bash
# Run BMAD E2E tests
npx playwright test test/e2e/bmad-complete-generation.spec.ts

# Run with UI mode
npx playwright test test/e2e/bmad-complete-generation.spec.ts --ui

# Run specific scenario
npx playwright test test/e2e/bmad-complete-generation.spec.ts -g "Scenario 1"

# Run on all browsers
npx playwright test test/e2e/bmad-complete-generation.spec.ts --project=chromium --project=firefox --project=webkit
```

---

## Dependencies

**Required:**
- Docker development environment running
- Database populated with test admin account
- S3/DigitalOcean Spaces configured
- OpenAI API key configured
- Playwright installed

**Blocked By:** None (ready to start)

---

## Risk Mitigation

**If tests fail:**
1. Check Docker services running
2. Verify environment variables
3. Check OpenAI API rate limits
4. Verify S3 credentials
5. Check database connectivity

**Rollback Plan:**
- Tests are new (no existing tests modified)
- Can disable if blocking other work
- Test environment isolated

---

**Story Status:** ✅ Ready for Development
**Next Step:** Assign to developer for implementation (BMAD Dev agent)

**Created By:** BMAD SM Agent
**Date:** October 21, 2025
