# Trainer Custom Meals Enhancement - Architecture

**Status:** In Development
**BMAD Phase:** Architecture Design
**Created:** 2025-01-15
**Owner:** Development Team

---

## Executive Summary

This architecture document defines the technical design for enhancing the Trainer "Create Custom" meal planning feature with 5 major improvements:

1. Fix Parse Meals button functionality
2. Support flexible ingredient-list meal format parsing
3. Generate unique AI images (3 per meal type) with DALL-E 3
4. Create trainer's personal custom meals database
5. Fix Saved Plans tab functionality

**Complexity:** High
**Database Changes:** Yes (new `trainer_custom_meals` table + `meal_images` table)
**API Changes:** Yes (6 new endpoints)
**Estimated Implementation:** 3-4 days

---

## Current State Analysis

### Existing Implementation

**Components:**
- `ManualMealPlanCreator.tsx` - Frontend component (325 lines)
- `manualMealPlanService.ts` - Backend service (270 lines)
- `trainerRoutes.ts` - API endpoints (includes parse/save)
- `TrainerMealPlans.tsx` - Saved plans display (473 lines)

**API Endpoints (Existing):**
```
POST /api/trainer/parse-manual-meals     ✅ EXISTS
POST /api/trainer/manual-meal-plan       ✅ EXISTS
GET  /api/trainer/meal-plans             ✅ EXISTS
DELETE /api/trainer/meal-plans/:id       ✅ EXISTS
```

**Current Flow:**
```
User enters text → Parse API → Categorize → Preview → Save to meal plan
```

### Issues with Current Implementation

#### Issue 1: Parse Button Not Working
**Symptom:** Clicking "Parse Meals" button does not trigger API call
**Likely Cause:** Frontend mutation configuration or API route not registered
**Fix:** Debug and fix mutation/API connectivity

#### Issue 2: Limited Parser Format
**Current Support:**
```
Breakfast: Oatmeal with berries
Lunch: Grilled chicken salad
Dinner: Baked salmon
```

**Missing Support:**
```
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
```

**Fix:** Enhance parser to support structured ingredient lists

#### Issue 3: Limited Image Variety
**Current:** Uses 15 pre-configured images per category (existing system working)
**Needed:** Ensure variety with 3 different images per meal type (12 total)
**Fix:** Reduce image pool to 3 per category, randomly assign to meals (already implemented in categoryImages.ts)

#### Issue 4: No Personal Meals Library
**Current:** Meals only exist within meal plans (not reusable)
**Needed:** Trainer's personal database of custom meals for reuse
**Fix:** Create `trainer_custom_meals` table + CRUD API

#### Issue 5: Saved Plans Tab Issues
**Symptom:** Plans not loading or displaying incorrectly
**Likely Cause:** Query configuration or data transformation
**Fix:** Debug TrainerMealPlans component queries

---

## Proposed Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Trainer Dashboard                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Create Custom Tab (Enhanced)                  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Text Input:                                    │  │  │
│  │  │  - Simple format: "Meal name"                  │  │  │
│  │  │  - Structured format: "Meal 1\n-ingredients"   │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │           ↓                                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Enhanced Parser Service                       │  │  │
│  │  │  - Detects format type                         │  │  │
│  │  │  - Parses ingredients with measurements        │  │  │
│  │  │  - Auto-categorizes meals                      │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │           ↓                                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  AI Image Generation (NEW)                     │  │  │
│  │  │  - DALL-E 3 API calls                          │  │  │
│  │  │  - 3 images per meal                           │  │  │
│  │  │  - S3 upload                                    │  │  │
│  │  │  - Image database tracking                     │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │           ↓                                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Save Options:                                  │  │  │
│  │  │  1. Save as meal plan (existing)               │  │  │
│  │  │  2. Save to personal meals library (NEW)       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Saved Plans Tab (Fixed)                       │  │
│  │  - Display all meal plans                             │  │
│  │  - Proper query configuration                         │  │
│  │  - Enhanced error handling                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         My Custom Meals Tab (NEW)                     │  │
│  │  - Display personal meals library                     │  │
│  │  - Reuse meals in new plans                          │  │
│  │  - Edit/delete custom meals                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Changes

