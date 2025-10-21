# Meal Plan Generator - Comprehensive Test Protocol

**Created**: 2025-01-13
**BMAD Agent**: Test Architect (Quinn)
**Purpose**: Comprehensive testing strategy for 6 critical bugs in Admin Meal Plan Generator
**Test Categories**: 6 categories, 56 total tests
**Estimated Execution Time**: 2-3 hours

---

## 📋 TEST OVERVIEW

### Test Pyramid

```
        E2E Tests (6)
       ╱              ╲
    Integration (12)
   ╱                    ╲
 Unit Tests (38)
```

### Test Coverage Map

| Bug ID | Category | Unit | Integration | E2E | Total |
|--------|----------|------|-------------|-----|-------|
| 1 | Image Generation | 8 | 2 | 1 | 11 |
| 2 | Natural Language | 10 | 3 | 1 | 14 |
| 3 | Diet Type Field | 6 | 1 | 1 | 8 |
| 4 | Filter Duplication | 4 | 0 | 1 | 5 |
| 5 | Button Functionality | 8 | 4 | 1 | 13 |
| 6 | Bulk Generator | 2 | 2 | 1 | 5 |
| **TOTAL** | | **38** | **12** | **6** | **56** |

---

## 🧪 CATEGORY 1: IMAGE GENERATION TESTS

### Objective
Verify that DALL-E 3 image generation produces unique images for each meal card in generated plans

### Root Cause Analysis
- **Hypothesis**: Meal plan generation may not be calling image generation service
- **Alternative**: Image URLs cached or reused from previous recipes
- **Location**: `server/services/intelligentMealPlanGenerator.ts` or meal plan API endpoint

### Unit Tests (8)

#### Test 1.1: Image URL Uniqueness in Recipe Data
```typescript
// File: test/unit/services/imageGeneration.test.ts
describe('Image Generation Uniqueness', () => {
  it('should generate unique image URLs for different recipes', async () => {
    const recipe1 = await recipeGenerator.generate({ name: 'Grilled Chicken' });
    const recipe2 = await recipeGenerator.generate({ name: 'Salmon Salad' });

    expect(recipe1.imageUrl).toBeDefined();
    expect(recipe2.imageUrl).toBeDefined();
    expect(recipe1.imageUrl).not.toBe(recipe2.imageUrl);
  });
});
```

#### Test 1.2: DALL-E Prompt Includes Recipe-Specific Details
```typescript
it('should create unique DALL-E prompts per recipe', () => {
  const recipe = {
    name: 'Grilled Chicken',
    description: 'Herb-marinated chicken breast',
    mealTypes: ['lunch']
  };

  const prompt = imageAgent.createImagePrompt(recipe);

  expect(prompt).toContain('Grilled Chicken');
  expect(prompt).toContain('Herb-marinated');
  expect(prompt).toContain('lunch');
});
```

#### Test 1.3: Perceptual Hash Uniqueness
```typescript
it('should generate different perceptual hashes for different images', async () => {
  const hash1 = await imageAgent.generateSimilarityHash('url1', 'Recipe 1');
  const hash2 = await imageAgent.generateSimilarityHash('url2', 'Recipe 2');

  expect(hash1).not.toBe(hash2);
  expect(hash1).toHaveLength(16); // Standard hash length
});
```

#### Test 1.4: Duplicate Detection Triggers Retry
```typescript
it('should retry image generation when duplicate detected', async () => {
  const spy = vi.spyOn(imageAgent, 'generateUniqueImage');

  // First call returns duplicate
  await imageAgent.process({recipes: [recipe1]});

  expect(spy).toHaveBeenCalledTimes(2); // Original + 1 retry
});
```

#### Test 1.5: Placeholder Fallback on API Failure
```typescript
it('should use placeholder when DALL-E fails', async () => {
  vi.mocked(openai.images.generate).mockRejectedValue(new Error('API Error'));

  const result = await imageAgent.generateUniqueImage(recipe);

  expect(result.isPlaceholder).toBe(true);
  expect(result.imageUrl).toContain('unsplash');
});
```

#### Test 1.6: Image Metadata Stored Correctly
```typescript
it('should store image hash and metadata in database', async () => {
  await imageAgent.storeImageHash(recipe.id, 'hash123', 'url', 'prompt');

  const stored = await db.query.recipeImageHashes.findFirst({
    where: eq(recipeImageHashes.recipeId, recipe.id)
  });

  expect(stored.similarityHash).toBe('hash123');
  expect(stored.imageUrl).toBe('url');
});
```

