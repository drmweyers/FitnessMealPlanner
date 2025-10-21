# Meal Image Validation & Manual Meal Plan Architecture
## Brownfield Enhancement Architecture Document

**Project:** FitnessMealPlanner
**Type:** Brownfield Enhancement
**Created:** October 13, 2025
**PRD Reference:** `docs/prd/meal-image-validation-testing-enhancement.md`
**BMAD Workflow:** Brownfield PRD-First Approach

---

## 🎯 Document Purpose

This architecture document focuses ONLY on the areas relevant to:
1. **Manual Meal Plan Creation** with category-based images (URGENT)
2. **Meal Image Validation** for AI-generated and manual meal plans
3. **Awesome Testing Protocol Enhancement** for image workflows

**Scope:** This is a **brownfield architecture document** - it documents existing systems that will be modified and new systems that will be integrated.

---

## 📊 Current System Architecture (Relevant Areas)

### 1. Meal Plan Generation Pathways

#### Path A: AI-Generated Meal Plans (Existing - Will Be Enhanced)

**Current Implementation:**
```
User (Trainer/Customer)
  → Frontend: MealPlanGenerator.tsx (line 130-150)
  → API: POST /api/meal-plan/generate (mealPlan.ts:37-68)
  → Service: mealPlanGenerator.ts (line 34-50)
  → Database: personalizedMealPlans table
  → Frontend: Display meal plan with recipe images
```

**Key Files:**
- `client/src/components/MealPlanGenerator.tsx` (1800+ lines)
- `server/routes/mealPlan.ts` (line 37-68 - generate endpoint)
- `server/services/mealPlanGenerator.ts` (400+ lines)
- `shared/schema.ts` (MealPlan, MealPlanGeneration types)

**Current Image Handling:**
```typescript
// server/services/mealPlanGenerator.ts
async generateMealPlan(params: MealPlanGeneration): Promise<MealPlan> {
  // 1. Filter recipes based on user preferences
  let { recipes } = await storage.searchRecipes(recipeFilter);

  // 2. Select recipes for meal plan
  // ⚠️ ASSUMES recipes already have imageUrl populated

  // 3. Build meal plan structure
  const meals = /* ... distribute recipes across days ... */;

  // 4. Return meal plan
  return {
    planName,
    days,
    meals,
    // ❌ NO IMAGE VALIDATION HERE
  };
}
```

**Validation Gap:**
- ❌ No check if `recipe.imageUrl` exists
- ❌ No HTTP request to verify image accessibility
- ❌ No placeholder handling for missing images
- ❌ No validation metadata stored

#### Path B: BMAD Multi-Agent Recipe Generation (Existing - Reference Only)

**Status:** ✅ Fully operational (99.5% test coverage)
**Location:** `server/services/agents/`

**Agents:**
1. `ImageGenerationAgent.ts` - DALL-E 3 image generation
2. `ImageStorageAgent.ts` - S3 upload handling
3. `DatabaseOrchestratorAgent.ts` - Transactional saves

**Image Workflow:**
```
Admin clicks "Generate Recipes" (BMAD tab)
  → ImageGenerationAgent generates DALL-E 3 image
  → Validates uniqueness (85% similarity threshold)
  → ImageStorageAgent uploads to S3
  → DatabaseOrchestratorAgent saves to recipes table with imageUrl
  → SSE updates frontend in real-time
```

**Why This Works:**
- ✅ Images generated BEFORE recipe saved to database
- ✅ Uniqueness validation built-in
- ✅ S3 upload verified before database save
- ✅ Comprehensive test coverage (4,312 lines of tests)

**Reference for Our Enhancement:**
- We should follow similar validation pattern for meal plans
- Use same S3 configuration
- Reuse image validation logic where possible

#### Path C: Manual Meal Plan Creation (NEW - Will Be Implemented)

**Proposed Implementation:**
```
Trainer navigates to "Create Custom Meal Plan" tab
  → Frontend: ManualMealPlanCreator.tsx (NEW COMPONENT)
  → Enters meals in open textbox (free-form entry)
  → System parses entries and detects categories
  → For each meal, randomly select image from category pool
  → Preview meal plan with selected images
  → Save to trainer library
  → API: POST /api/trainer/manual-meal-plan (NEW ENDPOINT)
  → Service: manualMealPlanService.ts (NEW SERVICE)
  → Database: trainerMealPlans table
```

