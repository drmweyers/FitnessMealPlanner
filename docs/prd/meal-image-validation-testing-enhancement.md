# Product Requirements Document
## Meal Image Generation Validation & Awesome Testing Protocol Enhancement

**Project:** FitnessMealPlanner (Brownfield)
**Type:** Quality Assurance & Validation Enhancement
**Priority:** HIGH
**Status:** DRAFT
**Created:** October 13, 2025
**BMAD Workflow:** Brownfield PRD-First Approach

---

## 🎯 Executive Summary

### Problem Statement

The FitnessMealPlanner application has two critical quality assurance needs:

1. **Meal Image Generation Validation Gap**: When users generate meal plans and save them to the database, there is no comprehensive validation that recipe images are:
   - Successfully generated via DALL-E 3
   - Properly uploaded to S3/DigitalOcean Spaces
   - Correctly linked to database records
   - Unique and not duplicates
   - Accessible in production

2. **Awesome Testing Protocol Coverage Gaps**: The current protocol covers 30 tests across 5 suites but lacks:
   - Image generation validation tests
   - Meal plan database persistence tests
   - E2E recipe image display verification
   - Performance tests for image generation workflows
   - Edge case scenario coverage

### Business Impact

**Current Risks:**
- ❌ Users may generate meal plans with missing recipe images
- ❌ S3 upload failures may go undetected until production
- ❌ Database records may have broken image URLs
- ❌ BMAD Multi-Agent Recipe Generator success may not translate to meal plan generation
- ❌ Testing protocol may not catch image-related regressions

**Desired Outcomes:**
- ✅ 100% confidence that meal plan images are validated before database save
- ✅ Comprehensive test coverage for image generation workflows
- ✅ Automated detection of S3 upload failures
- ✅ Enhanced Awesome Testing Protocol that covers all critical image paths
- ✅ Experimental test suite to discover additional gaps

---

## 📊 Current State Analysis

### Existing Architecture

#### 1. Image Generation Systems (Multiple Pathways)

**Path A: BMAD Multi-Agent Recipe Generation (Admin Dashboard)**
- **Status:** ✅ Fully operational (October 2025)
- **Location:** `server/services/agents/ImageGenerationAgent.ts`
- **Components:**
  - 8 production agents (BaseAgent, RecipeConceptAgent, ProgressMonitorAgent, BMADCoordinator, NutritionalValidatorAgent, DatabaseOrchestratorAgent, ImageGenerationAgent, ImageStorageAgent)
  - Real-time SSE progress tracking
  - Admin Dashboard integration (4th tab: BMAD Generator)
  - Comprehensive test suite: 4,312 lines (99.5% coverage)
- **Image Workflow:**
  1. ImageGenerationAgent generates DALL-E 3 images
  2. Validates uniqueness (85% similarity threshold)
  3. ImageStorageAgent uploads to S3
  4. DatabaseOrchestratorAgent saves to `recipes` table
  5. Real-time SSE updates to frontend
- **Test Coverage:** ✅ Excellent (210/211 tests passing)

**Path B: Meal Plan Generator (Trainer & Customer)**
- **Status:** ⚠️ **VALIDATION NEEDED**
- **Location:** `server/services/mealPlanGenerator.ts`
- **Components:**
  - `MealPlanGeneratorService` - Main meal plan creation logic
  - Uses existing approved recipes from database
  - No direct image generation (relies on pre-generated recipe images)
- **Meal Plan Workflow:**
  1. Trainer/Customer creates meal plan via `MealPlanGenerator.tsx`
  2. `POST /api/meal-plan/generate` calls `mealPlanGenerator.generateMealPlan()`
  3. Selects recipes from database with filters
  4. Generates `MealPlan` object with recipe references
  5. Frontend displays meal plan with recipe images
  6. User saves meal plan to library
- **Image Assumption:** Recipes already have images (from BMAD or previous generation)
- **Validation Gap:** ❌ No verification that recipe images exist/are accessible before meal plan save

**Path C: Recipe Generator (Legacy - openai.ts)**
- **Location:** `server/services/openai.ts` - `generateMealImage()` function
- **Status:** 🟡 Legacy system (still used for ad-hoc generation)
- **Validation Gap:** ❌ No comprehensive testing

#### 2. Database Schema

**Affected Tables:**
```sql
-- Recipes table (where images are stored)
recipes {
  id: serial primary key
  name: text
  imageUrl: text            -- ⚠️ Can be null or broken URL
  approved: boolean         -- Only approved recipes used in meal plans
  ...
}

-- Meal plans reference recipes
personalizedMealPlans {
  id: serial primary key
  mealPlanData: jsonb       -- Contains recipe IDs and data
  trainerId: text
  customerId: text
  ...
}

-- Trainer meal plan library
trainerMealPlans {
  id: serial primary key
  trainerId: text
  mealPlanData: jsonb       -- Contains recipe IDs with image URLs
  ...
}
```

**Image URL Patterns:**
- S3 URLs: `https://pti.sfo3.digitaloceanspaces.com/recipes/...`
- Placeholder: `https://images.unsplash.com/...`

#### 3. Current Awesome Testing Protocol

