# Trainer Custom Meals - Test Strategy

**Feature:** Trainer Custom Meal Creation Enhancement
**Test Lead:** QA Agent (Quinn)
**Risk Level:** HIGH
**Created:** 2025-01-15

---

## Test Coverage Matrix

| Component | Unit Tests | Integration Tests | E2E Tests | Priority |
|-----------|-----------|-------------------|-----------|----------|
| Enhanced Parser | ✅ 15 tests | ✅ 3 tests | ✅ 2 tests | P0 |
| Image Generation | ✅ 10 tests | ✅ 4 tests | ✅ 2 tests | P0 |
| Custom Meals CRUD | ✅ 12 tests | ✅ 6 tests | ✅ 3 tests | P1 |
| Saved Plans Fix | ✅ 5 tests | ✅ 2 tests | ✅ 2 tests | P0 |
| Parse Button Fix | ✅ 3 tests | ✅ 2 tests | ✅ 1 test | P0 |

**Total Tests:** 45 unit + 17 integration + 10 E2E = **72 tests**

---

## Unit Tests (45 tests)

### 1. Enhanced Parser Tests (15 tests)

**File:** `test/unit/services/manualMealPlanService.enhanced.test.ts`

```typescript
describe('ManualMealPlanService - Enhanced Parser', () => {
  describe('Format Detection', () => {
    test('detects simple format', () => {
      const text = 'Breakfast: Oatmeal\nLunch: Chicken salad';
      expect(service.detectFormat(text)).toBe('simple');
    });

    test('detects structured format with Meal headers', () => {
      const text = 'Meal 1\n-175g of rice\n-100g chicken';
      expect(service.detectFormat(text)).toBe('structured');
    });

    test('detects structured format with measurements', () => {
      const text = '4 eggs\n2 pieces of bread';
      expect(service.detectFormat(text)).toBe('structured');
    });
  });

  describe('Structured Format Parsing', () => {
    test('parses meal with gram measurements', () => {
      const text = 'Meal 1\n-175g of Jasmine Rice\n-150g of beef';
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(1);
      expect(meals[0].ingredients).toEqual([
        {amount: '175', unit: 'g', ingredient: 'Jasmine Rice'},
        {amount: '150', unit: 'g', ingredient: 'beef'}
      ]);
    });

    test('parses meal with unit counts', () => {
      const text = 'Meal 1\n-4 eggs\n-2 pieces of bread';
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients).toEqual([
        {amount: '4', unit: 'unit', ingredient: 'eggs'},
        {amount: '2', unit: 'unit', ingredient: 'pieces of bread'}
      ]);
    });

    test('parses meal with ml/l measurements', () => {
      const text = 'Meal 1\n-250ml of coconut water\n-1l of milk';
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients[0].unit).toBe('ml');
      expect(meals[0].ingredients[1].unit).toBe('l');
    });

    test('handles "of" keyword in ingredients', () => {
      const text = 'Meal 1\n-175g of Jasmine Rice';
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients[0].ingredient).toBe('Jasmine Rice');
    });

    test('parses multiple meals', () => {
      const text = `
        Meal 1
        -175g of rice
        -100g chicken

        Meal 2
        -4 eggs
        -2 bread
      `;
      const meals = service.parseMealEntries(text);

      expect(meals).toHaveLength(2);
    });
  });

  describe('Meal Name Generation', () => {
    test('generates name from single ingredient', () => {
      const ingredients = [{ingredient: 'Oatmeal'}];
      expect(service.generateMealName(ingredients)).toBe('Oatmeal');
    });

    test('generates name from two ingredients', () => {
      const ingredients = [
        {ingredient: 'Rice'},
        {ingredient: 'Chicken'}
      ];
      expect(service.generateMealName(ingredients)).toBe('Rice and Chicken');
    });

    test('generates name from three ingredients', () => {
      const ingredients = [
        {ingredient: 'Rice'},
        {ingredient: 'Chicken'},
        {ingredient: 'Broccoli'}
      ];
      expect(service.generateMealName(ingredients)).toBe('Rice, Chicken, and Broccoli');
    });
  });

  describe('Category Detection from Ingredients', () => {
    test('detects breakfast from eggs', () => {
      const ingredients = [{ingredient: 'eggs'}, {ingredient: 'toast'}];
      expect(service.detectCategoryFromIngredients(ingredients)).toBe('breakfast');
    });

    test('detects dinner from rice and meat', () => {
      const ingredients = [{ingredient: 'rice'}, {ingredient: 'steak'}];
      expect(service.detectCategoryFromIngredients(ingredients)).toBe('dinner');
    });

    test('detects lunch from sandwich ingredients', () => {
      const ingredients = [{ingredient: 'bread'}, {ingredient: 'turkey'}];
      expect(service.detectCategoryFromIngredients(ingredients)).toBe('lunch');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty text', () => {
      expect(service.parseMealEntries('')).toEqual([]);
    });

    test('handles malformed measurements', () => {
      const text = 'Meal 1\n-some rice\n-a bit of chicken';
      const meals = service.parseMealEntries(text);

      expect(meals[0].ingredients[0]).toEqual({
        amount: '1',
        unit: 'serving',
        ingredient: 'some rice'
      });
    });

    test('handles mixed formats in same text', () => {
      const text = `
        Breakfast: Oatmeal
        Meal 1
        -175g rice
      `;
      const meals = service.parseMealEntries(text);
      expect(meals).toHaveLength(2);
    });
  });
});
```

