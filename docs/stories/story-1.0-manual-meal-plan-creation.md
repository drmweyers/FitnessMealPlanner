# Story 1.0: Manual Meal Plan Creation with Category Images
## URGENT - P0 Priority

**Epic:** Meal Image Validation System
**Priority:** P0 (URGENT - Implement First)
**Status:** READY FOR IMPLEMENTATION
**Estimated Effort:** 1-2 days
**Dependencies:** NONE (standalone)

---

## 📋 Story Description

**As a** trainer
**I want** to create custom meal plans manually without using AI
**So that** I can save API costs and have full control over meal plan content

**Business Value:**
- ✅ **Zero OpenAI API costs** for manual meal plans
- ✅ **Instant creation** (no AI latency)
- ✅ **Full trainer control** over content
- ✅ **Professional images** from curated category pools

---

## ✅ Acceptance Criteria

### AC1: UI Component
- [ ] Trainer dashboard has "Create Custom Meal Plan" tab/section
- [ ] Tab is prominently displayed alongside existing meal plan generator
- [ ] Tab includes tooltip: "No AI costs - Instant creation"
- [ ] Component renders without errors

### AC2: Free-Form Entry
- [ ] Open textbox accepts multi-line meal entry
- [ ] Placeholder text provides example format
- [ ] Textbox has minimum 10 rows height
- [ ] Entry supports 1-50 meals per plan

### AC3: Meal Parsing
- [ ] System auto-detects meal categories (breakfast/lunch/dinner/snack)
- [ ] Parser handles format: "Category: Meal Name"
- [ ] Parser handles format: "Meal Name" (with auto-detection)
- [ ] Parser accuracy > 90% for common meal names
- [ ] Trainer can manually override detected categories

### AC4: Category Image Assignment
- [ ] Each meal is assigned a random image from its category pool
- [ ] Image pool contains 10-20 high-quality images per category
- [ ] Images are from Unsplash (or cached to S3)
- [ ] Random selection ensures variety

### AC5: Preview & Validation
- [ ] Preview shows parsed meals with assigned images
- [ ] Preview displays category for each meal
- [ ] Preview allows category override
- [ ] All category images load successfully (< 2 seconds)

### AC6: Save & Assign
- [ ] Manual meal plans can be saved to trainer's library
- [ ] Manual meal plans can be assigned to customers
- [ ] Save completes without OpenAI API calls
- [ ] API usage monitoring confirms zero AI costs

### AC7: Database Integration
- [ ] Manual meal plans saved to `trainerMealPlans` table
- [ ] `isManual` flag set to `true`
- [ ] `imageValidation` metadata stored
- [ ] `creationMethod` set to `'manual'`

### AC8: Error Handling
- [ ] Parser gracefully handles empty input
- [ ] Parser gracefully handles malformed input
- [ ] Image load failures use placeholder
- [ ] User receives clear error messages

### AC9: Performance
- [ ] Manual meal plan creation completes in < 2 seconds
- [ ] Image loading completes in < 2 seconds
- [ ] No performance impact on existing meal plan workflows

### AC10: Coexistence
- [ ] Manual and AI-generated meal plans coexist in trainer library
- [ ] Manual meal plans clearly labeled in library view
- [ ] Manual meal plans function identically when assigned to customers

---

## 🏗️ Implementation Guidance

### 1. Category Image Pool Configuration

**File:** `server/config/categoryImages.ts` (NEW)

```typescript
export const CATEGORY_IMAGE_POOL = {
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800', // pancakes
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800', // oatmeal
    'https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=800', // eggs
    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800', // toast
    'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800', // fruit bowl
    'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800', // smoothie
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800', // breakfast spread
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800', // waffles
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', // avocado toast
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', // breakfast plate
    // ... 10-20 total breakfast images
  ],
  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', // salad
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800', // sandwich
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', // soup
    'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800', // bowl
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', // healthy bowl
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800', // salad bowl
    'https://images.unsplash.com/photo-1547496502-affa22d38842?w=800', // wrap
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // pizza
    'https://images.unsplash.com/photo-1572448862527-d3c904757de6?w=800', // burger bowl
    'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800', // lunch plate
    // ... 10-20 total lunch images
  ],
  dinner: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800', // steak
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800', // pasta
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800', // fish
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // burger
    'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800', // salmon
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', // chicken
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800', // dinner plate
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800', // roast
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800', // gourmet
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', // dinner bowl
    // ... 10-20 total dinner images
  ],
  snack: [
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', // nuts
    'https://images.unsplash.com/photo-1571212515416-fca2f8cfe8c5?w=800', // yogurt
    'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800', // fruit
    'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800', // protein bar
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800', // snack plate
    'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800', // hummus
    'https://images.unsplash.com/photo-1587334207976-50a2df954dcd?w=800', // veggies
    'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800', // energy balls
    'https://images.unsplash.com/photo-1582052393ad-7896b8b88ad3?w=800', // apple slices
    'https://images.unsplash.com/photo-1505576633788-77f6a4e55c48?w=800', // trail mix
    // ... 10-20 total snack images
  ]
};

// Type definitions
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface CategoryImage {
  url: string;
  description: string;
}

// Helper to get random image from category
export function getRandomImageForCategory(category: MealCategory): string {
  const images = CATEGORY_IMAGE_POOL[category];
  if (!images || images.length === 0) {
    // Fallback placeholder
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
  }
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}
```