**Test Coverage (30 tests):**
```
✅ Authentication Tests (6 tests)
✅ RBAC Tests (9 tests)
✅ Admin Features (5 tests)
✅ Trainer Features (5 tests)
✅ Customer Features (5 tests)
```

**Image-Related Gaps:**
- ❌ No meal plan image validation tests
- ❌ No recipe image accessibility checks
- ❌ No S3 upload verification
- ❌ No broken image URL detection
- ❌ No performance tests for image-heavy meal plans

---

## 🎯 Objectives & Success Criteria

### Primary Objectives

#### Objective 1: Meal Image Generation Validation
**Goal:** Ensure 100% of meal plans saved to database have valid, accessible recipe images.

**Success Criteria:**
1. ✅ All recipes in meal plan have `imageUrl` that is not null
2. ✅ All image URLs return HTTP 200 status (accessible)
3. ✅ Images load successfully in production environment
4. ✅ Broken image detection and handling implemented
5. ✅ Placeholder images used for missing images with admin notification

**Metrics:**
- Target: 99%+ image availability for saved meal plans
- Max broken images per meal plan: 0 (use placeholder if missing)
- Image load time: < 2 seconds per image

#### Objective 2: Awesome Testing Protocol Enhancement
**Goal:** Expand test coverage to include all image-related workflows and discover additional gaps through experimentation.

**Success Criteria:**
1. ✅ Add 10-15 new tests for image validation workflows
2. ✅ Achieve 100% coverage of image generation paths
3. ✅ Create experimental test suite to discover edge cases
4. ✅ Document all discovered gaps with reproduction steps
5. ✅ Maintain 100% pass rate on enhanced protocol

**Target Test Count:**
- Current: 30 tests
- Enhanced: 45+ tests
- Experimental: 20+ additional tests

---

## 🔍 Requirements

### Functional Requirements

#### FR1: Pre-Save Image Validation
**Priority:** P0 (Critical)

**Description:**
Before saving any meal plan to the database (`personalizedMealPlans` or `trainerMealPlans`), validate that all recipe images are valid and accessible.

**Implementation:**
```typescript
// server/services/mealPlanImageValidator.ts (NEW)
interface ImageValidationResult {
  recipeId: number;
  recipeName: string;
  imageUrl: string | null;
  isValid: boolean;
  httpStatus?: number;
  error?: string;
  usedPlaceholder: boolean;
}

interface MealPlanImageValidation {
  allValid: boolean;
  totalRecipes: number;
  validImages: number;
  missingImages: number;
  brokenImages: number;
  placeholderCount: number;
  results: ImageValidationResult[];
  validationTimestamp: string;
}

// Validate all images before meal plan save
async validateMealPlanImages(mealPlan: MealPlan): Promise<MealPlanImageValidation>
```

**Validation Steps:**
1. Extract all unique recipe IDs from meal plan
2. Query database for recipe records
3. Check `imageUrl` field for each recipe
4. Perform HTTP HEAD request to verify image accessibility
5. If image missing/broken, use placeholder and log warning
6. Return comprehensive validation report

**Error Handling:**
- Missing images: Use placeholder, log to admin dashboard
- Broken URLs: Use placeholder, log to admin dashboard
- S3 unavailable: Use placeholder, retry later
- Multiple failures: Allow save but mark for review

#### FR2: Real-Time Image Validation During Generation
**Priority:** P1 (High)

**Description:**
Add real-time image validation feedback during meal plan generation in the UI.

**Frontend Integration:**
```typescript
// client/src/components/MealPlanGenerator.tsx (MODIFY)
- Add image validation status indicator
- Show warning badge for recipes with missing images
- Display placeholder images with distinct styling
- Provide "Regenerate Missing Images" button
```

**User Experience:**
- ✅ User sees image validation status before save
- ✅ Clear indication of placeholder images
- ✅ Option to regenerate missing images
- ✅ Save allowed even with placeholders (degraded mode)

#### FR3: Automated Image Healing Service
**Priority:** P2 (Medium)

**Description:**
Background service that periodically checks meal plans for missing/broken images and regenerates them.

**Implementation:**
```typescript
// server/services/imageHealingService.ts (NEW)
- Cron job: Run daily at 2 AM
- Check all meal plans created in last 30 days
- Identify recipes with placeholder or broken images
- Regenerate images using BMAD ImageGenerationAgent
- Update database with new image URLs
- Send admin report
```

#### FR4: Enhanced Awesome Testing Protocol
**Priority:** P0 (Critical)

**Description:**
Expand Awesome Testing Protocol with comprehensive image validation tests.

**New Test Suites:**

**Suite 6: Image Generation & Validation (10 tests)**
```typescript
// test/e2e/awesome-testing-protocol.spec.ts (MODIFY)

test.describe('🖼️ Image Generation & Validation Suite', () => {
  test('All recipes in meal plan have valid images')
  test('Recipe images load successfully on meal plan page')
  test('Placeholder images are used for missing images')
  test('Broken image URLs are detected and handled')
  test('S3 image URLs are accessible')
  test('Image validation occurs before meal plan save')
  test('Admin receives notification for missing images')
  test('Image regeneration succeeds for broken images')
  test('Meal plan with all placeholders can be saved')
  test('Image validation performance is under 5 seconds')
});
```

