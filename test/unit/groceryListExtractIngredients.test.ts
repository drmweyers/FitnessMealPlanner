import { describe, it, expect } from "vitest";
import { extractIngredientsFromMealPlan } from "../../server/utils/ingredientAggregator";

// Regression: Bug #6 (Hotfix B6)
// /api/grocery-lists/generate-from-meal-plan returned 500 with
// "mealPlanData.days is not iterable" because the extractor only handled
// the legacy nested days[].meals[] shape. Production meal plans use a
// flat meals[] array with a `day` field on each entry. This test ensures
// BOTH shapes produce ingredients without throwing.
describe("extractIngredientsFromMealPlan — both shapes (Hotfix B6)", () => {
  const testRecipe = {
    name: "Test Recipe",
    ingredientsJson: [
      { name: "Eggs", amount: "2", unit: "large" },
      { name: "Bacon", amount: "3", unit: "slices" },
    ],
  };

  it("handles legacy shape: days[].meals[] (nested)", () => {
    const plan = {
      days: [
        { meals: [{ recipe: testRecipe }] },
        { meals: [{ recipe: testRecipe }] },
      ],
    };
    const result = extractIngredientsFromMealPlan(plan);
    expect(result).toHaveLength(4);
    expect(result[0].name).toBe("Eggs");
    expect(result[0].recipeName).toBe("Test Recipe");
  });

  it("handles production shape: meals[] (flat with day field)", () => {
    const plan = {
      planName: "Personalized Plan",
      days: 7,
      meals: [
        { day: 1, mealType: "breakfast", recipe: testRecipe },
        { day: 1, mealType: "lunch", recipe: testRecipe },
        { day: 2, mealType: "breakfast", recipe: testRecipe },
      ],
    };
    const result = extractIngredientsFromMealPlan(plan);
    expect(result).toHaveLength(6);
  });

  it("handles both shapes coexisting on the same plan", () => {
    const plan = {
      days: [{ meals: [{ recipe: testRecipe }] }],
      meals: [{ day: 1, recipe: testRecipe }],
    };
    const result = extractIngredientsFromMealPlan(plan);
    expect(result).toHaveLength(4);
  });

  it("does not throw on empty / malformed input", () => {
    expect(() => extractIngredientsFromMealPlan(null)).not.toThrow();
    expect(() => extractIngredientsFromMealPlan(undefined)).not.toThrow();
    expect(() => extractIngredientsFromMealPlan({})).not.toThrow();
    expect(() => extractIngredientsFromMealPlan({ meals: null })).not.toThrow();
    expect(() =>
      extractIngredientsFromMealPlan({ days: "not-an-array" }),
    ).not.toThrow();
    expect(extractIngredientsFromMealPlan({})).toEqual([]);
  });

  it("skips meals with missing recipe or ingredientsJson", () => {
    const plan = {
      meals: [
        { day: 1, recipe: testRecipe },
        { day: 1 }, // no recipe
        { day: 1, recipe: { name: "no ingredients" } }, // no ingredientsJson
        { day: 1, recipe: { name: "bad", ingredientsJson: null } },
      ],
    };
    const result = extractIngredientsFromMealPlan(plan);
    expect(result).toHaveLength(2);
  });
});