**Image Handling (Category-Based):**
```typescript
// server/config/categoryImages.ts (NEW FILE)
export const CATEGORY_IMAGE_POOL = {
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    // ... 10-20 breakfast images
  ],
  lunch: [ /* 10-20 lunch images */ ],
  dinner: [ /* 10-20 dinner images */ ],
  snack: [ /* 10-20 snack images */ ]
};

// server/services/manualMealPlanService.ts (NEW FILE)
class ManualMealPlanService {
  getRandomImageForCategory(category: string): string {
    const images = CATEGORY_IMAGE_POOL[category];
    return images[Math.floor(Math.random() * images.length)];
  }

  async createManualMealPlan(
    meals: ManualMealEntry[],
    trainerId: string
  ): Promise<MealPlan> {
    // Assign random category image to each meal
    const mealPlanData = meals.map(meal => ({
      ...meal,
      imageUrl: this.getRandomImageForCategory(meal.category),
      isManual: true,
      generatedBy: 'trainer-manual'
    }));

    return { /* meal plan with images */ };
  }
}
```

**Benefits:**
- ✅ Zero OpenAI API costs
- ✅ Instant meal plan creation (no AI latency)
- ✅ Full trainer control
- ✅ Pre-validated image URLs (Unsplash CDN)
- ✅ Scalable image pool

---

## 🏗️ Proposed Architecture

### System Components

#### 1. ManualMealPlanService (NEW)

**File:** `server/services/manualMealPlanService.ts`
**Responsibilities:**
- Parse free-form meal entry text
- Detect meal categories (breakfast/lunch/dinner/snack)
- Assign random images from category pool
- Create meal plan structure
- Save to database

**API:**
```typescript
interface ManualMealEntry {
  mealName: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description?: string;
  ingredients?: string[];
  instructions?: string;
}

class ManualMealPlanService {
  // Parse meal entry text → structured meals
  parseMealEntries(text: string): ManualMealEntry[]

  // Auto-detect category from meal name
  detectCategory(mealName: string): string

  // Get random image for category
  getRandomImageForCategory(category: string): string

  // Create manual meal plan
  async createManualMealPlan(
    meals: ManualMealEntry[],
    trainerId: string,
    planName: string
  ): Promise<MealPlan>

  // Validate all category images are accessible
  async validateCategoryImagePool(): Promise<ValidationResult>
}
```

**Integration Points:**
- `server/config/categoryImages.ts` - Image pool configuration
- `server/storage.ts` - Database operations (createTrainerMealPlan)
- `server/routes/trainerRoutes.ts` - API endpoint

#### 2. MealPlanImageValidationService (NEW)

**File:** `server/services/mealPlanImageValidationService.ts`
**Responsibilities:**
- Validate all recipe images in meal plan before save
- Check image URL accessibility (HTTP HEAD)
- Detect missing/broken images
- Apply placeholder images when needed
- Generate validation reports
- Support both AI-generated and manual meal plans

**API:**
```typescript
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
  planType: 'ai-generated' | 'manual';
}

class MealPlanImageValidationService {
  // Validate entire meal plan
  async validateMealPlan(mealPlan: MealPlan): Promise<MealPlanImageValidation>

  // Validate single recipe image
  async validateRecipeImage(recipeId: number): Promise<ImageValidationResult>

  // Validate category image (for manual plans)
  async validateCategoryImage(imageUrl: string): Promise<boolean>

  // Check image URL accessibility
  private async checkImageAccessibility(url: string): Promise<number>

  // Apply placeholder for missing image
  private getPlaceholderImage(category: string): string

  // Generate validation report
  async generateValidationReport(mealPlanId: string): Promise<Report>
}
```

**Integration Points:**
- `server/services/mealPlanGenerator.ts` - Call validation before returning
- `server/routes/trainerRoutes.ts` - Call validation before meal plan save
- `axios` - HTTP HEAD requests for image checking
- `server/config/categoryImages.ts` - Validate category image pool

#### 3. ManualMealPlanCreator Component (NEW)