**Suite 7: Experimental Gap Discovery (Variable tests)**
```typescript
// test/e2e/experimental-gap-discovery.spec.ts (NEW)

test.describe('🔬 Experimental Gap Discovery', () => {
  test('Edge Case 1: Meal plan with 100 recipes')
  test('Edge Case 2: All recipes have broken images')
  test('Edge Case 3: S3 bucket unavailable during generation')
  test('Edge Case 4: Concurrent meal plan generations')
  test('Edge Case 5: Image regeneration during active meal plan')
  test('Edge Case 6: Large image files (>5MB)')
  test('Edge Case 7: Invalid image URLs in database')
  test('Edge Case 8: Network timeout during image check')
  test('Edge Case 9: Recipe without approved status but has image')
  test('Edge Case 10: Meal plan save race condition')
  // ... Add tests as gaps are discovered
});
```

#### FR5: Manual Meal Plan Creation with Category-Based Images
**Priority:** P0 (Critical - URGENT)

**Description:**
Enable trainers to manually create meal plans using free-text entry (no AI generation) with pre-generated category-based images, eliminating OpenAI API costs for custom meal plans.

**Key Features:**
- **Manual Entry Mode:** Trainers can type meal plans directly in an open textbox
- **Category-Based Images:** System assigns random pre-generated images based on meal category
- **No API Costs:** Zero OpenAI API usage for manual meal plans
- **Image Categories:** breakfast, lunch, dinner, snack
- **Random Selection:** Each meal gets a random image from its category pool

**Implementation:**
```typescript
// server/services/manualMealPlanService.ts (NEW)
interface ManualMealEntry {
  mealName: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
  ingredients?: string[];
  instructions?: string;
}

interface CategoryImagePool {
  breakfast: string[];  // URLs to pre-generated breakfast images
  lunch: string[];      // URLs to pre-generated lunch images
  dinner: string[];     // URLs to pre-generated dinner images
  snack: string[];      // URLs to pre-generated snack images
}

// Service to create manual meal plans
class ManualMealPlanService {
  private imagePool: CategoryImagePool;

  // Get random image for meal category
  getRandomImageForCategory(category: string): string {
    const images = this.imagePool[category];
    return images[Math.floor(Math.random() * images.length)];
  }

  // Create manual meal plan with category-based images
  async createManualMealPlan(
    meals: ManualMealEntry[],
    trainerId: string,
    planName: string
  ): Promise<MealPlan> {
    const mealPlanData = meals.map(meal => ({
      ...meal,
      imageUrl: this.getRandomImageForCategory(meal.category),
      isManual: true,  // Flag to indicate manual creation
      generatedBy: 'trainer-manual'
    }));

    return {
      planName,
      meals: mealPlanData,
      createdBy: trainerId,
      creationMethod: 'manual'
    };
  }
}
```

**Frontend Integration:**
```typescript
// client/src/components/ManualMealPlanCreator.tsx (NEW)
export default function ManualMealPlanCreator() {
  const [meals, setMeals] = useState<ManualMealEntry[]>([]);

  return (
    <div className="manual-meal-plan-creator">
      <h2>Create Custom Meal Plan (Manual Entry)</h2>
      <p>No AI costs - Use pre-generated category images</p>

      {/* Open textbox for meal entry */}
      <Textarea
        placeholder="Enter meal details:\nBreakfast: Oatmeal with berries\nLunch: Grilled chicken salad\nDinner: Salmon with vegetables\nSnack: Greek yogurt"
        rows={10}
        onChange={handleMealEntryParse}
      />

      {/* Category selection for each meal */}
      {meals.map((meal, index) => (
        <div key={index}>
          <Input value={meal.mealName} readOnly />
          <Select onValueChange={(cat) => updateMealCategory(index, cat)}>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </Select>
          {/* Show preview of random category image */}
          <img src={getPreviewImage(meal.category)} alt={meal.category} />
        </div>
      ))}

      <Button onClick={handleSaveManualPlan}>
        Save Manual Meal Plan
      </Button>
    </div>
  );
}
```

**Pre-Generated Image Pool:**
```typescript
// server/config/categoryImages.ts (NEW)
export const CATEGORY_IMAGE_POOL = {
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800', // pancakes
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800', // oatmeal
    'https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800', // eggs
    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800', // toast
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800', // fruit bowl
    // ... 10-20 breakfast images
  ],
  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', // salad
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800', // sandwich
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', // soup
    'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800', // bowl
    // ... 10-20 lunch images
  ],
  dinner: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800', // steak
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800', // pasta
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', // fish
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // burger
    // ... 10-20 dinner images
  ],
  snack: [
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', // nuts
    'https://images.unsplash.com/photo-1571212515416-fca2f8cfe8c5?w=800', // yogurt
    'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800', // fruit
    'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800', // protein bar
    // ... 10-20 snack images
  ]
};
```

