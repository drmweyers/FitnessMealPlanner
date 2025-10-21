# Trainer Custom Meals - Simplified Action Plan

**Status:** Architecture Updated ✅
**Complexity:** MEDIUM (reduced from HIGH)
**Estimated Time:** 1-2 sessions (down from 3-4 days)

---

## ✅ What's Complete

### 1. Parse Button Fix ✅
**File:** `client/src/components/ManualMealPlanCreator.tsx`
- Fixed API call signature (was using config object, now uses positional params)
- Parse button now functional

### 2. Architecture Simplified ✅
**File:** `docs/architecture/trainer-custom-meals-enhancement.md`
- **Original plan:** DALL-E 3 AI generation ($0.12/meal, complex S3 upload, database tracking)
- **New plan:** Use existing categoryImages.ts system (zero cost, instant)
- Removed 1500+ lines of complexity
- **Total images needed:** 12 (3 per category - breakfast, lunch, dinner, snack)
- **Current images:** 15 per category already exist ✅

### 3. Test Strategy ✅
**File:** `docs/qa/trainer-custom-meals-test-strategy.md`
- 45 unit tests planned
- 17 integration tests planned
- 10 E2E tests planned

---

## 🎯 Remaining Work (Prioritized)

### **HIGH PRIORITY** (This Session)

#### 1. Enhanced Parser (Core Feature) ⭐
**What:** Support structured ingredient format
**Why:** Trainer needs to paste meals like:
```
Meal 1

-175g of Jasmine Rice
-150g of Lean ground beef
-100g of cooked broccoli
```

**Current parser only supports:**
```
Breakfast: Oatmeal
Lunch: Chicken salad
```

**Implementation:**
- File: `server/services/manualMealPlanService.ts`
- Add `parseStructuredFormat()` method
- Extract ingredients with amounts/units
- Generate meal names from ingredients
- ~200 lines of code

**Testing:**
- Unit tests for parser
- E2E test with your exact format

**Time:** 30-45 minutes

#### 2. Fix Saved Plans Tab ⭐
**What:** Debug why Saved Plans tab not loading
**Current Issue:** Query not returning data or data transformation issue

**Investigation:**
- File: `client/src/components/TrainerMealPlans.tsx`
- Check query key configuration
- Verify API response structure
- Fix data transformation

**Time:** 15-20 minutes

---

### **MEDIUM PRIORITY** (Future Session)

#### 3. Database + Custom Meals Library
**What:** Trainer's personal meal collection
**Database:** `trainer_custom_meals` table
**API:** 5 CRUD endpoints
**UI:** New tab "My Custom Meals"

**Why defer:** Parser and Saved Plans are blocking trainers NOW. Library is nice-to-have.

**Time:** 2-3 hours (separate session recommended)

---

## 🚀 Recommended Next Steps

### **Option A: Complete Core Fixes Now** ⭐ RECOMMENDED

**Goal:** Get Parse + Saved Plans working in this session

**Steps:**
1. ✅ Parse button fixed (done)
2. Implement enhanced parser (30-45 min)
3. Fix Saved Plans tab (15-20 min)
4. Write unit tests (20 min)
5. Write E2E test (20 min)
6. Run tests and validate (10 min)

**Total time:** ~2 hours
**Deliverable:** Trainers can create custom meals with structured format + view saved plans

### **Option B: Parser Only**

**Goal:** Just get structured format parsing working

**Steps:**
1. ✅ Parse button fixed (done)
2. Implement enhanced parser (30-45 min)
3. Test manually with your example
4. Deploy

**Total time:** 30-45 minutes
**Deliverable:** Trainers can paste ingredient lists

### **Option C: Defer Everything**

Review architecture, plan next session

---

## 📝 Technical Implementation Guide

### Enhanced Parser Implementation

**Step 1: Add format detection**
```typescript
// manualMealPlanService.ts
private detectFormat(text: string): 'simple' | 'structured' {
  const hasMealHeaders = /Meal \d+/i.test(text);
  const hasBulletPoints = /^[\-•]/m.test(text);

  if (hasMealHeaders && hasBulletPoints) {
    return 'structured';
  }

  return 'simple';
}
```