**File:** `client/src/components/ManualMealPlanCreator.tsx`
**Responsibilities:**
- Provide open textbox for meal entry
- Parse meal entries and display preview
- Allow category selection/override
- Show random category images
- Validate and save manual meal plan
- Integrate with trainer dashboard

**Component Structure:**
```typescript
export default function ManualMealPlanCreator() {
  const [mealText, setMealText] = useState('');
  const [meals, setMeals] = useState<ManualMealEntry[]>([]);
  const [planName, setPlanName] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  // Parse meal entry text
  const handleParseMeals = () => {
    const parsed = parseMealEntries(mealText);
    setMeals(parsed);
    setIsPreview(true);
  };

  // Update meal category
  const updateMealCategory = (index: number, category: string) => {
    setMeals(meals.map((m, i) =>
      i === index ? { ...m, category } : m
    ));
  };

  // Save manual meal plan
  const handleSave = async () => {
    const result = await apiRequest('/api/trainer/manual-meal-plan', {
      method: 'POST',
      body: { planName, meals }
    });
    // Success handling
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Custom Meal Plan</CardTitle>
        <CardDescription>
          Manual entry - No AI costs, instant creation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Meal entry textbox */}
        <Textarea
          placeholder="Enter meal details (one per line)..."
          value={mealText}
          onChange={(e) => setMealText(e.target.value)}
          rows={10}
        />
        <Button onClick={handleParseMeals}>Parse Meals</Button>

        {/* Meal preview with category images */}
        {isPreview && meals.map((meal, index) => (
          <MealPreviewCard
            key={index}
            meal={meal}
            onCategoryChange={(cat) => updateMealCategory(index, cat)}
          />
        ))}

        {/* Save button */}
        <Button onClick={handleSave}>Save Meal Plan</Button>
      </CardContent>
    </Card>
  );
}
```

**Integration Points:**
- `client/src/pages/Trainer.tsx` - Add new tab for Manual Creator
- API: `POST /api/trainer/manual-meal-plan`
- `MealPlanAssignment` component - Assign manual plans to customers

#### 4. ImageHealingService (NEW - Future Phase)

**File:** `server/services/imageHealingService.ts`
**Responsibilities:**
- Background cron job to fix broken images
- Scan meal plans for missing/broken images
- Regenerate images using BMAD agents
- Send daily health reports

**Cron Configuration:**
```typescript
import cron from 'node-cron';

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  const healingService = new ImageHealingService();
  await healingService.healAllMealPlans();
});
```

---

## 🔗 Integration Architecture

### Integration Point 1: Meal Plan Generator Enhancement

**Current Flow:**
```
User → MealPlanGenerator.tsx → POST /api/meal-plan/generate
  → mealPlanGenerator.generateMealPlan() → Return meal plan
```

**Enhanced Flow:**
```
User → MealPlanGenerator.tsx → POST /api/meal-plan/generate
  → mealPlanGenerator.generateMealPlan()
  → ✨ mealPlanImageValidator.validateMealPlan(mealPlan)
  → Attach validation metadata
  → Return meal plan with validation
```

**Code Changes:**
```typescript
// server/services/mealPlanGenerator.ts (MODIFY)
import { mealPlanImageValidator } from './mealPlanImageValidationService';

async generateMealPlan(params: MealPlanGeneration): Promise<MealPlan> {
  // ... existing generation logic ...

  // ✨ NEW: Validate images before returning
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

### Integration Point 2: Meal Plan Save Endpoint Enhancement

**Current Flow:**
```
Trainer → Save meal plan → POST /api/trainer/meal-plans
  → storage.createTrainerMealPlan() → Database save
```

**Enhanced Flow:**
```
Trainer → Save meal plan → POST /api/trainer/meal-plans
  → ✨ mealPlanImageValidator.validateMealPlan(mealPlanData)
  → storage.createTrainerMealPlan() (with validation metadata)
  → Database save with imageValidation column
```

**Code Changes:**
```typescript
// server/routes/trainerRoutes.ts (MODIFY - line 476)
import { mealPlanImageValidator } from '../services/mealPlanImageValidationService';