**User Flow:**
1. Trainer navigates to "Create Custom Meal Plan" (new tab/section)
2. Enters meal details in open textbox (free-form)
3. System parses entries and auto-detects categories (or trainer manually assigns)
4. For each meal, system randomly selects image from category pool
5. Trainer previews meal plan with assigned images
6. Trainer saves and assigns to customer
7. Zero OpenAI API costs incurred

**Benefits:**
- ✅ **Zero AI Costs:** No OpenAI API usage
- ✅ **Fast Creation:** Instant meal plan generation
- ✅ **Full Control:** Trainers create exactly what they want
- ✅ **Professional Images:** Curated Unsplash images for each category
- ✅ **Scalable:** Can expand image pools easily
- ✅ **Offline Capable:** Works without internet for image generation

**Integration with Existing Validation:**
- Manual meal plans still go through image validation (validate Unsplash URLs)
- Category images are pre-validated in configuration
- Image healing service skips manual meal plans (already have valid images)

#### FR6: Image Validation Metrics & Monitoring
**Priority:** P2 (Medium)

**Description:**
Add monitoring dashboard for image validation metrics.

**Admin Dashboard Integration:**
```typescript
// New section in Admin Dashboard
- Total meal plans with image issues
- Placeholder image usage rate
- Failed image validations (last 7 days)
- Average image validation time
- Top 10 recipes with broken images
- S3 availability status
- Manual meal plans created (last 7 days)
- Category image pool health
```

### Non-Functional Requirements

#### NFR1: Performance
- Image validation must complete in < 5 seconds per meal plan
- Validation should not block meal plan save (allow degraded mode)
- Image healing service should process 100 meal plans per minute
- No more than 10 concurrent HTTP requests for image checks

#### NFR2: Reliability
- Image validation should succeed 99.9% of the time
- Fallback to placeholder images should be seamless
- No data loss if image validation fails
- Retry logic for transient S3 failures (3 retries with exponential backoff)

#### NFR3: Maintainability
- All image validation logic centralized in one service
- Comprehensive logging for debugging
- Clear error messages for operators
- Extensible for future image validation rules

#### NFR4: Security
- No sensitive data in image URLs
- S3 bucket permissions properly configured
- Image validation does not expose internal system details
- Rate limiting for image validation API

---

## 🏗️ Architecture & Technical Design

### System Components

#### 1. MealPlanImageValidationService (NEW)
**Location:** `server/services/mealPlanImageValidationService.ts`

**Responsibilities:**
- Validate all recipe images in a meal plan
- Check image URL accessibility (HTTP HEAD)
- Detect broken/missing images
- Apply placeholder images when needed
- Generate validation reports
- Notify admins of issues

**Dependencies:**
- `server/storage.ts` - Database queries
- `server/services/agents/ImageGenerationAgent.ts` - Image regeneration
- `server/services/openai.ts` - Legacy image generation
- `axios` - HTTP requests for image validation

**API:**
```typescript
class MealPlanImageValidationService {
  async validateMealPlan(mealPlan: MealPlan): Promise<MealPlanImageValidation>
  async validateRecipeImage(recipeId: number): Promise<ImageValidationResult>
  async regenerateMissingImages(recipeIds: number[]): Promise<void>
  async generateValidationReport(mealPlanId: string): Promise<ValidationReport>
}
```

#### 2. ImageHealingService (NEW)
**Location:** `server/services/imageHealingService.ts`

**Responsibilities:**
- Background job for fixing broken images
- Cron schedule: Daily at 2 AM
- Scan meal plans for image issues
- Regenerate broken images
- Send daily health reports

**Cron Configuration:**
```typescript
import cron from 'node-cron';

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  await imageHealingService.healAllMealPlans();
});
```

#### 3. Enhanced Awesome Testing Protocol
**Location:** `test/e2e/awesome-testing-protocol.spec.ts`

**Changes:**
- Add Suite 6: Image Generation & Validation (10 tests)
- Modify existing suites to include image checks
- Add helper functions for image validation
- Update test credentials to include meal plans with images

#### 4. Experimental Gap Discovery Suite (NEW)
**Location:** `test/e2e/experimental-gap-discovery.spec.ts`

**Purpose:**
- Discover edge cases through experimentation
- Stress test image validation workflows
- Find performance bottlenecks
- Identify race conditions
- Document all findings

**Experimental Approach:**
```typescript
// Run experiments with various scenarios
const experiments = [
  { name: 'Large meal plan', recipeCount: 100 },
  { name: 'All broken images', brokenImageRate: 1.0 },
  { name: 'S3 outage simulation', s3Available: false },
  { name: 'Concurrent generations', concurrency: 10 },
  // ... more experiments
];

for (const experiment of experiments) {
  test(`Experiment: ${experiment.name}`, async () => {
    // Run experiment
    // Record results
    // Identify gaps
  });
}
```

### Integration Points

#### 1. Meal Plan Generator
**File:** `server/services/mealPlanGenerator.ts`