### 2. Manual Meal Plan Service

**File:** `server/services/manualMealPlanService.ts` (NEW)

```typescript
import { getRandomImageForCategory, type MealCategory } from '../config/categoryImages';

export interface ManualMealEntry {
  mealName: string;
  category: MealCategory;
  description?: string;
  ingredients?: string[];
  instructions?: string;
}

export interface ManualMealPlan {
  planName: string;
  meals: Array<ManualMealEntry & { imageUrl: string }>;
  createdBy: string;
  creationMethod: 'manual';
  isManual: true;
}

export class ManualMealPlanService {
  /**
   * Parse meal entry text into structured meals
   */
  parseMealEntries(text: string): ManualMealEntry[] {
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    return lines.map(line => {
      const trimmedLine = line.trim();

      // Try pattern: "Category: Meal Name"
      const categoryMatch = trimmedLine.match(/^(breakfast|lunch|dinner|snack):\s*(.+)/i);
      if (categoryMatch) {
        return {
          category: categoryMatch[1].toLowerCase() as MealCategory,
          mealName: categoryMatch[2].trim()
        };
      }

      // Fallback: Auto-detect category from meal name
      const category = this.detectCategory(trimmedLine);
      return {
        mealName: trimmedLine,
        category
      };
    });
  }

  /**
   * Auto-detect category from meal name
   */
  private detectCategory(mealName: string): MealCategory {
    const lowerName = mealName.toLowerCase();

    // Breakfast keywords
    if (/(breakfast|morning|am|scrambled|oatmeal|cereal|pancake|waffle|egg|toast|bagel|muffin|coffee)/i.test(lowerName)) {
      return 'breakfast';
    }

    // Lunch keywords
    if (/(lunch|noon|midday|sandwich|wrap|salad|soup|bowl)/i.test(lowerName)) {
      return 'lunch';
    }

    // Dinner keywords
    if (/(dinner|supper|evening|pm|steak|pasta|fish|chicken|salmon|roast|casserole)/i.test(lowerName)) {
      return 'dinner';
    }

    // Snack keywords
    if (/(snack|treat|protein|bar|nuts|fruit|yogurt|shake|smoothie)/i.test(lowerName)) {
      return 'snack';
    }

    // Default to snack if uncertain
    return 'snack';
  }

  /**
   * Create manual meal plan with category images
   */
  async createManualMealPlan(
    meals: ManualMealEntry[],
    trainerId: string,
    planName: string
  ): Promise<ManualMealPlan> {
    // Assign random category images
    const mealsWithImages = meals.map(meal => ({
      ...meal,
      imageUrl: getRandomImageForCategory(meal.category)
    }));

    return {
      planName,
      meals: mealsWithImages,
      createdBy: trainerId,
      creationMethod: 'manual',
      isManual: true
    };
  }

  /**
   * Validate category image pool health
   */
  async validateCategoryImagePool(): Promise<{
    healthy: boolean;
    totalImages: number;
    categories: Record<MealCategory, number>;
  }> {
    const { CATEGORY_IMAGE_POOL } = await import('../config/categoryImages');

    const categories = {
      breakfast: CATEGORY_IMAGE_POOL.breakfast?.length || 0,
      lunch: CATEGORY_IMAGE_POOL.lunch?.length || 0,
      dinner: CATEGORY_IMAGE_POOL.dinner?.length || 0,
      snack: CATEGORY_IMAGE_POOL.snack?.length || 0
    };

    const totalImages = Object.values(categories).reduce((sum, count) => sum + count, 0);
    const healthy = Object.values(categories).every(count => count >= 10);

    return { healthy, totalImages, categories };
  }
}

export const manualMealPlanService = new ManualMealPlanService();
```