### 2. Image Generation Tests (10 tests)

**File:** `test/unit/services/mealImageGenerator.test.ts`

```typescript
describe('MealImageGenerator', () => {
  let generator: MealImageGenerator;

  beforeEach(() => {
    generator = new MealImageGenerator();
  });

  describe('Prompt Creation', () => {
    test('creates base prompt with meal name', () => {
      const prompt = generator['createImagePrompt'](
        'Chicken Rice Bowl',
        ['chicken', 'rice'],
        'lunch',
        1
      );

      expect(prompt).toContain('Chicken Rice Bowl');
      expect(prompt).toContain('chicken');
      expect(prompt).toContain('rice');
    });

    test('varies prompts for different image indices', () => {
      const prompt1 = generator['createImagePrompt']('Meal', [], 'lunch', 1);
      const prompt2 = generator['createImagePrompt']('Meal', [], 'lunch', 2);
      const prompt3 = generator['createImagePrompt']('Meal', [], 'lunch', 3);

      expect(prompt1).not.toBe(prompt2);
      expect(prompt2).not.toBe(prompt3);
    });

    test('includes category context', () => {
      const prompt = generator['createImagePrompt'](
        'Meal',
        [],
        'breakfast',
        1
      );

      expect(prompt).toContain('professional food photography');
    });
  });

  describe('Image Generation', () => {
    test('generates 3 images by default', async () => {
      const images = await generator.generateImagesForMeal({
        mealName: 'Test Meal',
        ingredients: ['ingredient1'],
        category: 'lunch'
      });

      expect(images).toHaveLength(3);
    });

    test('generates custom count of images', async () => {
      const images = await generator.generateImagesForMeal({
        mealName: 'Test Meal',
        ingredients: ['ingredient1'],
        category: 'lunch',
        count: 2
      });

      expect(images).toHaveLength(2);
    });

    test('returns image URLs with CDN domain', async () => {
      const images = await generator.generateImagesForMeal({
        mealName: 'Test Meal',
        ingredients: ['ingredient1'],
        category: 'lunch',
        count: 1
      });

      expect(images[0].imageUrl).toContain('cdn.digitaloceanspaces.com');
    });
  });

  describe('S3 Upload', () => {
    test('generates unique S3 keys', async () => {
      const key1 = await generator['uploadToS3'](Buffer.from('test'), 'Meal 1', 1);
      const key2 = await generator['uploadToS3'](Buffer.from('test'), 'Meal 1', 2);

      expect(key1).not.toBe(key2);
      expect(key1).toContain('meal-images/custom/');
    });

    test('handles upload errors gracefully', async () => {
      // Mock S3 failure
      await expect(
        generator['uploadToS3'](Buffer.from(''), 'Invalid', 1)
      ).rejects.toThrow();
    });
  });

  describe('Quota Validation', () => {
    test('validates quota before generation', async () => {
      const hasQuota = await generator.validateQuota('trainer-123');
      expect(typeof hasQuota).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('continues generating after single image failure', async () => {
      // Mock 1 failure out of 3
      const images = await generator.generateImagesForMeal({
        mealName: 'Test Meal',
        ingredients: ['test'],
        category: 'lunch'
      });

      // Should have at least 1 image even if some fail
      expect(images.length).toBeGreaterThan(0);
    });

    test('throws error if all images fail', async () => {
      // Mock complete failure
      await expect(
        generator.generateImagesForMeal({
          mealName: '',
          ingredients: [],
          category: 'lunch'
        })
      ).rejects.toThrow('Failed to generate any images');
    });
  });
});
```