**Integration:**
```typescript
// BEFORE (current implementation)
async generateMealPlan(params: MealPlanGeneration): Promise<MealPlan> {
  // ... generate meal plan
  return mealPlan;
}

// AFTER (with validation)
async generateMealPlan(params: MealPlanGeneration): Promise<MealPlan> {
  const mealPlan = // ... generate meal plan

  // Validate images before returning
  const validation = await mealPlanImageValidator.validateMealPlan(mealPlan);

  // Attach validation metadata
  mealPlan.imageValidation = validation;

  // Log warnings if issues found
  if (!validation.allValid) {
    console.warn(`Meal plan has ${validation.missingImages} missing images`);
  }

  return mealPlan;
}
```

#### 2. Meal Plan Save Endpoint
**File:** `server/routes/trainerRoutes.ts` (line 476)

**Integration:**
```typescript
// POST /api/trainer/meal-plans
trainerRouter.post('/meal-plans', requireAuth, requireRole('trainer'), async (req, res) => {
  const { mealPlanData, notes, tags, isTemplate } = req.body;

  // NEW: Validate images before save
  const validation = await mealPlanImageValidator.validateMealPlan(mealPlanData);

  // Save meal plan (allow save even with placeholders)
  const savedPlan = await storage.createTrainerMealPlan({
    trainerId,
    mealPlanData,
    notes,
    tags,
    isTemplate,
    imageValidation: validation, // Store validation metadata
  });

  // Return validation status to frontend
  res.status(201).json({
    mealPlan: savedPlan,
    imageValidation: validation,
    message: validation.allValid
      ? 'Meal plan saved successfully'
      : 'Meal plan saved with some placeholder images'
  });
});
```

#### 3. Frontend - MealPlanGenerator Component
**File:** `client/src/components/MealPlanGenerator.tsx`

**Integration:**
```tsx
// Display image validation status
{generatedPlan?.imageValidation && (
  <ImageValidationStatus
    validation={generatedPlan.imageValidation}
    onRegenerateImages={handleRegenerateImages}
  />
)}

// New component
function ImageValidationStatus({ validation, onRegenerateImages }) {
  const { allValid, missingImages, brokenImages } = validation;

  if (allValid) {
    return <Badge variant="success">✅ All images valid</Badge>;
  }

  return (
    <div className="image-validation-warning">
      <Badge variant="warning">
        ⚠️ {missingImages} images missing, {brokenImages} broken
      </Badge>
      <Button onClick={onRegenerateImages}>
        Regenerate Missing Images
      </Button>
    </div>
  );
}
```

---

## 📋 User Stories & Acceptance Criteria

### Epic 1: Meal Image Validation System

#### Story 1.0: Manual Meal Plan Creation with Category Images (URGENT)
**As a** trainer
**I want** to create custom meal plans manually without using AI
**So that** I can save API costs and have full control over meal plan content

**Acceptance Criteria:**
- [ ] Trainer dashboard has "Create Custom Meal Plan" tab/section
- [ ] Open textbox accepts free-form meal entry
- [ ] System auto-detects meal categories (breakfast/lunch/dinner/snack) or allows manual selection
- [ ] Each meal is assigned a random image from its category pool
- [ ] Image pool contains 10-20 high-quality images per category
- [ ] Manual meal plans can be saved to trainer's library
- [ ] Manual meal plans can be assigned to customers
- [ ] Zero OpenAI API calls for manual meal plans
- [ ] Preview shows selected images before save
- [ ] Validation confirms all category images are accessible

**Test Cases:**
```typescript
test('trainer can create manual meal plan in textbox')
test('system auto-detects meal categories correctly')
test('random category image assigned to each meal')
test('all category images are accessible (Unsplash)')
test('manual meal plan saves without OpenAI API calls')
test('manual meal plan can be assigned to customer')
test('category image pool has 10+ images per category')
test('preview shows correct category images')
test('validation passes for pre-generated images')
```

#### Story 1.1: Pre-Save Image Validation
**As a** trainer generating a meal plan
**I want** the system to validate all recipe images before saving
**So that** I can be confident all meal plans have accessible images

**Acceptance Criteria:**
- [ ] System checks all recipe images before meal plan save
- [ ] HTTP HEAD request verifies image URL accessibility
- [ ] Missing images are replaced with placeholders automatically
- [ ] Validation completes in < 5 seconds for 20-recipe meal plan
- [ ] Validation report is logged to admin dashboard
- [ ] User sees validation status in UI before save

**Test Cases:**
```typescript
test('validates all images before meal plan save')
test('replaces missing images with placeholders')
test('logs validation warnings to admin dashboard')
test('allows save even with placeholder images')
test('completes validation in under 5 seconds')
```

#### Story 1.2: Real-Time Image Validation Feedback
**As a** trainer viewing a generated meal plan
**I want** to see which recipes have missing/broken images
**So that** I can decide whether to regenerate or proceed with placeholders

**Acceptance Criteria:**
- [ ] UI shows badge indicating image validation status
- [ ] Recipes with missing images have visual indicator
- [ ] Placeholder images have distinct styling (gray border)
- [ ] "Regenerate Missing Images" button available
- [ ] Regeneration progress shown in real-time
- [ ] UI updates when images are fixed

#### Story 1.3: Automated Image Healing Service
**As an** admin
**I want** a background service to fix broken images automatically
**So that** meal plans maintain high image quality over time