#### New Table: `trainer_custom_meals`

```sql
CREATE TABLE trainer_custom_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_name VARCHAR(200) NOT NULL,
  category meal_category NOT NULL,  -- ENUM: breakfast, lunch, dinner, snack
  description TEXT,
  ingredients JSONB NOT NULL,  -- Array of {ingredient, amount, unit}
  instructions TEXT,
  nutritional_info JSONB,  -- {calories, protein, carbs, fat}
  image_url TEXT,  -- Randomly assigned from categoryImages.ts
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_trainer_meals_trainer (trainer_id),
  INDEX idx_trainer_meals_category (category),
  CONSTRAINT unique_trainer_meal_name UNIQUE (trainer_id, meal_name)
);
```

**Note:** No separate `meal_images` table needed. Images are assigned from the existing `categoryImages.ts` pool using `getRandomImageForCategory(category)` function.

### API Endpoints (New)

#### 1. Enhanced Parse Endpoint (Modified)

```typescript
POST /api/trainer/parse-manual-meals

Request:
{
  text: string,
  format?: 'simple' | 'structured' | 'auto'  // NEW
}

Response:
{
  status: 'success',
  data: {
    meals: Array<{
      mealName: string,
      category: MealCategory,
      ingredients?: Array<{ingredient: string, amount: string, unit: string}>,  // NEW
      description?: string
    }>,
    count: number,
    detectedFormat: 'simple' | 'structured'  // NEW
  }
}
```

#### 2. Create Custom Meal (NEW)

```typescript
POST /api/trainer/custom-meals

Request:
{
  mealName: string,
  category: MealCategory,
  description?: string,
  ingredients: Array<{ingredient: string, amount: string, unit: string}>,
  instructions?: string,
  nutritionalInfo?: {calories: number, protein: number, carbs: number, fat: number}
}

Response:
{
  status: 'success',
  data: {
    meal: TrainerCustomMeal  // Includes randomly assigned imageUrl from category pool
  }
}
```

#### 3. Get Trainer's Custom Meals (NEW)

```typescript
GET /api/trainer/custom-meals?category=breakfast&search=chicken

Response:
{
  status: 'success',
  data: {
    meals: Array<TrainerCustomMeal>,
    total: number,
    page: number,
    limit: number
  }
}
```

#### 4. Update Custom Meal (NEW)

```typescript
PUT /api/trainer/custom-meals/:mealId

Request: Same as POST /custom-meals

Response:
{
  status: 'success',
  data: {
    meal: TrainerCustomMeal
  }
}
```

#### 5. Delete Custom Meal (NEW)

```typescript
DELETE /api/trainer/custom-meals/:mealId

Response:
{
  status: 'success',
  message: 'Custom meal deleted successfully'
}
```

### Enhanced Parser Service

#### Current Parser Logic

```typescript
parseMealEntries(text: string): ManualMealEntry[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  return lines.map(line => {
    // Try explicit category: "Breakfast: Oatmeal"
    const match = line.match(/^(breakfast|lunch|dinner|snack):\s*(.+)$/i);
    if (match) {
      return { category: match[1], mealName: match[2] };
    }

    // Auto-detect category from keywords
    return { category: this.detectCategory(line), mealName: line };
  });
}
```

#### Enhanced Parser Logic (NEW)