#### Test 1.7: Meal Plan Recipes Include Image URLs
```typescript
it('should include imageUrl in meal plan recipes', async () => {
  const mealPlan = await generateMealPlan({
    planName: 'Test Plan',
    dailyCalorieTarget: 2000,
    days: 1,
    mealsPerDay: 3
  });

  mealPlan.meals.forEach(meal => {
    expect(meal.recipe.imageUrl).toBeDefined();
    expect(meal.recipe.imageUrl).toContain('http');
  });
});
```

#### Test 1.8: Image Generation Performance
```typescript
it('should generate images within acceptable time (< 5s per recipe)', async () => {
  const startTime = Date.now();
  await imageAgent.generateUniqueImage(recipe);
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(5000);
});
```

### Integration Tests (2)

#### Test 1.9: End-to-End Meal Plan with Unique Images
```typescript
// File: test/integration/mealPlanImageGeneration.test.ts
it('should generate meal plan with unique images for all meals', async () => {
  const response = await apiRequest('/api/meal-plans/generate', {
    method: 'POST',
    body: {
      planName: 'Test Plan',
      days: 3,
      mealsPerDay: 3
    }
  });

  const mealPlan = await response.json();
  const imageUrls = mealPlan.meals.map(m => m.recipe.imageUrl);

  // All meals should have images
  expect(imageUrls.every(url => url)).toBe(true);

  // All images should be unique
  const uniqueUrls = new Set(imageUrls);
  expect(uniqueUrls.size).toBe(imageUrls.length);
});
```

#### Test 1.10: BMAD Bulk Generation Image Uniqueness
```typescript
it('should generate unique images in BMAD bulk generation', async () => {
  const response = await apiRequest('/api/admin/generate-bmad', {
    method: 'POST',
    body: { count: 5, enableImageGeneration: true }
  });

  await waitForBatchCompletion(response.batchId);

  const recipes = await db.query.recipes.findMany({
    where: eq(recipes.batchId, response.batchId)
  });

  const imageUrls = recipes.map(r => r.imageUrl);
  const uniqueUrls = new Set(imageUrls);
  expect(uniqueUrls.size).toBe(5);
});
```

### E2E Tests (1)

#### Test 1.11: Visual Verification of Meal Plan Images
```typescript
// File: test/e2e/meal-plan-images.spec.ts
test('Admin meal plan shows unique images for each meal card', async ({ page }) => {
  await page.goto('http://localhost:4000/admin');
  await login(page, 'admin@fitmeal.pro', 'AdminPass123');

  // Navigate to meal plan generator
  await page.click('text=Meal Plan Generator');

  // Fill form
  await page.fill('[name="planName"]', 'Visual Test Plan');
  await page.selectOption('[name="fitnessGoal"]', 'weight_loss');
  await page.fill('[name="dailyCalorieTarget"]', '2000');

  // Generate plan
  await page.click('button:has-text("Generate Meal Plan")');
  await page.waitForSelector('.meal-card', { timeout: 30000 });

  // Get all meal card images
  const images = await page.$$eval('.meal-card img', imgs =>
    imgs.map(img => img.src)
  );

  // Verify uniqueness
  const uniqueImages = new Set(images);
  expect(uniqueImages.size).toBe(images.length);
  expect(images.length).toBeGreaterThan(3);
});
```

---

## 🗣️ CATEGORY 2: NATURAL LANGUAGE GENERATOR TESTS

### Objective
Verify AI-Powered Natural Language Generator creates meal plans (not recipes) based on admin prompts

### Root Cause Analysis
- **Issue**: Natural language endpoint calling recipe generation instead of meal plan generation
- **Location**: `server/routes/adminRoutes.ts:181-247` - `/generate-from-prompt` endpoint
- **Fix**: Endpoint should call `intelligentMealPlanGenerator` not `bmadRecipeService`

### Unit Tests (10)