**Acceptance Criteria:**
- [ ] Cron job runs daily at 2 AM
- [ ] Scans meal plans created in last 30 days
- [ ] Identifies recipes with placeholder/broken images
- [ ] Regenerates images using BMAD ImageGenerationAgent
- [ ] Updates database with new image URLs
- [ ] Sends daily health report to admin email
- [ ] Processes 100+ meal plans per run

### Epic 2: Awesome Testing Protocol Enhancement

#### Story 2.1: Add Image Validation Test Suite
**As a** developer
**I want** comprehensive tests for image validation workflows
**So that** we catch image-related bugs before production

**Acceptance Criteria:**
- [ ] 10 new tests for image generation & validation
- [ ] Tests cover all image validation paths
- [ ] Tests verify S3 accessibility
- [ ] Tests check placeholder image handling
- [ ] Tests validate performance (< 5 seconds)
- [ ] All tests pass 100% consistently

#### Story 2.2: Create Experimental Gap Discovery Suite
**As a** QA engineer
**I want** an experimental test suite that tries edge cases
**So that** we can discover gaps in the Awesome Testing Protocol

**Acceptance Criteria:**
- [ ] 20+ experimental test scenarios defined
- [ ] Tests cover edge cases (large meal plans, all broken images, etc.)
- [ ] Each test documents discovered gaps
- [ ] Failed experiments tracked in issue tracker
- [ ] Experiments run weekly in CI/CD
- [ ] Results logged to centralized dashboard

#### Story 2.3: Update Awesome Testing Protocol Documentation
**As a** team member
**I want** updated documentation for the enhanced testing protocol
**So that** I know how to run and interpret new tests

**Acceptance Criteria:**
- [ ] README updated with new test suites
- [ ] Quick reference commands added
- [ ] Success criteria documented
- [ ] Troubleshooting guide updated
- [ ] Integration with CI/CD documented
- [ ] Experimental results interpretation guide created

---

## 🧪 Testing Strategy

### Unit Tests

**Location:** `test/unit/services/`

**New Files:**
- `mealPlanImageValidationService.test.ts` (100+ tests)
- `imageHealingService.test.ts` (50+ tests)

**Coverage:**
```typescript
// Image validation logic
test('validates image URL format')
test('detects missing images')
test('detects broken images (404)')
test('handles S3 timeout gracefully')
test('applies placeholder images correctly')
test('generates validation report')

// Performance tests
test('validates 20 images in under 5 seconds')
test('handles 100 concurrent validations')
test('rate limits HTTP requests properly')
```

### Integration Tests

**Location:** `test/integration/`

**New Files:**
- `mealPlanImageValidation.integration.test.ts`
- `imageHealingWorkflow.integration.test.ts`

**Coverage:**
```typescript
// End-to-end workflows
test('meal plan generation includes image validation')
test('meal plan save stores validation metadata')
test('broken images trigger admin notification')
test('image healing service regenerates missing images')
test('validation works with BMAD agent integration')
```

### E2E Tests

**Location:** `test/e2e/awesome-testing-protocol.spec.ts`

**Enhanced Suites:**
```typescript
// Suite 6: Image Generation & Validation (10 tests)
test('All recipes in meal plan have valid images')
test('Recipe images load on meal plan page')
test('Placeholder images used for missing images')
test('Broken image URLs detected and handled')
test('S3 image URLs accessible')
test('Image validation before save')
test('Admin notification for missing images')
test('Image regeneration succeeds')
test('Meal plan with placeholders can be saved')
test('Image validation performance under 5 seconds')
```

### Experimental Tests

**Location:** `test/e2e/experimental-gap-discovery.spec.ts`

**Scenarios:**
```typescript
test('Large meal plan (100 recipes)')
test('All broken images scenario')
test('S3 outage simulation')
test('Concurrent meal plan generations (10)')
test('Image regeneration during active editing')
test('Large image files (>5MB)')
test('Invalid image URLs in database')
test('Network timeout during validation')
test('Recipe without approved status')
test('Meal plan save race condition')
```

---

## 📈 Success Metrics

### Key Performance Indicators (KPIs)

#### Primary KPIs
1. **Image Availability Rate**
   - Target: 99.5%+
   - Measurement: (Valid images / Total images) × 100
   - Frequency: Daily

2. **Awesome Testing Protocol Pass Rate**
   - Target: 100%
   - Measurement: (Passed tests / Total tests) × 100
   - Frequency: Every deployment

3. **Image Validation Performance**
   - Target: < 5 seconds per meal plan (20 recipes)
   - Measurement: P95 validation time
   - Frequency: Weekly

#### Secondary KPIs
4. **Placeholder Image Rate**
   - Target: < 5%
   - Measurement: (Placeholder images / Total images) × 100
   - Frequency: Weekly

5. **Image Healing Success Rate**
   - Target: 95%+
   - Measurement: (Healed images / Broken images) × 100
   - Frequency: Weekly

6. **Test Coverage**
   - Target: 95%+ for image validation code
   - Measurement: Lines covered / Total lines
   - Frequency: Per commit

### Quality Gates