trainerRouter.post('/meal-plans', requireAuth, requireRole('trainer'), async (req, res) => {
  const { mealPlanData, notes, tags, isTemplate } = req.body;

  // ✨ NEW: Validate images before save
  const validation = await mealPlanImageValidator.validateMealPlan(mealPlanData);

  // Save with validation metadata
  const savedPlan = await storage.createTrainerMealPlan({
    trainerId: req.user!.id,
    mealPlanData,
    notes,
    tags,
    isTemplate,
    imageValidation: validation  // ✨ NEW FIELD
  });

  res.status(201).json({
    mealPlan: savedPlan,
    imageValidation: validation,
    message: validation.allValid
      ? 'Meal plan saved successfully'
      : 'Meal plan saved with some placeholder images'
  });
});
```

### Integration Point 3: Manual Meal Plan API Endpoint (NEW)

**New Flow:**
```
Trainer → ManualMealPlanCreator.tsx → POST /api/trainer/manual-meal-plan
  → manualMealPlanService.createManualMealPlan()
  → ✨ mealPlanImageValidator.validateMealPlan() (validates category images)
  → storage.createTrainerMealPlan()
  → Database save
```

**Code Changes:**
```typescript
// server/routes/trainerRoutes.ts (ADD NEW ENDPOINT)
import { manualMealPlanService } from '../services/manualMealPlanService';
import { mealPlanImageValidator } from '../services/mealPlanImageValidationService';

trainerRouter.post('/manual-meal-plan', requireAuth, requireRole('trainer'), async (req, res) => {
  const { planName, meals } = req.body;
  const trainerId = req.user!.id;

  // Create manual meal plan with category images
  const mealPlan = await manualMealPlanService.createManualMealPlan(
    meals,
    trainerId,
    planName
  );

  // Validate category images (should always pass)
  const validation = await mealPlanImageValidator.validateMealPlan(mealPlan);

  // Save to database
  const savedPlan = await storage.createTrainerMealPlan({
    trainerId,
    mealPlanData: mealPlan,
    imageValidation: validation,
    isManual: true  // Flag for manual creation
  });

  res.status(201).json({
    mealPlan: savedPlan,
    imageValidation: validation,
    message: 'Manual meal plan created successfully'
  });
});
```

### Integration Point 4: Frontend Display Enhancement

**Current Flow:**
```
User views meal plan → MealPlanGenerator.tsx displays meals with images
```

**Enhanced Flow:**
```
User views meal plan → MealPlanGenerator.tsx
  → Check imageValidation metadata
  → Display validation status badge
  → Show placeholder indicators
  → Provide "Regenerate Images" button
```

**Code Changes:**
```typescript
// client/src/components/MealPlanGenerator.tsx (MODIFY)

// Add validation status display
{generatedPlan?.imageValidation && (
  <ImageValidationStatus
    validation={generatedPlan.imageValidation}
    onRegenerateImages={handleRegenerateImages}
  />
)}

// New component
function ImageValidationStatus({ validation, onRegenerateImages }) {
  if (validation.allValid) {
    return <Badge variant="success">✅ All images valid</Badge>;
  }

  return (
    <Alert variant="warning">
      <AlertTitle>Image Validation Warning</AlertTitle>
      <AlertDescription>
        {validation.missingImages} missing, {validation.brokenImages} broken images.
        Using {validation.placeholderCount} placeholders.
      </AlertDescription>
      <Button onClick={onRegenerateImages} size="sm">
        Regenerate Missing Images
      </Button>
    </Alert>
  );
}
```

---

## 📊 Database Schema Changes

### Add Image Validation Metadata

```sql
-- Add imageValidation column to meal plan tables
ALTER TABLE personalizedMealPlans
ADD COLUMN imageValidation JSONB;

ALTER TABLE trainerMealPlans
ADD COLUMN imageValidation JSONB,
ADD COLUMN isManual BOOLEAN DEFAULT false;

-- Example validation metadata structure:
{
  "allValid": false,
  "totalRecipes": 20,
  "validImages": 18,
  "missingImages": 1,
  "brokenImages": 1,
  "placeholderCount": 2,
  "planType": "manual",
  "validationTimestamp": "2025-10-13T10:30:00Z",
  "results": [
    {
      "recipeId": 123,
      "recipeName": "Grilled Chicken",
      "imageUrl": "https://pti.sfo3.digitaloceanspaces.com/recipes/123.jpg",
      "isValid": true,
      "httpStatus": 200
    }
  ]
}