#### Test 2.1: Parse "vegetarian weight loss plan"
```typescript
// File: test/unit/services/naturalLanguageMealPlan.test.ts
describe('Natural Language Meal Plan Parser', () => {
  it('should extract diet type from natural language', async () => {
    const result = await parseNaturalLanguageMealPlan(
      "I need a vegetarian meal plan for weight loss"
    );

    expect(result.dietaryRestrictions).toContain('vegetarian');
    expect(result.fitnessGoal).toBe('weight_loss');
    expect(result.type).toBe('mealPlan'); // NOT 'recipe'
  });
});
```

#### Test 2.2: Parse "2000 calorie keto plan"
```typescript
it('should extract calorie target from natural language', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "Create a 2000 calorie keto meal plan"
  );

  expect(result.dailyCalorieTarget).toBe(2000);
  expect(result.dietaryRestrictions).toContain('keto');
});
```

#### Test 2.3: Parse "7-day muscle building plan"
```typescript
it('should extract duration and fitness goal', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "I want a 7-day meal plan for muscle building"
  );

  expect(result.days).toBe(7);
  expect(result.fitnessGoal).toBe('muscle_gain');
});
```

#### Test 2.4: Parse "3 meals per day"
```typescript
it('should extract meals per day', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "Create a plan with 3 meals per day"
  );

  expect(result.mealsPerDay).toBe(3);
});
```

#### Test 2.5: Default Values for Incomplete Prompts
```typescript
it('should provide sensible defaults for incomplete prompts', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "Make me a meal plan"
  );

  expect(result.days).toBe(7); // Default
  expect(result.mealsPerDay).toBe(3); // Default
  expect(result.dailyCalorieTarget).toBe(2000); // Default
});
```

#### Test 2.6: Multiple Dietary Restrictions
```typescript
it('should parse multiple dietary restrictions', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "Vegan and gluten-free meal plan"
  );

  expect(result.dietaryRestrictions).toContain('vegan');
  expect(result.dietaryRestrictions).toContain('gluten-free');
});
```

#### Test 2.7: Fitness Goal Mapping
```typescript
it('should map natural language to fitness goal enums', async () => {
  const testCases = [
    { input: 'lose weight', expected: 'weight_loss' },
    { input: 'build muscle', expected: 'muscle_gain' },
    { input: 'maintain weight', expected: 'maintenance' },
    { input: 'get fit', expected: 'general_fitness' }
  ];

  for (const { input, expected } of testCases) {
    const result = await parseNaturalLanguageMealPlan(input);
    expect(result.fitnessGoal).toBe(expected);
  }
});
```

#### Test 2.8: Error Handling for Invalid Prompts
```typescript
it('should handle empty or invalid prompts gracefully', async () => {
  await expect(parseNaturalLanguageMealPlan('')).rejects.toThrow();
  await expect(parseNaturalLanguageMealPlan('xyz123')).resolves.toBeDefined();
});
```

#### Test 2.9: Prompt Includes Client Name
```typescript
it('should extract client name if mentioned', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "Create a meal plan for John Doe"
  );

  expect(result.clientName).toBe('John Doe');
});
```

#### Test 2.10: Context-Aware Parsing
```typescript
it('should understand context from admin role', async () => {
  const result = await parseNaturalLanguageMealPlan(
    "Generate 5 high-protein plans for my clients",
    { role: 'admin' }
  );

  expect(result.count).toBe(5);
  expect(result.dietaryRestrictions).toContain('high-protein');
  expect(result.type).toBe('mealPlan');
});
```

### Integration Tests (3)

#### Test 2.11: Natural Language API Endpoint Returns Meal Plan
```typescript
// File: test/integration/naturalLanguageMealPlan.integration.test.ts
it('should generate meal plan from natural language prompt', async () => {
  const response = await apiRequest('/api/admin/generate-from-prompt', {
    method: 'POST',
    body: { prompt: 'Create a vegetarian weight loss plan' },
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  expect(response.status).toBe(202);
  const data = await response.json();

  expect(data.parsedParameters.type).toBe('mealPlan');
  expect(data.parsedParameters.dietaryRestrictions).toContain('vegetarian');
});
```

#### Test 2.12: Generated Plan Matches Prompt Parameters
```typescript
it('should generate plan matching natural language parameters', async () => {
  const response = await apiRequest('/api/admin/generate-from-prompt', {
    method: 'POST',
    body: { prompt: '2000 calorie keto plan for 5 days' }
  });

  const { batchId } = await response.json();
  await waitForBatchCompletion(batchId);

  const mealPlan = await db.query.personalizedMealPlans.findFirst({
    where: eq(personalizedMealPlans.batchId, batchId)
  });

  expect(mealPlan.dailyCalorieTarget).toBe(2000);
  expect(mealPlan.days).toBe(5);
  expect(mealPlan.fitnessGoal).toContain('keto');
});
```