**Before Deployment:**
- [ ] All Awesome Testing Protocol tests pass (100%)
- [ ] Image validation unit tests pass (100%)
- [ ] Integration tests pass (100%)
- [ ] Experimental tests documented (gaps identified)
- [ ] Performance benchmarks met (< 5 seconds)
- [ ] Code coverage > 95% for new code

**Post-Deployment:**
- [ ] Monitor image availability rate for 24 hours
- [ ] Verify no increase in error rates
- [ ] Confirm image healing service running
- [ ] Validate admin dashboard metrics accurate

---

## 🚀 Implementation Plan

### Phase 0: Manual Meal Plan Creation (Week 1 - URGENT)
**Goals:** Enable manual meal plan creation with category-based images

**Tasks:**
- [ ] Create `manualMealPlanService.ts` service
- [ ] Create `categoryImages.ts` configuration with 10-20 images per category
- [ ] Implement random image selection logic
- [ ] Create `ManualMealPlanCreator.tsx` component
- [ ] Add "Create Custom Meal Plan" tab to Trainer Dashboard
- [ ] Implement meal entry parser (textbox → structured meals)
- [ ] Add category auto-detection logic
- [ ] Implement meal preview with category images
- [ ] Add save and assign functionality
- [ ] Write unit tests for manual meal plan service (50+)
- [ ] Write E2E tests for manual meal plan workflow (10+)

**Deliverables:**
- `server/services/manualMealPlanService.ts` (200+ lines)
- `server/config/categoryImages.ts` (100+ lines with 40-80 image URLs)
- `client/src/components/ManualMealPlanCreator.tsx` (400+ lines)
- `test/unit/services/manualMealPlanService.test.ts` (300+ lines)
- `test/e2e/manual-meal-plan-creation.spec.ts` (200+ lines)
- API endpoint: `POST /api/trainer/manual-meal-plan`

**Success Criteria:**
- ✅ Trainers can create meal plans in < 2 minutes
- ✅ Zero OpenAI API usage for manual plans
- ✅ All category images load successfully
- ✅ Manual plans can be assigned to customers
- ✅ 100% test pass rate

### Phase 1: Foundation (Week 2)
**Goals:** Build core image validation service

**Tasks:**
- [ ] Create `MealPlanImageValidationService` class
- [ ] Implement `validateMealPlan()` method (supports both AI and manual plans)
- [ ] Implement `validateRecipeImage()` method
- [ ] Implement `validateCategoryImage()` method (for manual plans)
- [ ] Add HTTP HEAD request for image checking
- [ ] Implement placeholder image logic
- [ ] Write comprehensive unit tests (100+)
- [ ] Performance benchmarking

**Deliverables:**
- `server/services/mealPlanImageValidationService.ts` (300+ lines)
- `test/unit/services/mealPlanImageValidationService.test.ts` (500+ lines)
- Performance report

### Phase 2: Integration (Week 2)
**Goals:** Integrate validation into meal plan workflows

**Tasks:**
- [ ] Modify `mealPlanGenerator.ts` to include validation
- [ ] Update meal plan save endpoints (trainerRoutes.ts)
- [ ] Add validation metadata to database schema
- [ ] Implement frontend validation status display
- [ ] Add "Regenerate Missing Images" button
- [ ] Write integration tests
- [ ] E2E testing

**Deliverables:**
- Updated `mealPlanGenerator.ts`
- Updated `trainerRoutes.ts`
- Updated `MealPlanGenerator.tsx`
- Integration test suite (20+ tests)

### Phase 3: Healing Service (Week 3)
**Goals:** Implement automated image healing

**Tasks:**
- [ ] Create `ImageHealingService` class
- [ ] Implement cron job scheduler
- [ ] Implement image regeneration logic
- [ ] Add admin email notifications
- [ ] Create healing metrics dashboard
- [ ] Write healing service tests
- [ ] Deploy to staging for validation

**Deliverables:**
- `server/services/imageHealingService.ts` (200+ lines)
- Cron configuration
- Admin dashboard section
- Test suite (50+ tests)

### Phase 4: Testing Enhancement (Week 4)
**Goals:** Enhance Awesome Testing Protocol

**Tasks:**
- [ ] Add Suite 6: Image Generation & Validation (10 tests)
- [ ] Create experimental gap discovery suite (20+ tests)
- [ ] Run experiments and document gaps
- [ ] Update Awesome Testing Protocol README
- [ ] Create troubleshooting guide
- [ ] Add CI/CD integration for new tests
- [ ] Validate 100% pass rate

**Deliverables:**
- Updated `test/e2e/awesome-testing-protocol.spec.ts`
- New `test/e2e/experimental-gap-discovery.spec.ts`
- Updated `test/AWESOME_TESTING_PROTOCOL.md`
- Gap discovery report

---

## 🎯 Risks & Mitigation

### Technical Risks

#### Risk 1: Image Validation Performance
**Impact:** HIGH
**Probability:** MEDIUM
**Description:** Validating images with HTTP requests may be too slow for large meal plans

**Mitigation:**
- Implement concurrent image validation (10 parallel requests)
- Cache validation results for 1 hour
- Use HTTP HEAD instead of GET (faster)
- Add timeout (2 seconds per image)
- Fallback to placeholder if timeout