```typescript
interface ParseOptions {
  format?: 'simple' | 'structured' | 'auto';
}

interface EnhancedMealEntry extends ManualMealEntry {
  ingredients?: Array<{
    ingredient: string;
    amount: string;
    unit: string;
  }>;
}

parseMealEntries(text: string, options: ParseOptions = {}): EnhancedMealEntry[] {
  const format = options.format || this.detectFormat(text);

  if (format === 'structured') {
    return this.parseStructuredFormat(text);
  }

  return this.parseSimpleFormat(text);  // Existing logic
}

/**
 * Detects if text is structured format
 *
 * Structured format indicators:
 * - "Meal 1", "Meal 2" headers
 * - Lines starting with "-" or "•"
 * - Measurements like "175g", "4 eggs"
 */
private detectFormat(text: string): 'simple' | 'structured' {
  const hasMealHeaders = /Meal \d+/i.test(text);
  const hasBulletPoints = /^[\-•]/m.test(text);
  const hasMeasurements = /\d+\s*(g|kg|ml|l|oz|lb|cup|tbsp|tsp)\s/i.test(text);

  if ((hasMealHeaders && hasBulletPoints) || hasMeasurements) {
    return 'structured';
  }

  return 'simple';
}

/**
 * Parse structured format:
 *
 * Meal 1
 *
 * -175g of Jasmine Rice
 * -150g of Lean ground beef
 * -100g of cooked broccoli
 */
private parseStructuredFormat(text: string): EnhancedMealEntry[] {
  const meals: EnhancedMealEntry[] = [];
  const mealBlocks = text.split(/Meal \d+/i).filter(Boolean);

  for (const block of mealBlocks) {
    const lines = block.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('•'));

    if (lines.length === 0) continue;

    const ingredients = lines.map(line => {
      // Remove bullet point
      line = line.replace(/^[\-•]\s*/, '');

      // Parse measurement: "175g of Jasmine Rice"
      const match = line.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lb|cup|tbsp|tsp)?\s*(?:of\s+)?(.+)$/i);

      if (match) {
        return {
          amount: match[1],
          unit: match[2] || 'unit',
          ingredient: match[3].trim()
        };
      }

      // Fallback: "4 eggs" (count-based)
      const countMatch = line.match(/^(\d+)\s+(.+)$/);
      if (countMatch) {
        return {
          amount: countMatch[1],
          unit: 'unit',
          ingredient: countMatch[2].trim()
        };
      }

      // Fallback: plain ingredient
      return {
        amount: '1',
        unit: 'serving',
        ingredient: line
      };
    });

    // Generate meal name from ingredients
    const mealName = this.generateMealName(ingredients);
    const category = this.detectCategoryFromIngredients(ingredients);

    meals.push({
      mealName,
      category,
      ingredients
    });
  }

  return meals;
}

/**
 * Generate descriptive meal name from ingredients
 */
private generateMealName(ingredients: Array<{ingredient: string}>): string {
  if (ingredients.length === 0) return 'Custom Meal';

  // Take first 2-3 main ingredients
  const mainIngredients = ingredients.slice(0, 3).map(i => i.ingredient);

  if (mainIngredients.length === 1) {
    return mainIngredients[0];
  }

  if (mainIngredients.length === 2) {
    return `${mainIngredients[0]} and ${mainIngredients[1]}`;
  }

  return `${mainIngredients[0]}, ${mainIngredients[1]}, and ${mainIngredients[2]}`;
}

/**
 * Detect category from ingredient types
 */
private detectCategoryFromIngredients(
  ingredients: Array<{ingredient: string}>
): MealCategory {
  const allIngredients = ingredients.map(i => i.ingredient.toLowerCase()).join(' ');

  // Use existing detectCategory logic
  return this.detectCategory(allIngredients);
}
```

### Image Generation Service (NEW)