#### Test 2.13: Admin Authorization Required
```typescript
it('should require admin role for natural language generation', async () => {
  const trainerToken = await getAuthToken('trainer');

  const response = await apiRequest('/api/admin/generate-from-prompt', {
    method: 'POST',
    body: { prompt: 'Create a meal plan' },
    headers: { 'Authorization': `Bearer ${trainerToken}` }
  });

  expect(response.status).toBe(403);
});
```

### E2E Tests (1)

#### Test 2.14: UI Natural Language Meal Plan Generation
```typescript
// File: test/e2e/natural-language-generator.spec.ts
test('Admin can generate meal plan using natural language', async ({ page }) => {
  await page.goto('http://localhost:4000/admin');
  await login(page, 'admin@fitmeal.pro', 'AdminPass123');

  // Toggle natural language mode
  await page.click('button:has-text("Natural Language")');

  // Enter prompt
  await page.fill('[data-testid="natural-language-input"]',
    'Create a 2500 calorie vegan muscle building plan for 7 days'
  );

  // Generate
  await page.click('button:has-text("Generate")');
  await page.waitForSelector('.meal-plan-result', { timeout: 30000 });

  // Verify plan details
  await expect(page.locator('text=2500 cal/day')).toBeVisible();
  await expect(page.locator('text=muscle')).toBeVisible();

  // Count meals (7 days × meals per day)
  const mealCards = await page.$$('.meal-card');
  expect(mealCards.length).toBeGreaterThanOrEqual(21); // 7 days × 3 meals
});
```

---

## 🍽️ CATEGORY 3: DIET TYPE FIELD TESTS

### Objective
Verify diet type field exists in advanced form and integrates with meal plan generation

### Unit Tests (6)

#### Test 3.1: Diet Type Field Renders
```typescript
// File: test/unit/components/MealPlanGeneratorForm.test.tsx
describe('Diet Type Field', () => {
  it('should render diet type select field in advanced form', () => {
    render(<MealPlanGenerator />);

    expect(screen.getByLabelText('Diet Type')).toBeInTheDocument();
  });
});
```

#### Test 3.2: Diet Type Options Available
```typescript
it('should show all diet type options', async () => {
  render(<MealPlanGenerator />);

  const select = screen.getByLabelText('Diet Type');
  await userEvent.click(select);

  expect(screen.getByText('Vegetarian')).toBeInTheDocument();
  expect(screen.getByText('Vegan')).toBeInTheDocument();
  expect(screen.getByText('Keto')).toBeInTheDocument();
  expect(screen.getByText('Paleo')).toBeInTheDocument();
  expect(screen.getByText('Gluten Free')).toBeInTheDocument();
});
```

#### Test 3.3: Diet Type Selection Updates Form State
```typescript
it('should update form state when diet type selected', async () => {
  const { result } = renderHook(() => useForm());

  render(<MealPlanGenerator />);

  await userEvent.click(screen.getByLabelText('Diet Type'));
  await userEvent.click(screen.getByText('Vegetarian'));

  const formData = result.current.getValues();
  expect(formData.dietaryRestrictions).toContain('vegetarian');
});
```

#### Test 3.4: Form Submission Includes Diet Type
```typescript
it('should include diet type in form submission', async () => {
  const onSubmit = vi.fn();
  render(<MealPlanGenerator onSubmit={onSubmit} />);

  await userEvent.selectOptions(screen.getByLabelText('Diet Type'), 'keto');
  await userEvent.click(screen.getByText('Generate Meal Plan'));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      dietaryRestrictions: expect.arrayContaining(['keto'])
    })
  );
});
```

#### Test 3.5: Diet Type Validation
```typescript
it('should allow optional diet type (no validation error)', async () => {
  render(<MealPlanGenerator />);

  await userEvent.click(screen.getByText('Generate Meal Plan'));

  // Should not show validation error for diet type
  expect(screen.queryByText(/diet type.*required/i)).not.toBeInTheDocument();
});
```