### 3. Custom Meals CRUD Tests (12 tests)

**File:** `test/unit/services/trainerCustomMeals.test.ts`

```typescript
describe('Trainer Custom Meals Service', () => {
  describe('Create Custom Meal', () => {
    test('creates meal with all fields', async () => {
      const meal = await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Protein Bowl',
        category: 'lunch',
        ingredients: [
          {ingredient: 'chicken', amount: '150', unit: 'g'},
          {ingredient: 'rice', amount: '175', unit: 'g'}
        ],
        generateImages: true
      });

      expect(meal.id).toBeDefined();
      expect(meal.mealName).toBe('Protein Bowl');
      expect(meal.ingredients).toHaveLength(2);
    });

    test('prevents duplicate meal names for same trainer', async () => {
      await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Duplicate',
        category: 'lunch',
        ingredients: []
      });

      await expect(
        createCustomMeal({
          trainerId: 'trainer-1',
          mealName: 'Duplicate',
          category: 'lunch',
          ingredients: []
        })
      ).rejects.toThrow('Meal name already exists');
    });

    test('allows same meal name for different trainers', async () => {
      await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Meal',
        category: 'lunch',
        ingredients: []
      });

      await expect(
        createCustomMeal({
          trainerId: 'trainer-2',
          mealName: 'Meal',
          category: 'lunch',
          ingredients: []
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Query Custom Meals', () => {
    test('filters by category', async () => {
      const meals = await queryCustomMeals('trainer-1', {category: 'breakfast'});
      expect(meals.every(m => m.category === 'breakfast')).toBe(true);
    });

    test('searches by meal name', async () => {
      const meals = await queryCustomMeals('trainer-1', {search: 'chicken'});
      expect(meals.some(m => m.mealName.toLowerCase().includes('chicken'))).toBe(true);
    });

    test('paginates results', async () => {
      const page1 = await queryCustomMeals('trainer-1', {page: 1, limit: 10});
      const page2 = await queryCustomMeals('trainer-1', {page: 2, limit: 10});

      expect(page1.meals).not.toEqual(page2.meals);
    });
  });

  describe('Update Custom Meal', () => {
    test('updates meal fields', async () => {
      const meal = await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Original',
        category: 'lunch',
        ingredients: []
      });

      const updated = await updateCustomMeal(meal.id, {
        mealName: 'Updated',
        description: 'New description'
      });

      expect(updated.mealName).toBe('Updated');
      expect(updated.description).toBe('New description');
    });

    test('prevents updating to duplicate name', async () => {
      await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Existing',
        category: 'lunch',
        ingredients: []
      });

      const meal2 = await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Other',
        category: 'lunch',
        ingredients: []
      });

      await expect(
        updateCustomMeal(meal2.id, {mealName: 'Existing'})
      ).rejects.toThrow();
    });
  });

  describe('Delete Custom Meal', () => {
    test('deletes meal and associated images', async () => {
      const meal = await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'To Delete',
        category: 'lunch',
        ingredients: [],
        generateImages: true
      });

      await deleteCustomMeal(meal.id);

      const meals = await queryCustomMeals('trainer-1');
      expect(meals.meals.some(m => m.id === meal.id)).toBe(false);
    });

    test('prevents deleting meal from different trainer', async () => {
      const meal = await createCustomMeal({
        trainerId: 'trainer-1',
        mealName: 'Meal',
        category: 'lunch',
        ingredients: []
      });

      await expect(
        deleteCustomMeal(meal.id, {trainerId: 'trainer-2'})
      ).rejects.toThrow('Unauthorized');
    });
  });
});
```

### 4. Saved Plans Fix Tests (5 tests)

**File:** `test/unit/components/TrainerMealPlans.fixed.test.tsx`