```typescript
// server/services/mealImageGenerator.ts

import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';
import crypto from 'crypto';

export interface MealImageOptions {
  mealName: string;
  ingredients: string[];
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  count?: number;  // Default: 3
}

export interface GeneratedImage {
  imageUrl: string;  // CDN URL
  s3Key: string;
  prompt: string;
  index: number;
}

export class MealImageGenerator {
  private openai: OpenAI;
  private s3: S3Client;
  private bucketName: string;
  private cdnUrl: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    this.s3 = new S3Client({
      region: process.env.DO_SPACES_REGION || 'nyc3',
      endpoint: process.env.DO_SPACES_ENDPOINT,
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY!,
        secretAccessKey: process.env.DO_SPACES_SECRET!,
      },
    });

    this.bucketName = process.env.DO_SPACES_BUCKET || 'pti';
    this.cdnUrl = process.env.DO_SPACES_CDN_ENDPOINT || 'https://pti.nyc3.cdn.digitaloceanspaces.com';
  }

  /**
   * Generate 3 unique images for a meal using DALL-E 3
   */
  async generateImagesForMeal(options: MealImageOptions): Promise<GeneratedImage[]> {
    const { mealName, ingredients, category, count = 3 } = options;

    const images: GeneratedImage[] = [];

    for (let i = 1; i <= count; i++) {
      const prompt = this.createImagePrompt(mealName, ingredients, category, i);

      try {
        // Generate image with DALL-E 3
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
          throw new Error('No image URL returned from DALL-E');
        }

        // Download image
        const imageBuffer = await this.downloadImage(imageUrl);

        // Upload to S3
        const s3Key = await this.uploadToS3(imageBuffer, mealName, i);

        // Construct CDN URL
        const cdnUrl = `${this.cdnUrl}/${s3Key}`;

        images.push({
          imageUrl: cdnUrl,
          s3Key,
          prompt,
          index: i
        });

      } catch (error) {
        console.error(`Failed to generate image ${i} for meal "${mealName}":`, error);
        // Continue to next image instead of failing completely
      }
    }

    if (images.length === 0) {
      throw new Error('Failed to generate any images for meal');
    }

    return images;
  }

  /**
   * Create DALL-E prompt for meal image
   *
   * Varies prompt for each image to ensure uniqueness
   */
  private createImagePrompt(
    mealName: string,
    ingredients: string[],
    category: string,
    imageIndex: number
  ): string {
    const basePrompt = `Professional food photography of ${mealName}`;

    // Add ingredient details
    const ingredientList = ingredients.slice(0, 5).join(', ');
    const withIngredients = `${basePrompt} featuring ${ingredientList}`;

    // Vary presentation style for each image
    const variations = [
      `${withIngredients}, plated beautifully on a white ceramic plate, top-down view, natural lighting, restaurant quality`,
      `${withIngredients}, served on a wooden board with garnishes, side angle view, warm ambient lighting, rustic style`,
      `${withIngredients}, styled for a magazine cover, professional composition, vibrant colors, shallow depth of field`
    ];

    return variations[imageIndex - 1] || variations[0];
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Upload image to S3
   */
  private async uploadToS3(imageBuffer: Buffer, mealName: string, index: number): Promise<string> {
    // Generate unique S3 key
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(mealName + timestamp).digest('hex');
    const s3Key = `meal-images/custom/${hash}-${index}.png`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }));

    return s3Key;
  }

  /**
   * Validate image generation quota
   * DALL-E 3: ~$0.04 per image
   * 3 images per meal = $0.12 per meal
   */
  async validateQuota(trainerId: string): Promise<boolean> {
    // Check if trainer has exceeded monthly image generation limit
    // Implement based on business rules
    // For now, return true (no limits)
    return true;
  }
}

export const mealImageGenerator = new MealImageGenerator();
```

### Component Architecture

#### Enhanced ManualMealPlanCreator Component