#### Test 3.6: Multiple Diet Types Not Allowed
```typescript
it('should only allow single diet type selection', async () => {
  render(<MealPlanGenerator />);

  const select = screen.getByLabelText('Diet Type');
  expect(select).not.toHaveAttribute('multiple');
});
```

### Integration Tests (1)

#### Test 3.7: Meal Plan Generation with Diet Type
```typescript
// File: test/integration/dietTypeMealPlan.test.ts
it('should generate meal plan respecting diet type', async () => {
  const response = await apiRequest('/api/meal-plans/generate', {
    method: 'POST',
    body: {
      planName: 'Vegan Plan',
      dietaryRestrictions: ['vegan'],
      dailyCalorieTarget: 2000,
      days: 1,
      mealsPerDay: 3
    }
  });

  const mealPlan = await response.json();

  // Verify all recipes are vegan
  mealPlan.meals.forEach(meal => {
    expect(meal.recipe.dietaryTags).toContain('vegan');
  });
});
```

### E2E Tests (1)

#### Test 3.8: UI Diet Type Integration
```typescript
// File: test/e2e/diet-type-field.spec.ts
test('Admin can select diet type and generate appropriate meal plan', async ({ page }) => {
  await page.goto('http://localhost:4000/admin');
  await login(page, 'admin@fitmeal.pro', 'AdminPass123');

  // Select diet type
  await page.selectOption('[name="dietaryRestrictions"]', 'vegetarian');

  // Fill other fields
  await page.fill('[name="planName"]', 'Vegetarian Test Plan');
  await page.selectOption('[name="fitnessGoal"]', 'weight_loss');

  // Generate
  await page.click('button:has-text("Generate Meal Plan")');
  await page.waitForSelector('.meal-plan-result');

  // Verify all meals show vegetarian badge
  const vegBadges = await page.$$('text=Vegetarian');
  expect(vegBadges.length).toBeGreaterThan(0);
});
```

---

## 🔍 CATEGORY 4: FILTER DUPLICATION TESTS

### Objective
Verify no duplicate filter fields exist between main form and "Filter Preferences" section

### Unit Tests (4)

#### Test 4.1: No Duplicate Meal Type Fields
```typescript
// File: test/unit/components/MealPlanFilterDuplication.test.tsx
describe('Filter Field Duplication', () => {
  it('should have only one meal type selector', () => {
    render(<MealPlanGenerator />);

    const mealTypeFields = screen.getAllByLabelText(/meal type/i);
    expect(mealTypeFields).toHaveLength(1);
  });
});
```

#### Test 4.2: No Duplicate Dietary Fields
```typescript
it('should have only one dietary/diet type selector', () => {
  render(<MealPlanGenerator />);

  const dietFields = screen.getAllByLabelText(/diet/i);
  expect(dietFields).toHaveLength(1); // Either "Dietary" or "Diet Type"
});
```

#### Test 4.3: No Duplicate Calorie Fields
```typescript
it('should have only one calorie input field', () => {
  render(<MealPlanGenerator />);

  const calorieFields = screen.getAllByLabelText(/calorie/i);

  // Should have dailyCalorieTarget (required) but not maxCalories filter
  expect(calorieFields).toHaveLength(1);
  expect(calorieFields[0]).toHaveAttribute('name', 'dailyCalorieTarget');
});
```

#### Test 4.4: Single Source of Truth for Filters
```typescript
it('should use form state as single source for all filters', () => {
  const { result } = renderHook(() => useForm<MealPlanGeneration>());

  render(<MealPlanGenerator />);

  // Change meal type
  fireEvent.change(screen.getByLabelText(/meal type/i), {
    target: { value: 'breakfast' }
  });

  // Should only update once in form state
  const formData = result.current.getValues();
  expect(formData.mealType).toBe('breakfast');
});
```

### E2E Tests (1)

#### Test 4.5: Visual Verification No Duplicate Sections
```typescript
// File: test/e2e/filter-duplication.spec.ts
test('Meal plan generator shows no duplicate filter sections', async ({ page }) => {
  await page.goto('http://localhost:4000/admin');
  await login(page, 'admin@fitmeal.pro', 'AdminPass123');

  // Check for "Filter Preferences" heading
  const filterHeadings = await page.$$('text=Filter Preferences');

  // Should either not exist or be part of main form (not separate section)
  if (filterHeadings.length > 0) {
    // If it exists, verify it's not duplicating main form fields
    const mealTypeSelectors = await page.$$('select[name="mealType"]');
    expect(mealTypeSelectors).toHaveLength(1);
  }
});
```