```typescript
describe('TrainerMealPlans - Fixed', () => {
  test('loads meal plans successfully', async () => {
    render(<TrainerMealPlans />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/meal plan/i)).toBeInTheDocument();
  });

  test('handles empty meal plans list', async () => {
    render(<TrainerMealPlans />);

    await waitFor(() => {
      expect(screen.getByText(/haven't saved any meal plans/i)).toBeInTheDocument();
    });
  });

  test('displays meal plan details correctly', async () => {
    render(<TrainerMealPlans />);

    await waitFor(() => {
      expect(screen.getByText('Test Plan')).toBeInTheDocument();
      expect(screen.getByText(/7 days/i)).toBeInTheDocument();
      expect(screen.getByText(/2000 cal\/day/i)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    render(<TrainerMealPlans />);

    await waitFor(() => {
      expect(screen.getByText(/error loading meal plans/i)).toBeInTheDocument();
    });
  });

  test('refetches data after deletion', async () => {
    render(<TrainerMealPlans />);

    const deleteButton = await screen.findByLabelText('Delete meal plan');
    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByText('Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/meal plan deleted/i)).toBeInTheDocument();
    });
  });
});
```

### 5. Parse Button Fix Tests (3 tests)

**File:** `test/unit/components/ManualMealPlanCreator.fixed.test.tsx`

```typescript
describe('ManualMealPlanCreator - Parse Button Fix', () => {
  test('parse button triggers API call', async () => {
    const mockParse = jest.fn();
    render(<ManualMealPlanCreator />);

    const textarea = screen.getByPlaceholderText(/examples/i);
    fireEvent.change(textarea, {
      target: {value: 'Breakfast: Oatmeal'}
    });

    const parseButton = screen.getByText('Parse Meals');
    fireEvent.click(parseButton);

    await waitFor(() => {
      expect(mockParse).toHaveBeenCalled();
    });
  });

  test('displays parsed meals after successful parse', async () => {
    render(<ManualMealPlanCreator />);

    const textarea = screen.getByPlaceholderText(/examples/i);
    fireEvent.change(textarea, {
      target: {value: 'Meal 1\n-175g rice\n-100g chicken'}
    });

    const parseButton = screen.getByText('Parse Meals');
    fireEvent.click(parseButton);

    await waitFor(() => {
      expect(screen.getByText(/1 meals detected/i)).toBeInTheDocument();
    });
  });

  test('shows error for empty text', async () => {
    render(<ManualMealPlanCreator />);

    const parseButton = screen.getByText('Parse Meals');
    fireEvent.click(parseButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter meal details/i)).toBeInTheDocument();
    });
  });
});
```

---

## Integration Tests (17 tests)

### Parse Endpoint (3 tests)

```typescript
describe('POST /api/trainer/parse-manual-meals', () => {
  test('parses simple format', async () => {
    const response = await request(app)
      .post('/api/trainer/parse-manual-meals')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({text: 'Breakfast: Oatmeal\nLunch: Salad'});

    expect(response.status).toBe(200);
    expect(response.body.data.meals).toHaveLength(2);
  });

  test('parses structured format', async () => {
    const response = await request(app)
      .post('/api/trainer/parse-manual-meals')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        text: 'Meal 1\n-175g of rice\n-100g chicken'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.meals[0].ingredients).toBeDefined();
  });

  test('returns 400 for empty text', async () => {
    const response = await request(app)
      .post('/api/trainer/parse-manual-meals')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({text: ''});

    expect(response.status).toBe(400);
  });
});
```

### Image Generation Endpoint (4 tests)

```typescript
describe('POST /api/trainer/generate-meal-images', () => {
  test('generates images successfully', async () => {
    const response = await request(app)
      .post('/api/trainer/generate-meal-images')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        mealName: 'Chicken Bowl',
        ingredients: ['chicken', 'rice'],
        category: 'lunch',
        count: 3
      });

    expect(response.status).toBe(200);
    expect(response.body.data.images).toHaveLength(3);
    expect(response.body.data.images[0].imageUrl).toContain('cdn');
  });

  test('validates required fields', async () => {
    const response = await request(app)
      .post('/api/trainer/generate-meal-images')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({mealName: ''});

    expect(response.status).toBe(400);
  });

  test('enforces rate limiting', async () => {
    // Make 51 requests (rate limit: 50/hour)
    for (let i = 0; i < 51; i++) {
      await request(app)
        .post('/api/trainer/generate-meal-images')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          mealName: 'Test',
          ingredients: ['test'],
          category: 'lunch'
        });
    }

    const response = await request(app)
      .post('/api/trainer/generate-meal-images')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        mealName: 'Test',
        ingredients: ['test'],
        category: 'lunch'
      });

    expect(response.status).toBe(429);
  });

  test('requires trainer role', async () => {
    const response = await request(app)
      .post('/api/trainer/generate-meal-images')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        mealName: 'Test',
        ingredients: ['test'],
        category: 'lunch'
      });

    expect(response.status).toBe(403);
  });
});
```