**Step 2: Add structured parser**
```typescript
private parseStructuredFormat(text: string): EnhancedMealEntry[] {
  const mealBlocks = text.split(/Meal \d+/i).filter(Boolean);

  return mealBlocks.map(block => {
    const lines = block.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'));

    const ingredients = lines.map(line => {
      // Remove bullet: "-175g of rice" → "175g of rice"
      line = line.replace(/^[\-•]\s*/, '');

      // Parse measurement: "175g of rice" → {amount: 175, unit: g, ingredient: rice}
      const match = line.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|cup|tbsp|tsp)?\s*(?:of\s+)?(.+)$/i);

      if (match) {
        return {
          amount: match[1],
          unit: match[2] || 'serving',
          ingredient: match[3].trim()
        };
      }

      // Fallback: plain ingredient
      return {amount: '1', unit: 'serving', ingredient: line};
    });

    const mealName = this.generateMealName(ingredients);
    const category = this.detectCategoryFromIngredients(ingredients);

    return {mealName, category, ingredients};
  });
}
```

**Step 3: Update main parse method**
```typescript
parseMealEntries(text: string): EnhancedMealEntry[] {
  const format = this.detectFormat(text);

  if (format === 'structured') {
    return this.parseStructuredFormat(text);
  }

  return this.parseSimpleFormat(text); // existing logic
}
```

### Saved Plans Tab Fix

**Step 1: Check query configuration**
```typescript
// TrainerMealPlans.tsx
const { data, isLoading } = useQuery({
  queryKey: ['trainer-meal-plans', user?.id],
  queryFn: async () => {
    const response = await apiRequest('GET', '/api/trainer/meal-plans');
    // ADD: console.log('Response:', response);
    const data = await response.json();
    // ADD: console.log('Data:', data);
    return data;
  }
});
```

**Step 2: Check API response structure**
```bash
# Test in browser console
curl http://localhost:4000/api/trainer/meal-plans -H "Authorization: Bearer <token>"
```

**Step 3: Fix data transformation if needed**

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Parse button works with simple format
- [ ] Parse button works with structured format (your example)
- [ ] Parsed meals display correctly
- [ ] Can save meal plan
- [ ] Saved Plans tab loads
- [ ] Can view saved plan details

### Automated Testing
- [ ] Unit test: parse simple format
- [ ] Unit test: parse structured format
- [ ] Unit test: extract ingredients with measurements
- [ ] E2E test: complete Create Custom flow

---

## 📊 Success Metrics

**Phase 1 Success (Parse + Saved Plans):**
- ✅ Parse button functional
- ✅ Structured format parsing works
- ✅ Saved Plans tab loads
- ✅ All tests passing

**Phase 2 Success (Custom Meals Library - Future):**
- ✅ Database migration complete
- ✅ CRUD API working
- ✅ Library UI functional
- ✅ Can reuse meals across plans

---

## 💡 My Recommendation

**Start with Option A** (Complete Core Fixes Now)

**Rationale:**
1. Parse button is fixed ✅
2. Enhanced parser is the #1 blocker for trainers
3. Saved Plans fix is quick and needed
4. Custom meals library can wait (nice-to-have)
5. ~2 hours gets both critical features working

**Next action:**
```
"Implement enhanced parser with structured format support"
```

I'll:
1. Add structured format detection
2. Implement ingredient parsing with measurements
3. Test with your exact example
4. Fix Saved Plans tab
5. Write tests
6. Validate everything works

**Ready to proceed?** Say "yes" and I'll start implementation! 🚀

---

## 📁 Key Files Reference

**Parser:**
- `server/services/manualMealPlanService.ts` (270 lines)

**Frontend:**
- `client/src/components/ManualMealPlanCreator.tsx` (325 lines)
- `client/src/components/TrainerMealPlans.tsx` (473 lines)

**Images:**
- `server/config/categoryImages.ts` (15 images per category already ✅)

**Routes:**
- `server/routes/trainerRoutes.ts` (API endpoints)

**Architecture:**
- `docs/architecture/trainer-custom-meals-enhancement.md`
- `docs/qa/trainer-custom-meals-test-strategy.md`