---

## 🔘 CATEGORY 5: BUTTON FUNCTIONALITY TESTS

### Objective
Verify all 5 buttons work correctly: Save to Library, Assign to Customers, Refresh List, Export PDF, and Cal/Day display

### Unit Tests (8)

#### Test 5.1: Save to Library Button Exists
```typescript
// File: test/unit/components/MealPlanButtons.test.tsx
describe('Meal Plan Action Buttons', () => {
  it('should render Save to Library button when meal plan generated', () => {
    render(<MealPlanGenerator />, {
      initialState: { generatedPlan: mockMealPlan }
    });

    expect(screen.getByText(/save to library/i)).toBeInTheDocument();
  });
});
```

#### Test 5.2: Save to Library Mutation Defined
```typescript
it('should have saveMealPlan mutation hook', () => {
  const { result } = renderHook(() => useMealPlanMutations());

  expect(result.current.saveMealPlan).toBeDefined();
  expect(typeof result.current.saveMealPlan.mutate).toBe('function');
});
```

#### Test 5.3: Save to Library Success Toast
```typescript
it('should show success toast when plan saved', async () => {
  const mockToast = vi.fn();
  vi.mocked(useToast).mockReturnValue({ toast: mockToast });

  render(<MealPlanGenerator />);

  await userEvent.click(screen.getByText(/save to library/i));

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Meal Plan Saved!',
      })
    );
  });
});
```

#### Test 5.4: Assign to Customers Opens Modal
```typescript
it('should open assignment modal when button clicked', async () => {
  render(<MealPlanGenerator />);

  await userEvent.click(screen.getByText(/assign to customers/i));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText(/select customers/i)).toBeInTheDocument();
});
```

#### Test 5.5: Refresh List Triggers Re-render
```typescript
it('should increment refresh key when refresh clicked', async () => {
  const { result } = renderHook(() => useState(0));

  render(<MealPlanGenerator />);

  const initialKey = result.current[0];

  await userEvent.click(screen.getByText(/refresh list/i));

  expect(result.current[0]).toBe(initialKey + 1);
});
```

#### Test 5.6: Export PDF Component Renders
```typescript
it('should render EvoFitPDFExport component', () => {
  render(<MealPlanGenerator />, {
    initialState: { generatedPlan: mockMealPlan }
  });

  expect(screen.getByText(/export.*pdf/i)).toBeInTheDocument();
});
```

#### Test 5.7: Cal/Day Badge Displays Correctly
```typescript
it('should display daily calorie target badge', () => {
  render(<MealPlanGenerator />, {
    initialState: {
      generatedPlan: {
        mealPlan: { dailyCalorieTarget: 2500 }
      }
    }
  });

  expect(screen.getByText(/2500 cal\/day/i)).toBeInTheDocument();
});
```

#### Test 5.8: Buttons Only Show for Trainer/Admin
```typescript
it('should only show Save/Assign buttons for trainer or admin', () => {
  const { rerender } = render(<MealPlanGenerator />, {
    user: { role: 'customer' }
  });

  expect(screen.queryByText(/save to library/i)).not.toBeInTheDocument();

  rerender(<MealPlanGenerator />, {
    user: { role: 'admin' }
  });

  expect(screen.getByText(/save to library/i)).toBeInTheDocument();
});
```

### Integration Tests (4)

#### Test 5.9: Save Meal Plan API Integration
```typescript
// File: test/integration/saveMealPlan.test.ts
it('should save meal plan to database via API', async () => {
  const response = await apiRequest('/api/trainer/meal-plans', {
    method: 'POST',
    body: {
      mealPlanData: mockMealPlan,
      notes: 'Test plan',
      tags: []
    },
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  expect(response.status).toBe(201);

  const savedPlan = await db.query.trainerMealPlans.findFirst({
    where: eq(trainerMealPlans.planName, mockMealPlan.planName)
  });

  expect(savedPlan).toBeDefined();
});
```