-- Create index for querying meal plans with image issues
CREATE INDEX idx_meal_plans_image_issues
ON trainerMealPlans ((imageValidation->>'allValid'));

CREATE INDEX idx_meal_plans_manual
ON trainerMealPlans (isManual);
```

### Migration File

```typescript
// migrations/0020_add_image_validation_metadata.sql
ALTER TABLE personalizedMealPlans
ADD COLUMN IF NOT EXISTS imageValidation JSONB;

ALTER TABLE trainerMealPlans
ADD COLUMN IF NOT EXISTS imageValidation JSONB,
ADD COLUMN IF NOT EXISTS isManual BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trainer_meal_plans_image_issues
ON trainerMealPlans ((imageValidation->>'allValid'));

CREATE INDEX IF NOT EXISTS idx_trainer_meal_plans_manual
ON trainerMealPlans (isManual);
```

---

## 🧪 Testing Architecture

### Unit Tests

**Location:** `test/unit/services/`

**New Test Files:**
1. `manualMealPlanService.test.ts` (300+ lines, 50+ tests)
2. `mealPlanImageValidationService.test.ts` (500+ lines, 100+ tests)

**Coverage:**
```typescript
// manualMealPlanService.test.ts
describe('ManualMealPlanService', () => {
  describe('parseMealEntries', () => {
    test('parses simple meal entries')
    test('handles multiline entries')
    test('detects meal categories from names')
  });

  describe('getRandomImageForCategory', () => {
    test('returns random image from category pool')
    test('returns different images on multiple calls')
    test('handles invalid category gracefully')
  });

  describe('createManualMealPlan', () => {
    test('creates meal plan with category images')
    test('marks meal plan as manual')
    test('assigns trainer ID correctly')
    test('validates all images before save')
  });
});

// mealPlanImageValidationService.test.ts
describe('MealPlanImageValidationService', () => {
  describe('validateMealPlan', () => {
    test('validates all images in meal plan')
    test('detects missing images')
    test('detects broken images (404)')
    test('applies placeholder for broken images')
    test('handles S3 timeout gracefully')
    test('distinguishes between AI and manual plans')
  });

  describe('checkImageAccessibility', () => {
    test('returns 200 for valid image URL')
    test('returns 404 for missing image')
    test('handles network timeout')
    test('retries on transient failures')
  });
});
```

### Integration Tests

**Location:** `test/integration/`

**New Test Files:**
1. `manualMealPlanWorkflow.integration.test.ts` (200+ lines)
2. `mealPlanImageValidation.integration.test.ts` (300+ lines)

**Coverage:**
```typescript
// manualMealPlanWorkflow.integration.test.ts
test('complete manual meal plan creation workflow')
test('manual meal plan saves to database')
test('manual meal plan can be assigned to customer')
test('category images are accessible')
test('validation metadata stored correctly')

// mealPlanImageValidation.integration.test.ts
test('AI-generated meal plan validation')
test('manual meal plan validation')
test('validation before save workflow')
test('placeholder image handling')
test('validation report generation')
```

### E2E Tests

**Location:** `test/e2e/`

**Enhanced Files:**
1. `awesome-testing-protocol.spec.ts` (ADD Suite 6: Image Validation - 10 tests)
2. `manual-meal-plan-creation.spec.ts` (NEW - 200+ lines, 15+ tests)
3. `experimental-gap-discovery.spec.ts` (NEW - 300+ lines, 20+ tests)

**Coverage:**
```typescript
// Suite 6: Image Generation & Validation (added to awesome protocol)
test('All recipes in meal plan have valid images')
test('Recipe images load successfully on meal plan page')
test('Placeholder images used for missing images')
test('Broken image URLs detected and handled')
test('S3 image URLs accessible')
test('Image validation before meal plan save')
test('Admin notification for missing images')
test('Image regeneration succeeds')
test('Meal plan with placeholders can be saved')
test('Image validation performance under 5 seconds')