### Custom Meals CRUD (6 tests)

```typescript
describe('Trainer Custom Meals API', () => {
  test('POST /api/trainer/custom-meals creates meal', async () => {
    const response = await request(app)
      .post('/api/trainer/custom-meals')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        mealName: 'New Meal',
        category: 'lunch',
        ingredients: [{ingredient: 'test', amount: '100', unit: 'g'}]
      });

    expect(response.status).toBe(201);
    expect(response.body.data.meal.mealName).toBe('New Meal');
  });

  test('GET /api/trainer/custom-meals returns meals', async () => {
    const response = await request(app)
      .get('/api/trainer/custom-meals')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.meals)).toBe(true);
  });

  test('GET /api/trainer/custom-meals filters by category', async () => {
    const response = await request(app)
      .get('/api/trainer/custom-meals?category=breakfast')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.meals.every(m => m.category === 'breakfast')).toBe(true);
  });

  test('PUT /api/trainer/custom-meals/:id updates meal', async () => {
    const meal = await createTestMeal(trainerId);

    const response = await request(app)
      .put(`/api/trainer/custom-meals/${meal.id}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({mealName: 'Updated Name'});

    expect(response.status).toBe(200);
    expect(response.body.data.meal.mealName).toBe('Updated Name');
  });

  test('DELETE /api/trainer/custom-meals/:id deletes meal', async () => {
    const meal = await createTestMeal(trainerId);

    const response = await request(app)
      .delete(`/api/trainer/custom-meals/${meal.id}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(response.status).toBe(200);
  });

  test('Custom meal operations isolated to trainer', async () => {
    const meal = await createTestMeal(trainer1Id);

    const response = await request(app)
      .get(`/api/trainer/custom-meals/${meal.id}`)
      .set('Authorization', `Bearer ${trainer2Token}`);

    expect(response.status).toBe(404);
  });
});
```

### Saved Plans Query Fix (2 tests)

```typescript
describe('GET /api/trainer/meal-plans', () => {
  test('returns meal plans with correct data structure', async () => {
    const response = await request(app)
      .get('/api/trainer/meal-plans')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.mealPlans).toBeDefined();
    expect(response.body.mealPlans[0].mealPlanData).toBeDefined();
  });

  test('handles empty meal plans gracefully', async () => {
    const response = await request(app)
      .get('/api/trainer/meal-plans')
      .set('Authorization', `Bearer ${newTrainerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.mealPlans).toEqual([]);
  });
});
```

---

## E2E Tests (10 tests)

### Comprehensive Trainer Custom Meals Flow

**File:** `test/e2e/trainer-custom-meals-comprehensive.spec.ts`

```typescript
test.describe('Trainer Custom Meals - Complete Flow', () => {
  test('Parse button works and displays meals', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=Create Custom');

    await page.fill('textarea', 'Breakfast: Oatmeal with berries');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('text=1 meals detected');
    expect(await page.textContent('body')).toContain('Oatmeal');
  });

  test('Structured format parsing works', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=Create Custom');

    await page.fill('textarea', `
      Meal 1
      -175g of Jasmine Rice
      -150g of Lean ground beef
      -100g of cooked broccoli
    `);

    await page.click('button:has-text("Parse Meals")');
    await page.waitForSelector('text=1 meals detected');

    expect(await page.textContent('body')).toContain('Jasmine Rice');
    expect(await page.textContent('body')).toContain('Lean ground beef');
  });

  test('Generate images for custom meal', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=Create Custom');

    await page.fill('textarea', 'Meal 1\n-100g chicken\n-150g rice');
    await page.click('button:has-text("Parse Meals")');

    await page.waitForSelector('button:has-text("Generate Images")');
    await page.click('button:has-text("Generate Images")');

    await page.waitForSelector('img[alt*="meal"]', {timeout: 30000});
    const images = await page.locator('img[alt*="meal"]').count();
    expect(images).toBeGreaterThan(0);
  });

  test('Save meal to personal library', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=Create Custom');

    await page.fill('textarea', 'Meal 1\n-100g chicken\n-150g rice');
    await page.click('button:has-text("Parse Meals")');

    await page.click('button:has-text("Save to Library")');
    await page.waitForSelector('text=Saved to Library');

    // Navigate to library
    await page.click('text=My Custom Meals');
    expect(await page.textContent('body')).toContain('chicken');
  });

  test('Saved Plans tab loads correctly', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=Saved Plans');

    await page.waitForSelector('[data-testid="meal-plan-card"]', {timeout: 5000});

    const planCount = await page.locator('[data-testid="meal-plan-card"]').count();
    expect(planCount).toBeGreaterThan(0);
  });

  test('Create meal plan from custom meals library', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=My Custom Meals');

    await page.click('[data-testid="custom-meal-card"]:first-child button:has-text("Add to Plan")');
    await page.waitForSelector('text=Added to plan');

    await page.click('text=Create Plan');
    await page.fill('input[placeholder*="plan name"]', 'Test Plan');
    await page.click('button:has-text("Save Plan")');

    await page.waitForSelector('text=Plan saved successfully');
  });

  test('Multiple meals with structured format', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=Create Custom');

    await page.fill('textarea', `
      Meal 1
      -175g of Jasmine Rice
      -150g of Lean ground beef
      -100g of cooked broccoli

      Meal 2
      -4 eggs
      -2 pieces of sourdough bread
      -1 banana (100g)

      Meal 3
      -100g turkey breast
      -150g of sweet potato
      -100g of asparagus
    `);

    await page.click('button:has-text("Parse Meals")');
    await page.waitForSelector('text=3 meals detected');

    expect(await page.textContent('body')).toContain('Jasmine Rice');
    expect(await page.textContent('body')).toContain('eggs');
    expect(await page.textContent('body')).toContain('turkey breast');
  });

  test('Edit custom meal from library', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=My Custom Meals');

    await page.click('[data-testid="custom-meal-card"]:first-child button:has-text("Edit")');

    await page.fill('input[name="mealName"]', 'Updated Meal Name');
    await page.click('button:has-text("Save Changes")');

    await page.waitForSelector('text=Meal updated');
    expect(await page.textContent('body')).toContain('Updated Meal Name');
  });

  test('Delete custom meal from library', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=My Custom Meals');

    const initialCount = await page.locator('[data-testid="custom-meal-card"]').count();

    await page.click('[data-testid="custom-meal-card"]:first-child button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');

    await page.waitForSelector('text=Meal deleted');

    const newCount = await page.locator('[data-testid="custom-meal-card"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('Search and filter custom meals', async ({ page }) => {
    await page.goto('/trainer');
    await page.click('text=My Custom Meals');

    await page.fill('input[placeholder*="search"]', 'chicken');
    await page.waitForTimeout(500);

    const cards = await page.locator('[data-testid="custom-meal-card"]').all();
    for (const card of cards) {
      const text = await card.textContent();
      expect(text?.toLowerCase()).toContain('chicken');
    }

    // Filter by category
    await page.click('button:has-text("Breakfast")');
    await page.waitForTimeout(500);

    const breakfastCards = await page.locator('[data-testid="custom-meal-card"]').all();
    expect(breakfastCards.length).toBeGreaterThan(0);
  });
});
```

---

## Test Execution Order

1. **Unit Tests First** (Fast, isolated)
   - Run: `npm run test:unit`
   - Expected: 45/45 passing

2. **Integration Tests** (Database required)
   - Run: `npm run test:integration`
   - Expected: 17/17 passing

3. **E2E Tests** (Full environment)
   - Run: `npx playwright test test/e2e/trainer-custom-meals-comprehensive.spec.ts`
   - Expected: 10/10 passing

---

## Success Criteria

### Must Pass (P0)
- ✅ All 72 tests passing
- ✅ Parse button functional (100% success rate)
- ✅ Structured format parsing accuracy >95%
- ✅ Image generation success rate >90%
- ✅ Saved Plans tab loads <2 seconds

### Should Pass (P1)
- ✅ Test coverage >80% for new code
- ✅ No regression in existing features
- ✅ Performance within acceptable ranges

---

**Test Strategy Status:** ✅ Ready for Implementation
**Next Step:** Implement fixes and write tests