#### Test 5.10: Assignment Modal Customer List
```typescript
it('should load customer list in assignment modal', async () => {
  const response = await apiRequest('/api/trainer/customers', {
    headers: { 'Authorization': `Bearer ${trainerToken}` }
  });

  const customers = await response.json();
  expect(customers.length).toBeGreaterThan(0);
});
```

#### Test 5.11: PDF Export Generates Valid PDF
```typescript
it('should generate valid PDF document', async () => {
  const response = await apiRequest('/api/pdf/export/meal-plan/123', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/pdf');

  const blob = await response.blob();
  expect(blob.size).toBeGreaterThan(0);
});
```

#### Test 5.12: Refresh Invalidates Query Cache
```typescript
it('should invalidate recipe queries when refreshed', async () => {
  const queryClient = new QueryClient();
  const spy = vi.spyOn(queryClient, 'invalidateQueries');

  render(<MealPlanGenerator />, { queryClient });

  await userEvent.click(screen.getByText(/refresh list/i));

  expect(spy).toHaveBeenCalledWith({ queryKey: ['/api/recipes'] });
});
```

### E2E Tests (1)

#### Test 5.13: All Buttons Work in UI
```typescript
// File: test/e2e/meal-plan-buttons.spec.ts
test('All meal plan action buttons function correctly', async ({ page }) => {
  await page.goto('http://localhost:4000/admin');
  await login(page, 'admin@fitmeal.pro', 'AdminPass123');

  // Generate plan first
  await generateTestMealPlan(page);

  // Test Save to Library
  await page.click('button:has-text("Save to Library")');
  await expect(page.locator('text=Meal Plan Saved')).toBeVisible();

  // Test Assign to Customers
  await page.click('button:has-text("Assign to Customers")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.click('[aria-label="Close"]');

  // Test Refresh List
  const initialMeals = await page.$$('.meal-card');
  await page.click('button:has-text("Refresh List")');
  await page.waitForTimeout(500);

  // Test Export PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export")'),
  ]);
  expect(download.suggestedFilename()).toContain('.pdf');

  // Verify Cal/Day display
  await expect(page.locator('text=/\\d+ cal\\/day/i')).toBeVisible();
});
```

---

## 🎛️ CATEGORY 6: BULK GENERATOR DIET TYPE TESTS

### Objective
Verify BMAD bulk generator (4th admin tab) has diet type selection option

### Unit Tests (2)

#### Test 6.1: Diet Type Field in BMAD Generator Form
```typescript
// File: test/unit/components/BMADRecipeGenerator.test.tsx
describe('BMAD Bulk Generator Diet Type', () => {
  it('should render dietary restrictions field', () => {
    render(<BMADRecipeGenerator />);

    expect(screen.getByLabelText(/dietary.*restrictions/i)).toBeInTheDocument();
  });
});
```

#### Test 6.2: Diet Type Multi-Select Options
```typescript
it('should allow multiple diet type selections', async () => {
  render(<BMADRecipeGenerator />);

  const select = screen.getByLabelText(/dietary.*restrictions/i);
  await userEvent.click(select);

  // Should show multi-select options
  expect(screen.getByRole('option', { name: 'Vegetarian' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Vegan' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Keto' })).toBeInTheDocument();
});
```

### Integration Tests (2)

#### Test 6.3: BMAD Generation with Diet Type
```typescript
// File: test/integration/bmadBulkDietType.test.ts
it('should generate recipes with selected diet types', async () => {
  const response = await apiRequest('/api/admin/generate-bmad', {
    method: 'POST',
    body: {
      count: 5,
      dietaryRestrictions: ['vegetarian', 'gluten-free']
    },
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  const { batchId } = await response.json();
  await waitForBatchCompletion(batchId);

  const recipes = await db.query.recipes.findMany({
    where: eq(recipes.batchId, batchId)
  });

  // All recipes should be vegetarian AND gluten-free
  recipes.forEach(recipe => {
    expect(recipe.dietaryTags).toContain('vegetarian');
    expect(recipe.dietaryTags).toContain('gluten-free');
  });
});
```

#### Test 6.4: Diet Type Persists Through Generation
```typescript
it('should maintain diet type selection throughout generation process', async () => {
  const options = {
    count: 3,
    dietaryRestrictions: ['vegan']
  };

  const response = await apiRequest('/api/admin/generate-bmad', {
    method: 'POST',
    body: options
  });

  const { batchId } = await response.json();

  // Check progress
  const progress = await apiRequest(`/api/admin/bmad-progress/${batchId}`);
  const progressData = await progress.json();

  expect(progressData.options.dietaryRestrictions).toContain('vegan');
});
```