```typescript
// New state for image generation
const [generatingImages, setGeneratingImages] = useState(false);
const [selectedMealForImages, setSelectedMealForImages] = useState<number | null>(null);

// New mutation: Generate images
const generateImagesMutation = useMutation({
  mutationFn: async (mealIndex: number) => {
    const meal = meals[mealIndex];
    const response = await apiRequest('/api/trainer/generate-meal-images', {
      method: 'POST',
      body: JSON.stringify({
        mealName: meal.mealName,
        ingredients: meal.ingredients?.map(i => i.ingredient) || [],
        category: meal.category,
        count: 3
      })
    });
    return { mealIndex, images: response.data.images };
  },
  onSuccess: (data) => {
    // Update meal with generated images
    setMeals(meals.map((m, i) =>
      i === data.mealIndex ? { ...m, images: data.images } : m
    ));
    toast({
      title: 'Images Generated',
      description: `3 unique images created for ${meals[data.mealIndex].mealName}`
    });
  }
});

// New mutation: Save to custom meals library
const saveToLibraryMutation = useMutation({
  mutationFn: async (meal: EnhancedMealEntry) => {
    const response = await apiRequest('/api/trainer/custom-meals', {
      method: 'POST',
      body: JSON.stringify(meal)
    });
    return response;
  },
  onSuccess: () => {
    toast({
      title: 'Saved to Library',
      description: 'Meal added to your personal collection'
    });
  }
});
```

#### New Component: TrainerCustomMealsLibrary

```typescript
// client/src/components/TrainerCustomMealsLibrary.tsx

export default function TrainerCustomMealsLibrary() {
  const [selectedCategory, setSelectedCategory] = useState<MealCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trainer-custom-meals', selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchTerm && { search: searchTerm })
      });
      const response = await apiRequest('GET', `/api/trainer/custom-meals?${params}`);
      return response.json();
    }
  });

  // Display meals in grid with image carousel
  // Allow editing, deleting, and reusing meals

  return (
    <div className="space-y-6">
      {/* Filters */}
      {/* Meals Grid */}
      {/* Meal Modal */}
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

1. **Enhanced Parser Tests** (`manualMealPlanService.test.ts`)
   - Simple format parsing ✅ (existing)
   - Structured format parsing 🆕
   - Ingredient extraction 🆕
   - Measurement parsing 🆕
   - Meal name generation 🆕
   - Format auto-detection 🆕

2. **Image Generation Tests** (`mealImageGenerator.test.ts`)
   - DALL-E 3 integration 🆕
   - S3 upload 🆕
   - Prompt variation 🆕
   - Error handling 🆕
   - Quota validation 🆕

3. **Custom Meals Service Tests** (`trainerCustomMeals.test.ts`)
   - CRUD operations 🆕
   - Query filtering 🆕
   - Duplicate prevention 🆕

### Integration Tests

1. **Parse Endpoint Test**
   - Simple format → 200 with meals
   - Structured format → 200 with ingredients
   - Invalid format → 400 error

2. **Image Generation Endpoint Test**
   - Valid meal → 200 with 3 images
   - S3 URLs accessible
   - Database records created

3. **Custom Meals CRUD Test**
   - Create → 201
   - Read → 200 with meals
   - Update → 200
   - Delete → 200
   - Authorization checks

### E2E Tests (Playwright)

1. **Create Custom Meal Plan Flow**
   ```typescript
   test('Trainer can create custom meal plan with structured format', async ({ page }) => {
     await page.goto('/trainer');
     await page.click('text=Create Custom');

     // Enter structured format
     await page.fill('textarea', `
       Meal 1
       -175g of Jasmine Rice
       -150g of Lean ground beef
       -100g of cooked broccoli
     `);

     await page.click('button:has-text("Parse Meals")');
     await page.waitForSelector('text=1 meals detected');

     // Generate images
     await page.click('button:has-text("Generate Images")');
     await page.waitForSelector('img[alt*="meal"]', { timeout: 30000 });

     // Save to library
     await page.fill('input[placeholder*="plan name"]', 'High Protein Plan');
     await page.click('button:has-text("Save to Library")');

     await page.waitForSelector('text=Saved to Library');
   });
   ```

2. **View Saved Plans Test**
   ```typescript
   test('Trainer can view saved meal plans', async ({ page }) => {
     await page.goto('/trainer');
     await page.click('text=Saved Plans');

     await page.waitForSelector('[data-testid="meal-plan-card"]');

     const planCount = await page.locator('[data-testid="meal-plan-card"]').count();
     expect(planCount).toBeGreaterThan(0);
   });
   ```

3. **Reuse Custom Meal Test**
   ```typescript
   test('Trainer can reuse custom meal in new plan', async ({ page }) => {
     await page.goto('/trainer');
     await page.click('text=My Custom Meals');

     await page.waitForSelector('[data-testid="custom-meal-card"]');
     await page.click('[data-testid="custom-meal-card"]:first-child button:has-text("Add to Plan")');

     await page.waitForSelector('text=Added to current plan');
   });
   ```

---

## Performance Considerations

### Image Generation Performance

**DALL-E 3 Timing:**
- Single image: ~10-15 seconds
- 3 images sequential: ~30-45 seconds ❌ Too slow
- **Solution:** Parallel generation

```typescript
async generateImagesForMeal(options: MealImageOptions): Promise<GeneratedImage[]> {
  const { count = 3 } = options;

  // Generate all images in parallel
  const imagePromises = Array.from({ length: count }, (_, i) =>
    this.generateSingleImage(options, i + 1)
  );

  const results = await Promise.allSettled(imagePromises);

  const images = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<GeneratedImage>).value);

  return images;
}
```

**Optimized Timing:**
- 3 images parallel: ~10-15 seconds ✅ Acceptable

### Database Indexing

```sql
CREATE INDEX idx_trainer_meals_trainer ON trainer_custom_meals(trainer_id);
CREATE INDEX idx_trainer_meals_category ON trainer_custom_meals(category);
CREATE INDEX idx_meal_images_meal ON meal_images(meal_id);
CREATE INDEX idx_meal_images_plan_meal ON meal_images(meal_plan_meal_id);
```

### Caching Strategy

- Cache category images (existing) ✅
- Cache custom meals per trainer (Redis, 5 min TTL)
- No caching for AI-generated images (unique per generation)

---

## Security Considerations

### API Rate Limiting

```typescript
// Rate limit image generation
const imageGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,  // 50 generations per hour
  message: 'Too many image generation requests. Please try again later.'
});