### 3. API Endpoint

**File:** `server/routes/trainerRoutes.ts` (MODIFY - ADD ENDPOINT)

```typescript
import { manualMealPlanService } from '../services/manualMealPlanService';
import { z } from 'zod';

// Validation schema
const manualMealPlanSchema = z.object({
  planName: z.string().min(1).max(100),
  meals: z.array(z.object({
    mealName: z.string().min(1).max(200),
    category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    description: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    instructions: z.string().optional()
  })).min(1).max(50)
});

// POST /api/trainer/manual-meal-plan
trainerRouter.post('/manual-meal-plan', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planName, meals } = manualMealPlanSchema.parse(req.body);

    // Create manual meal plan
    const mealPlan = await manualMealPlanService.createManualMealPlan(
      meals,
      trainerId,
      planName
    );

    // Save to database
    const savedPlan = await storage.createTrainerMealPlan({
      trainerId,
      mealPlanData: mealPlan,
      isManual: true,
      notes: 'Manual meal plan created by trainer'
    });

    res.status(201).json({
      mealPlan: savedPlan,
      message: 'Manual meal plan created successfully'
    });
  } catch (error) {
    console.error('Failed to create manual meal plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create manual meal plan'
    });
  }
});

// GET /api/trainer/category-image-pool-health
trainerRouter.get('/category-image-pool-health', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const health = await manualMealPlanService.validateCategoryImagePool();
    res.json(health);
  } catch (error) {
    console.error('Failed to check image pool health:', error);
    res.status(500).json({ error: 'Failed to check image pool health' });
  }
});
```

### 4. Frontend Component

**File:** `client/src/components/ManualMealPlanCreator.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { Sparkles, Check } from 'lucide-react';

interface ManualMealEntry {
  mealName: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  imageUrl?: string;
}

export default function ManualMealPlanCreator() {
  const { toast } = useToast();
  const [mealText, setMealText] = useState('');
  const [planName, setPlanName] = useState('');
  const [meals, setMeals] = useState<ManualMealEntry[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  // Parse meals mutation
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('/api/trainer/parse-manual-meals', {
        method: 'POST',
        body: { text }
      });
      return response;
    },
    onSuccess: (data) => {
      setMeals(data.meals);
      setIsPreview(true);
      toast({
        title: 'Meals Parsed',
        description: `${data.meals.length} meals detected`
      });
    }
  });

  // Save meal plan mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/trainer/manual-meal-plan', {
        method: 'POST',
        body: { planName, meals }
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Manual meal plan created'
      });
      // Reset form
      setMealText('');
      setPlanName('');
      setMeals([]);
      setIsPreview(false);
    }
  });

  const handleParseMeals = () => {
    if (!mealText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter meal details',
        variant: 'destructive'
      });
      return;
    }
    parseMutation.mutate(mealText);
  };

  const updateMealCategory = (index: number, category: string) => {
    setMeals(meals.map((m, i) =>
      i === index ? { ...m, category: category as any } : m
    ));
  };

  const handleSave = () => {
    if (!planName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter meal plan name',
        variant: 'destructive'
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <CardTitle>Create Custom Meal Plan</CardTitle>
        </div>
        <CardDescription>
          Manual entry - No AI costs, instant creation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPreview ? (
          <>
            {/* Meal entry textbox */}
            <div>
              <Label htmlFor="meal-text">Enter Meal Details</Label>
              <Textarea
                id="meal-text"
                placeholder={`Enter meals (one per line):\nBreakfast: Oatmeal with berries\nLunch: Grilled chicken salad\nDinner: Salmon with vegetables\nSnack: Greek yogurt`}
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
                rows={10}
                className="mt-2"
              />
            </div>
            <Button
              onClick={handleParseMeals}
              disabled={parseMutation.isPending}
            >
              {parseMutation.isPending ? 'Parsing...' : 'Parse Meals'}
            </Button>
          </>
        ) : (
          <>
            {/* Plan name */}
            <div>
              <Label htmlFor="plan-name">Meal Plan Name</Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., John's Weekly Plan"
                className="mt-2"
              />
            </div>

            {/* Meal preview with category selection */}
            <div className="space-y-3">
              <Label>Meals ({meals.length})</Label>
              {meals.map((meal, index) => (
                <div key={index} className="flex gap-3 items-center p-3 border rounded">
                  <div className="flex-1">
                    <p className="font-medium">{meal.mealName}</p>
                  </div>
                  <Select
                    value={meal.category}
                    onValueChange={(cat) => updateMealCategory(index, cat)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                  {meal.imageUrl && (
                    <img
                      src={meal.imageUrl}
                      alt={meal.mealName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Meal Plan'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPreview(false)}
              >
                Back to Edit
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 5. Integration with Trainer Dashboard

**File:** `client/src/pages/Trainer.tsx` (MODIFY - ADD TAB)

```typescript
import ManualMealPlanCreator from '../components/ManualMealPlanCreator';

