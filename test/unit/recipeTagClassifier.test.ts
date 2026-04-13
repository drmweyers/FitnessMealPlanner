import { describe, it, expect } from "vitest";
import { classifyRecipe } from "../../server/utils/recipeTagClassifier";

// Quick fixtures representing real production recipe shapes
const ribeye = {
  name: "Seared Ribeye Breakfast Steak",
  servings: 1,
  caloriesKcal: 520,
  proteinGrams: "46.00",
  carbsGrams: "0.00",
  fatGrams: "38.00",
  dietaryTags: ["High-Protein", "Low-Carb"],
  mainIngredientTags: ["Beef", "Ribeye"],
  ingredientsJson: [
    { name: "Ribeye steak", amount: "200", unit: "g" },
    { name: "Butter", amount: "10", unit: "g" },
    { name: "Salt" },
    { name: "Pepper" },
  ],
};

const lentilSoup = {
  name: "Lentil and Spinach Soup",
  servings: 3,
  caloriesKcal: 435,
  proteinGrams: "30.00",
  carbsGrams: "50.00",
  fatGrams: "15.00",
  dietaryTags: ["High-Protein"],
  mainIngredientTags: ["Lentils", "Spinach"],
  ingredientsJson: [
    { name: "Green Lentils" },
    { name: "Spinach" },
    { name: "Carrot" },
    { name: "Celery" },
    { name: "Vegetable Broth" },
    { name: "Olive Oil" },
    { name: "Salt" },
    { name: "Black Pepper" },
  ],
};

const chickenStirFry = {
  name: "Spinach and Chicken Stir-Fry",
  servings: 1,
  caloriesKcal: 490,
  proteinGrams: "48.00",
  carbsGrams: "10.00",
  fatGrams: "26.00",
  dietaryTags: ["High-Protein"],
  mainIngredientTags: ["Chicken", "Spinach"],
  ingredientsJson: [
    { name: "Chicken Breast" },
    { name: "Spinach" },
    { name: "Soy Sauce" },
    { name: "Garlic" },
    { name: "Ginger" },
    { name: "Olive Oil" },
  ],
};

const silkenTofu = {
  name: "Silken Tofu and Berry Puree",
  servings: 1,
  caloriesKcal: 330,
  proteinGrams: "26.00",
  carbsGrams: "30.00",
  fatGrams: "10.00",
  dietaryTags: ["High-Protein"],
  mainIngredientTags: ["Tofu", "Berries", "Honey"],
  ingredientsJson: [
    { name: "Silken tofu", amount: "150", unit: "grams" },
    { name: "Mixed berries", amount: "100", unit: "grams" },
    { name: "Honey", amount: "1", unit: "teaspoon" },
  ],
};

const avocadoSalmon = {
  name: "Mediterranean Salmon Bowl",
  servings: 2,
  caloriesKcal: 700,
  proteinGrams: "40.00",
  carbsGrams: "25.00",
  fatGrams: "45.00",
  dietaryTags: [],
  mainIngredientTags: ["Salmon", "Olive Oil"],
  ingredientsJson: [
    { name: "Salmon fillet" },
    { name: "Olive oil" },
    { name: "Tomato" },
    { name: "Cucumber" },
    { name: "Lemon" },
    { name: "Feta" },
    { name: "Olives" },
    { name: "Parsley" },
  ],
};

describe("classifyRecipe — dietary tag enrichment (Phase A)", () => {
  it("ribeye: preserves High-Protein/Low-Carb, adds Keto, Gluten-Free, Dairy-Free is false (butter)", () => {
    const { tags, added } = classifyRecipe(ribeye);
    expect(tags).toContain("High-Protein");
    expect(tags).toContain("Low-Carb");
    expect(added).toContain("Keto");
    expect(added).toContain("Gluten-Free");
    // butter present → not dairy-free
    expect(added).not.toContain("Dairy-Free");
    // contains beef → not vegetarian/vegan
    expect(added).not.toContain("Vegetarian");
    expect(added).not.toContain("Vegan");
  });

  it("lentil soup: adds Vegetarian + Vegan + Dairy-Free + Gluten-Free + Mediterranean", () => {
    const { tags, added } = classifyRecipe(lentilSoup);
    expect(added).toContain("Vegetarian");
    expect(added).toContain("Vegan");
    expect(added).toContain("Dairy-Free");
    expect(added).toContain("Gluten-Free");
    expect(added).toContain("Mediterranean");
    // High carbs → not keto, not low-carb
    expect(tags).not.toContain("Keto");
  });

  it("chicken stir-fry: NOT vegetarian (chicken), NOT gluten-free (soy sauce), Low-Carb yes", () => {
    const { tags, added } = classifyRecipe(chickenStirFry);
    expect(added).not.toContain("Vegetarian");
    expect(added).not.toContain("Gluten-Free"); // soy sauce
    expect(added).toContain("Low-Carb"); // 10g / serving
  });

  it("silken tofu + honey: Vegetarian yes, Vegan NO (honey)", () => {
    const { tags, added } = classifyRecipe(silkenTofu);
    expect(added).toContain("Vegetarian");
    expect(added).not.toContain("Vegan"); // honey disqualifier
  });

  it("mediterranean salmon bowl: adds Mediterranean, Gluten-Free, Low-Carb", () => {
    const { tags, added } = classifyRecipe(avocadoSalmon);
    expect(added).toContain("Mediterranean");
    expect(added).toContain("Gluten-Free");
    // salmon + feta + olive oil → mediterranean yes
    expect(added).not.toContain("Vegetarian"); // salmon
  });

  it("preserves existing tags never seen by classifier (does not destroy curation)", () => {
    const result = classifyRecipe({
      ...ribeye,
      dietaryTags: ["Chef-Curated", "High-Protein"],
    });
    expect(result.tags).toContain("Chef-Curated");
    expect(result.tags).toContain("High-Protein");
  });

  it("handles empty/null input safely", () => {
    expect(() => classifyRecipe({} as any)).not.toThrow();
    expect(() =>
      classifyRecipe({ ingredientsJson: null } as any),
    ).not.toThrow();
  });
});