### E2E Tests (1)

#### Test 6.5: BMAD UI Diet Type Integration
```typescript
// File: test/e2e/bmad-bulk-diet-type.spec.ts
test('BMAD bulk generator respects diet type selection', async ({ page }) => {
  await page.goto('http://localhost:4000/admin');
  await login(page, 'admin@fitmeal.pro', 'AdminPass123');

  // Navigate to BMAD Generator (4th tab)
  await page.click('button:has-text("BMAD Generator")');

  // Select diet types
  await page.click('[data-testid="dietary-restrictions-select"]');
  await page.click('text=Vegetarian');
  await page.click('text=Keto');

  // Set count
  await page.fill('[name="count"]', '3');

  // Generate
  await page.click('button:has-text("Start BMAD Generation")');

  // Wait for completion
  await page.waitForSelector('text=Generation Complete', { timeout: 60000 });

  // Verify recipes have correct tags
  await page.click('button:has-text("Recipe Library")');

  const vegBadges = await page.$$('text=Vegetarian');
  const ketoBadges = await page.$$('text=Keto');

  expect(vegBadges.length).toBeGreaterThanOrEqual(3);
  expect(ketoBadges.length).toBeGreaterThanOrEqual(3);
});
```

---

## 🎯 TEST EXECUTION PLAN

### Phase 1: Unit Tests (1 hour)

```bash
# Run all unit tests by category
npm run test:unit -- --grep "Image Generation"
npm run test:unit -- --grep "Natural Language"
npm run test:unit -- --grep "Diet Type"
npm run test:unit -- --grep "Filter Duplication"
npm run test:unit -- --grep "Button Functionality"
npm run test:unit -- --grep "BMAD.*Diet Type"

# Or run all at once
npm run test:unit -- test/unit/components/MealPlanGenerator.comprehensive.test.tsx
```

### Phase 2: Integration Tests (30 minutes)

```bash
npm run test:integration -- --grep "meal.*plan.*image"
npm run test:integration -- --grep "natural.*language"
npm run test:integration -- --grep "diet.*type"
npm run test:integration -- --grep "save.*meal.*plan"
npm run test:integration -- --grep "bmad.*diet"
```

### Phase 3: E2E Tests (30 minutes)

```bash
npx playwright test test/e2e/meal-plan-images.spec.ts
npx playwright test test/e2e/natural-language-generator.spec.ts
npx playwright test test/e2e/diet-type-field.spec.ts
npx playwright test test/e2e/filter-duplication.spec.ts
npx playwright test test/e2e/meal-plan-buttons.spec.ts
npx playwright test test/e2e/bmad-bulk-diet-type.spec.ts
```

---

## ✅ ACCEPTANCE CRITERIA

### All tests must pass with:
- **Unit Tests**: 100% pass rate (38/38)
- **Integration Tests**: 100% pass rate (12/12)
- **E2E Tests**: 100% pass rate (6/6)

### Manual Verification Checklist:
- [ ] Generate meal plan - all meals have unique images
- [ ] Use natural language - "vegetarian weight loss plan" generates meal plan (not recipes)
- [ ] Advanced form has Diet Type field with all options
- [ ] No duplicate filter fields visible in UI
- [ ] Save to Library button works and shows success toast
- [ ] Assign to Customers opens modal with customer list
- [ ] Refresh List re-renders meal plan
- [ ] Export PDF generates downloadable PDF
- [ ] Cal/Day badge displays correct value
- [ ] BMAD Generator has dietary restrictions field
- [ ] Bulk generated recipes respect diet type

---

## 📊 COVERAGE GOALS

| Category | Target Coverage | Actual Coverage |
|----------|----------------|-----------------|
| Image Generation | 90%+ | TBD |
| Natural Language | 85%+ | TBD |
| Form Fields | 95%+ | TBD |
| Buttons | 90%+ | TBD |
| BMAD Generator | 85%+ | TBD |
| **OVERALL** | **90%+** | **TBD** |

---

**Test Protocol Status**: READY FOR IMPLEMENTATION
**Next Action**: Begin writing unit tests (Category 1: Image Generation)