// Add to tabs array
const tabs = [
  { name: 'Dashboard', icon: Home },
  { name: 'Customers', icon: Users },
  { name: 'Meal Plans', icon: Utensils },
  { name: 'Create Custom Plan', icon: Sparkles },  // NEW TAB
  // ... other tabs
];

// Add to tab content
{activeTab === 'Create Custom Plan' && (
  <ManualMealPlanCreator />
)}
```

---

## 🧪 Testing Requirements

### Unit Tests

**File:** `test/unit/services/manualMealPlanService.test.ts` (NEW)

```typescript
describe('ManualMealPlanService', () => {
  describe('parseMealEntries', () => {
    test('parses "Breakfast: eggs" correctly', () => {
      const result = service.parseMealEntries('Breakfast: scrambled eggs');
      expect(result).toEqual([{
        mealName: 'scrambled eggs',
        category: 'breakfast'
      }]);
    });

    test('auto-detects breakfast from "oatmeal"', () => {
      const result = service.parseMealEntries('oatmeal with berries');
      expect(result[0].category).toBe('breakfast');
    });

    test('handles multiline entries', () => {
      const text = 'Breakfast: eggs\nLunch: salad\nDinner: steak';
      const result = service.parseMealEntries(text);
      expect(result).toHaveLength(3);
    });

    test('parser accuracy > 90% for common meals', () => {
      // Test 100 common meal names
      const commonMeals = [/* ... 100 meal names ... */];
      const results = commonMeals.map(m => service.parseMealEntries(m));
      const correctCount = results.filter(/* ... check if correct ... */).length;
      expect(correctCount / commonMeals.length).toBeGreaterThan(0.9);
    });
  });

  describe('createManualMealPlan', () => {
    test('assigns random images to meals', () => {
      const meals = [
        { mealName: 'eggs', category: 'breakfast' as const },
        { mealName: 'salad', category: 'lunch' as const }
      ];
      const result = await service.createManualMealPlan(meals, 'trainer123', 'Test Plan');
      expect(result.meals[0].imageUrl).toBeTruthy();
      expect(result.meals[1].imageUrl).toBeTruthy();
    });

    test('marks plan as manual', () => {
      const result = await service.createManualMealPlan([], 'trainer123', 'Test');
      expect(result.isManual).toBe(true);
      expect(result.creationMethod).toBe('manual');
    });
  });

  describe('validateCategoryImagePool', () => {
    test('confirms image pool health', async () => {
      const result = await service.validateCategoryImagePool();
      expect(result.healthy).toBe(true);
      expect(result.categories.breakfast).toBeGreaterThanOrEqual(10);
      expect(result.categories.lunch).toBeGreaterThanOrEqual(10);
      expect(result.categories.dinner).toBeGreaterThanOrEqual(10);
      expect(result.categories.snack).toBeGreaterThanOrEqual(10);
    });
  });
});
```

### Integration Tests

**File:** `test/integration/manualMealPlanWorkflow.integration.test.ts` (NEW)

```typescript
test('complete manual meal plan creation workflow', async () => {
  // 1. Trainer logs in
  const trainer = await loginAsTrainer();

  // 2. Create manual meal plan
  const response = await apiRequest('/api/trainer/manual-meal-plan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainer.token}` },
    body: {
      planName: 'Test Manual Plan',
      meals: [
        { mealName: 'Oatmeal', category: 'breakfast' },
        { mealName: 'Chicken Salad', category: 'lunch' },
        { mealName: 'Grilled Salmon', category: 'dinner' }
      ]
    }
  });

  expect(response.status).toBe(201);
  expect(response.body.mealPlan.isManual).toBe(true);

  // 3. Verify saved to database
  const savedPlan = await db.query.trainerMealPlans.findFirst({
    where: eq(trainerMealPlans.id, response.body.mealPlan.id)
  });

  expect(savedPlan).toBeTruthy();
  expect(savedPlan.isManual).toBe(true);
});