// manual-meal-plan-creation.spec.ts
test('Trainer can create manual meal plan')
test('Textbox accepts free-form meal entry')
test('System auto-detects meal categories')
test('Random category image assigned to each meal')
test('All category images load successfully')
test('Manual meal plan saves without API calls')
test('Manual meal plan can be assigned to customer')
test('Category image pool has 10+ images per category')
test('Preview shows correct category images')
test('Validation passes for pre-generated images')
test('Manual and AI meal plans coexist')
test('Performance: Manual creation < 2 seconds')
test('Zero OpenAI API usage tracked')
```

---

## 🔐 Security Considerations

### Image URL Security

**Concern:** Category image URLs are public (Unsplash)
**Mitigation:**
- ✅ Only use trusted CDN (Unsplash, S3)
- ✅ Validate all URLs before adding to pool
- ✅ No user-provided URLs in category pool
- ✅ Regular audit of image pool

### API Security

**Manual Meal Plan Endpoint:**
```typescript
// Rate limiting
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 manual meal plans per 15 minutes per trainer
})

// Authentication & Authorization
requireAuth, requireRole('trainer')

// Input validation
const schema = z.object({
  planName: z.string().min(1).max(100),
  meals: z.array(z.object({
    mealName: z.string().min(1).max(200),
    category: z.enum(['breakfast', 'lunch', 'dinner', 'snack'])
  })).min(1).max(50)
});
```

### S3 Image Access

**Ensure proper permissions:**
```typescript
// S3 bucket policy for category images
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pti/*"
    }
  ]
}
```

---

## 📊 Performance Considerations

### Image Validation Performance

**Target:** < 5 seconds for 20-recipe meal plan

**Optimization Strategies:**
```typescript
// Concurrent validation (10 parallel requests)
const validationPromises = recipes.map(recipe =>
  this.validateRecipeImage(recipe.id)
);
const results = await Promise.all(validationPromises);

// HTTP HEAD instead of GET (faster)
axios.head(imageUrl, { timeout: 2000 });

// Caching (1-hour TTL)
const cacheKey = `image-validation:${imageUrl}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Rate limiting (max 10 concurrent)
const limiter = new Bottleneck({ maxConcurrent: 10 });
```

### Manual Meal Plan Performance

**Target:** < 2 seconds for meal plan creation

**Why It's Fast:**
- ✅ No AI API calls (instant)
- ✅ Random image selection (O(1))
- ✅ Category images pre-validated
- ✅ No external HTTP requests

---

## 🔄 Rollout Strategy

### Phase 0: Manual Meal Plan Creation (Week 1)
1. Deploy category image pool configuration
2. Deploy `manualMealPlanService`
3. Deploy `ManualMealPlanCreator` component
4. Add "Create Custom Meal Plan" tab to Trainer Dashboard
5. Run unit + integration + E2E tests
6. Deploy to staging for validation
7. Deploy to production

### Phase 1: Image Validation (Week 2)
1. Deploy `mealPlanImageValidationService`
2. Integrate validation into meal plan generation
3. Integrate validation into meal plan save
4. Database migration for validation metadata
5. Run comprehensive tests
6. Deploy to staging
7. Monitor validation performance
8. Deploy to production

### Phase 2: Testing Enhancement (Week 3)
1. Add Suite 6 to Awesome Testing Protocol
2. Create experimental gap discovery suite
3. Run experiments and document gaps
4. Update testing documentation
5. Integrate with CI/CD
6. Validate 100% pass rate

---

## 📚 References

**Existing Systems:**
- BMAD Multi-Agent Recipe Generation: `server/services/agents/`
- Meal Plan Generator: `server/services/mealPlanGenerator.ts`
- Awesome Testing Protocol: `test/e2e/awesome-testing-protocol.spec.ts`

**New Systems:**
- Manual Meal Plan Service: `server/services/manualMealPlanService.ts` (NEW)
- Image Validation Service: `server/services/mealPlanImageValidationService.ts` (NEW)
- Manual Creator Component: `client/src/components/ManualMealPlanCreator.tsx` (NEW)

**PRD Reference:**
- `docs/prd/meal-image-validation-testing-enhancement.md`

---

## ✅ Architecture Sign-Off

**Tech Lead:** _________________
**Date:** October 13, 2025

**Next Steps:**
1. ✅ PRD Created
2. ✅ Architecture Documented
3. ⏭️ QA Risk Assessment (`@qa *risk`)
4. ⏭️ PO Validation & Story Sharding
5. ⏭️ Implementation (Phase 0 start)