trainerRouter.post('/generate-meal-images',
  requireAuth,
  requireRole('trainer'),
  imageGenerationLimiter,
  async (req, res) => { /* ... */ }
);
```

### Input Validation

```typescript
const generateImagesSchema = z.object({
  mealName: z.string().min(1).max(200),
  ingredients: z.array(z.string()).max(20),
  category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  count: z.number().int().min(1).max(5).optional()
});
```

### S3 Security

- Images uploaded with `public-read` ACL
- Bucket CORS configured for CDN access
- Signed URLs not needed (public meal images)

---

## Cost Analysis

### Zero Additional Costs! ✅

**Image Strategy:**
- Using existing Unsplash image pool (free, no attribution required for commercial use)
- 12 curated images total (3 per meal category)
- Random assignment from category pool
- **Zero API costs**
- **Zero storage costs** (images hosted by Unsplash CDN)

**Database Storage:**
- `trainer_custom_meals` table: ~1KB per meal entry
- 1000 meals: ~1MB (negligible)
- Covered by existing database infrastructure

---

## Migration Strategy

### Phase 1: Fix Parse Button ✅ COMPLETE
- ✅ Fixed API call signature in ManualMealPlanCreator.tsx
- ✅ Tested in development
- Ready for deployment

### Phase 2: Enhanced Parser (Current Session)
- Implement structured format parsing
- Add ingredient extraction with measurements
- Add unit tests
- Test with user's example format
- Deploy to production

### Phase 3: Fix Saved Plans Tab (Current Session)
- Debug TrainerMealPlans query issues
- Fix data transformation
- Add error handling
- Test thoroughly

### Phase 4: Image Pool Optimization (Optional)
- Reduce categoryImages.ts to 3 images per category (currently 15)
- Or keep all 15 and randomly select for variety
- No code changes needed - existing system works

### Phase 5: Database Schema (Future Session)
- Create migration files
- Add `trainer_custom_meals` table
- Run migrations in development
- Test thoroughly
- Run in production

### Phase 6: Custom Meals Library (Future Session)
- Implement CRUD API (5 endpoints)
- Create TrainerCustomMealsLibrary component
- Add to Trainer dashboard as new tab
- Test E2E flows
- Deploy to production

---

## Rollback Plan

If any phase fails:

1. **Database rollback:**
   ```sql
   -- Rollback script
   DROP TABLE IF EXISTS meal_images;
   DROP TABLE IF EXISTS trainer_custom_meals;
   ```

2. **Code rollback:**
   - Revert git commit
   - Redeploy previous version
   - Clear Redis cache

3. **Feature flags:**
   - Disable image generation via env var
   - Disable custom meals library via env var
   - Keep existing functionality working

---

## Success Metrics

### Functional Success
- ✅ Parse button works 100% of the time
- ✅ Structured format parsing accuracy >95%
- ✅ Image generation success rate >90%
- ✅ Saved Plans tab loads <2 seconds
- ✅ Custom meals library accessible and functional

### Performance Success
- ✅ Parse API response <500ms
- ✅ Image generation <20 seconds for 3 images
- ✅ Custom meals query <1 second
- ✅ No degradation to existing features

### Test Success
- ✅ 100% unit test pass rate
- ✅ 100% integration test pass rate
- ✅ 100% E2E test pass rate
- ✅ Test coverage >80% for new code

---

## Appendix

### Example Structured Format

```
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli

Meal 2

-4 eggs
-2 pieces of sourdough bread
-1 banana (100g)
-50g of strawberries
-10g of butter
-15ml of honey

Meal 3

-100g turkey breast
-150g of sweet potato
-100g of asparagus
-250ml of coconut water
```

### Parsed Result

```json
[
  {
    "mealName": "Jasmine Rice, Lean ground beef, and cooked broccoli",
    "category": "dinner",
    "ingredients": [
      {"amount": "175", "unit": "g", "ingredient": "Jasmine Rice"},
      {"amount": "150", "unit": "g", "ingredient": "Lean ground beef"},
      {"amount": "100", "unit": "g", "ingredient": "cooked broccoli"}
    ]
  },
  {
    "mealName": "eggs, sourdough bread, and banana",
    "category": "breakfast",
    "ingredients": [
      {"amount": "4", "unit": "unit", "ingredient": "eggs"},
      {"amount": "2", "unit": "unit", "ingredient": "pieces of sourdough bread"},
      {"amount": "1", "unit": "unit", "ingredient": "banana (100g)"},
      {"amount": "50", "unit": "g", "ingredient": "strawberries"},
      {"amount": "10", "unit": "g", "ingredient": "butter"},
      {"amount": "15", "unit": "ml", "ingredient": "honey"}
    ]
  },
  {
    "mealName": "turkey breast, sweet potato, and asparagus",
    "category": "dinner",
    "ingredients": [
      {"amount": "100", "unit": "g", "ingredient": "turkey breast"},
      {"amount": "150", "unit": "g", "ingredient": "sweet potato"},
      {"amount": "100", "unit": "g", "ingredient": "asparagus"},
      {"amount": "250", "unit": "ml", "ingredient": "coconut water"}
    ]
  }
]
```

---

**Document Status:** ✅ Complete
**Next Step:** Implementation Phase 1 (Fix Parse Button)
**Review Required:** Yes (before implementation)