test('manual meal plan can be assigned to customer', async () => {
  // Create manual meal plan
  const mealPlan = await createManualMealPlan();

  // Assign to customer
  const assignment = await assignMealPlanToCustomer(mealPlan.id, 'customer123');

  expect(assignment).toBeTruthy();
  expect(assignment.mealPlanId).toBe(mealPlan.id);
});

test('zero OpenAI API calls for manual meal plans', async () => {
  const initialUsage = await getOpenAIUsage();

  // Create manual meal plan
  await createManualMealPlan();

  const finalUsage = await getOpenAIUsage();

  expect(finalUsage.totalCalls).toBe(initialUsage.totalCalls);
  expect(finalUsage.totalCost).toBe(initialUsage.totalCost);
});
```

### E2E Tests

**File:** `test/e2e/manual-meal-plan-creation.spec.ts` (NEW)

```typescript
test('trainer can create manual meal plan', async ({ page }) => {
  await loginAsTrainer(page);

  // Navigate to Create Custom Plan tab
  await page.click('text=Create Custom Plan');

  // Enter meal details
  await page.fill('textarea#meal-text', `
    Breakfast: Oatmeal with berries
    Lunch: Grilled chicken salad
    Dinner: Baked salmon with vegetables
    Snack: Greek yogurt
  `);

  // Parse meals
  await page.click('button:has-text("Parse Meals")');

  // Wait for preview
  await page.waitForSelector('text=Meals (4)');

  // Enter plan name
  await page.fill('input#plan-name', 'Test Manual Plan');

  // Save
  await page.click('button:has-text("Save Meal Plan")');

  // Verify success
  await expect(page.locator('text=Manual meal plan created')).toBeVisible();
});

test('category images load successfully', async ({ page }) => {
  await loginAsTrainer(page);
  await page.click('text=Create Custom Plan');

  await page.fill('textarea#meal-text', 'Breakfast: eggs');
  await page.click('button:has-text("Parse Meals")');

  // Wait for image
  const img = page.locator('img[alt*="eggs"]');
  await expect(img).toBeVisible();

  // Verify image loaded (not broken)
  const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
});
```

---

## ⚠️ QA Risks & Mitigations

**RISK-006: Manual Meal Plan Parser Accuracy**
- **Mitigation:** 100+ parser test cases covering common formats
- **Mitigation:** Manual category override always available
- **Mitigation:** Preview before save allows correction

**RISK-002: Category Image Pool Unavailability**
- **Mitigation:** Health check endpoint to verify image pool
- **Mitigation:** Graceful fallback to placeholder images
- **Mitigation:** Consider caching images to S3 (Phase 2)

---

## ✅ Definition of Done

- [ ] All 10 acceptance criteria met
- [ ] Unit tests passing (50+ tests)
- [ ] Integration tests passing (10+ tests)
- [ ] E2E tests passing (15+ tests)
- [ ] Code review completed
- [ ] QA manual testing completed
- [ ] Performance benchmarks met (< 2 seconds)
- [ ] Zero OpenAI API usage verified
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] PO acceptance sign-off

---

## 📊 Success Metrics

**KPIs:**
- Trainer adoption rate > 10% (first week)
- Manual meal plan creation time < 2 minutes average
- Zero OpenAI API costs for manual plans
- User satisfaction score > 4/5

**Monitoring:**
- Track manual vs AI meal plan creation ratio
- Monitor category image pool health daily
- Track parser accuracy for common meal names
- Monitor manual meal plan assignment success rate

---

## 🚀 Deployment Plan

**Phase 0 (Week 1):**
1. Deploy category image pool configuration
2. Deploy manual meal plan service
3. Deploy API endpoint
4. Deploy frontend component
5. Run comprehensive tests
6. Deploy to staging
7. User acceptance testing
8. Deploy to production

**Rollback Plan:**
- Feature flag: `MANUAL_MEAL_PLANS_ENABLED` (can disable if issues)
- Database: No schema changes (uses existing trainerMealPlans table)
- Quick rollback: Revert code deployment + disable feature flag

---

**Story Status:** READY FOR IMPLEMENTATION
**Next Step:** Begin Phase 0 development
**Estimated Completion:** 1-2 days from start