#### Risk 2: S3 Availability
**Impact:** HIGH
**Probability:** LOW
**Description:** S3/DigitalOcean Spaces may be unavailable during validation

**Mitigation:**
- Implement retry logic (3 retries with exponential backoff)
- Use placeholder images during S3 outage
- Queue failed validations for later retry
- Monitor S3 uptime and alert admins
- Allow meal plan save even during S3 outage

#### Risk 3: BMAD Agent Integration Complexity
**Impact:** MEDIUM
**Probability:** LOW
**Description:** Integrating with BMAD ImageGenerationAgent for healing may be complex

**Mitigation:**
- BMAD agents already well-tested (99.5% coverage)
- Use existing `ImageGenerationAgent` API
- Implement adapter pattern for loose coupling
- Fall back to legacy `generateMealImage()` if BMAD unavailable

#### Risk 4: Test Flakiness
**Impact:** MEDIUM
**Probability:** MEDIUM
**Description:** Image validation tests may be flaky due to network issues

**Mitigation:**
- Use test fixtures with known image URLs
- Mock HTTP requests in unit tests
- Use local test images for E2E tests
- Implement retry logic in E2E tests (3 retries)
- Document flaky tests and investigate

### Business Risks

#### Risk 5: User Experience Impact
**Impact:** LOW
**Probability:** LOW
**Description:** Validation may slow down meal plan generation

**Mitigation:**
- Run validation asynchronously (non-blocking)
- Show spinner during validation
- Allow save without waiting for validation (degraded mode)
- Provide clear messaging about placeholder images

---

## 📚 Appendix

### A. Affected Files

**New Files:**
```
server/services/mealPlanImageValidationService.ts
server/services/imageHealingService.ts
test/unit/services/mealPlanImageValidationService.test.ts
test/unit/services/imageHealingService.test.ts
test/integration/mealPlanImageValidation.integration.test.ts
test/integration/imageHealingWorkflow.integration.test.ts
test/e2e/experimental-gap-discovery.spec.ts
docs/architecture/image-validation-architecture.md
```

**Modified Files:**
```
server/services/mealPlanGenerator.ts
server/routes/trainerRoutes.ts
client/src/components/MealPlanGenerator.tsx
test/e2e/awesome-testing-protocol.spec.ts
test/AWESOME_TESTING_PROTOCOL.md
shared/schema.ts (add validation metadata types)
```

### B. Database Schema Changes

**Add validation metadata to meal plans:**
```sql
-- Add imageValidation metadata column
ALTER TABLE personalizedMealPlans
ADD COLUMN imageValidation JSONB;

ALTER TABLE trainerMealPlans
ADD COLUMN imageValidation JSONB;

-- Example validation metadata:
{
  "allValid": false,
  "totalRecipes": 20,
  "validImages": 18,
  "missingImages": 1,
  "brokenImages": 1,
  "placeholderCount": 2,
  "validationTimestamp": "2025-10-13T10:30:00Z",
  "results": [
    {
      "recipeId": 123,
      "recipeName": "Grilled Chicken",
      "imageUrl": "https://pti.sfo3.digitaloceanspaces.com/recipes/123.jpg",
      "isValid": true,
      "httpStatus": 200
    },
    {
      "recipeId": 124,
      "recipeName": "Quinoa Bowl",
      "imageUrl": null,
      "isValid": false,
      "error": "Missing image URL",
      "usedPlaceholder": true
    }
  ]
}
```

### C. Configuration

**Environment Variables:**
```bash
# .env
IMAGE_VALIDATION_ENABLED=true
IMAGE_VALIDATION_TIMEOUT=2000        # milliseconds per image
IMAGE_VALIDATION_CONCURRENCY=10      # parallel requests
IMAGE_HEALING_CRON="0 2 * * *"      # daily at 2 AM
IMAGE_PLACEHOLDER_URL="https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
ADMIN_NOTIFICATION_EMAIL="admin@evofitmeals.com"
```

### D. References

**Related Documentation:**
- BMAD Phase 7 Frontend Integration: `BMAD_PHASE_7_FRONTEND_INTEGRATION_DOCUMENTATION.md`
- BMAD Multi-Agent System: `TODO_URGENT.md` (Phase 8 completion)
- Awesome Testing Protocol: `test/AWESOME_TESTING_PROTOCOL.md`
- Deployment Guide: `DEPLOYMENT_BEST_PRACTICES.md`

**Existing Systems:**
- BMAD ImageGenerationAgent: `server/services/agents/ImageGenerationAgent.ts`
- BMAD ImageStorageAgent: `server/services/agents/ImageStorageAgent.ts`
- Meal Plan Generator: `server/services/mealPlanGenerator.ts`
- Recipe Generator: `server/services/openai.ts`

---

## ✅ Sign-Off

**Product Owner:** _________________
**Tech Lead:** _________________
**QA Lead:** _________________
**Date:** October 13, 2025

---

**Next Steps:**
1. Review PRD with stakeholders
2. Get approval from Product Owner
3. Create architecture document (brownfield focus)
4. QA risk assessment
5. Shard into implementable stories
6. Begin Phase 1 implementation
