import type { Recipe } from '../../shared/schema';

export interface QualityScore {
  overall: number;          // 0-100
  nutritionalBalance: number;
  ingredientDiversity: number;
  instructionClarity: number;
  preparationComplexity: number;
  metadata: {
    warnings: string[];
    suggestions: string[];
    strengths: string[];
  };
}

export class RecipeQualityScorer {
  /**
   * Calculate comprehensive quality score for a recipe
   */
  scoreRecipe(recipe: Recipe): QualityScore {
    const nutritionalBalance = this.scoreNutritionalBalance(recipe);
    const ingredientDiversity = this.scoreIngredientDiversity(recipe);
    const instructionClarity = this.scoreInstructionClarity(recipe);
    const preparationComplexity = this.scorePreparationComplexity(recipe);
    
    // Weighted average for overall score
    const overall = Math.round(
      nutritionalBalance * 0.35 +    // Nutrition is most important
      ingredientDiversity * 0.25 +   // Variety is important
      instructionClarity * 0.25 +     // Clear instructions matter
      preparationComplexity * 0.15    // Complexity is least critical
    );
    
    const metadata = this.generateMetadata(recipe, {
      nutritionalBalance,
      ingredientDiversity,
      instructionClarity,
      preparationComplexity
    });
    
    return {
      overall,
      nutritionalBalance,
      ingredientDiversity,
      instructionClarity,
      preparationComplexity,
      metadata
    };
  }
  
  /**
   * Score nutritional balance (0-100)
   */
  private scoreNutritionalBalance(recipe: Recipe): number {
    let score = 100;
    const nutrition = recipe.nutrition;
    
    if (!nutrition) return 0;
    
    // Check protein ratio (should be 15-35% of calories)
    const proteinCalories = (nutrition.protein || 0) * 4;
    const totalCalories = nutrition.calories || 1;
    const proteinRatio = proteinCalories / totalCalories;
    
    if (proteinRatio < 0.15) {
      score -= 20; // Too low protein
    } else if (proteinRatio > 0.40) {
      score -= 10; // Too high protein
    }
    
    // Check carb ratio (should be 40-60% of calories)
    const carbCalories = (nutrition.carbs || 0) * 4;
    const carbRatio = carbCalories / totalCalories;
    
    if (carbRatio < 0.30) {
      score -= 15; // Too low carbs
    } else if (carbRatio > 0.65) {
      score -= 10; // Too high carbs
    }
    
    // Check fat ratio (should be 20-35% of calories)
    const fatCalories = (nutrition.fat || 0) * 9;
    const fatRatio = fatCalories / totalCalories;
    
    if (fatRatio < 0.15) {
      score -= 15; // Too low fat
    } else if (fatRatio > 0.40) {
      score -= 10; // Too high fat
    }
    
    // Check fiber content (should be at least 5g per 500 calories)
    const fiberPerCalorie = (nutrition.fiber || 0) / (totalCalories / 500);
    if (fiberPerCalorie < 3) {
      score -= 15; // Low fiber
    }
    
    // Check sodium (should be under 600mg per serving for most meals)
    if (nutrition.sodium && nutrition.sodium > 800) {
      score -= 10; // High sodium
    } else if (nutrition.sodium && nutrition.sodium > 1000) {
      score -= 20; // Very high sodium
    }
    
    // Check sugar (should be under 10g added sugar)
    if (nutrition.sugar && nutrition.sugar > 15) {
      score -= 10; // High sugar
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Score ingredient diversity (0-100)
   */
  private scoreIngredientDiversity(recipe: Recipe): number {
    const ingredients = recipe.ingredients || [];
    
    if (ingredients.length === 0) return 0;
    
    // Count unique ingredients (normalize similar items)
    const uniqueIngredients = new Set(
      ingredients
        .map(i => i.item?.toLowerCase().trim())
        .filter(Boolean)
        .map(item => {
          // Normalize common variations
          return item!
            .replace(/\s+/g, ' ')
            .replace(/,.*$/, '') // Remove descriptions after comma
            .replace(/\(.*\)/, '') // Remove parenthetical info
            .trim();
        })
    ).size;
    
    // Count food groups represented
    const foodGroups = this.countFoodGroups(ingredients);
    
    // Score based on variety and balance
    let score = 0;
    
    // Unique ingredients scoring (40 points max)
    if (uniqueIngredients >= 12) score += 40;
    else if (uniqueIngredients >= 10) score += 35;
    else if (uniqueIngredients >= 8) score += 30;
    else if (uniqueIngredients >= 6) score += 25;
    else if (uniqueIngredients >= 4) score += 15;
    else score += 5;
    
    // Food group diversity (40 points max)
    if (foodGroups >= 5) score += 40;
    else if (foodGroups >= 4) score += 35;
    else if (foodGroups >= 3) score += 25;
    else if (foodGroups >= 2) score += 15;
    else score += 5;
    
    // Reasonable ingredient count (20 points max)
    if (ingredients.length >= 5 && ingredients.length <= 15) {
      score += 20;
    } else if (ingredients.length >= 3 && ingredients.length <= 20) {
      score += 15;
    } else if (ingredients.length > 20) {
      score += 5; // Too many ingredients
    } else {
      score += 10; // Too few ingredients
    }
    
    return Math.min(100, score);
  }
  
  /**
   * Count food groups represented in ingredients
   */
  private countFoodGroups(ingredients: any[]): number {
    const groups = {
      protein: false,
      grains: false,
      vegetables: false,
      fruits: false,
      dairy: false,
      fats: false,
      herbs: false
    };
    
    const proteinKeywords = ['chicken', 'beef', 'pork', 'fish', 'tofu', 'beans', 'eggs', 'turkey', 'salmon', 'shrimp'];
    const grainKeywords = ['rice', 'pasta', 'bread', 'quinoa', 'oats', 'flour', 'noodles', 'barley'];
    const vegetableKeywords = ['lettuce', 'tomato', 'onion', 'pepper', 'carrot', 'broccoli', 'spinach', 'cucumber'];
    const fruitKeywords = ['apple', 'banana', 'berry', 'orange', 'lemon', 'lime', 'mango', 'grape'];
    const dairyKeywords = ['milk', 'cheese', 'yogurt', 'cream', 'butter'];
    const fatKeywords = ['oil', 'avocado', 'nuts', 'seeds', 'olive'];
    const herbKeywords = ['basil', 'oregano', 'thyme', 'parsley', 'cilantro', 'garlic', 'ginger'];
    
    ingredients.forEach(ing => {
      const item = ing.item?.toLowerCase() || '';
      
      if (proteinKeywords.some(k => item.includes(k))) groups.protein = true;
      if (grainKeywords.some(k => item.includes(k))) groups.grains = true;
      if (vegetableKeywords.some(k => item.includes(k))) groups.vegetables = true;
      if (fruitKeywords.some(k => item.includes(k))) groups.fruits = true;
      if (dairyKeywords.some(k => item.includes(k))) groups.dairy = true;
      if (fatKeywords.some(k => item.includes(k))) groups.fats = true;
      if (herbKeywords.some(k => item.includes(k))) groups.herbs = true;
    });
    
    return Object.values(groups).filter(Boolean).length;
  }
  
  /**
   * Score instruction clarity (0-100)
   */
  private scoreInstructionClarity(recipe: Recipe): number {
    const instructions = recipe.instructions || [];
    
    if (instructions.length === 0) return 0;
    
    let score = 100;
    let issues = 0;
    
    // Check for minimum instructions
    if (instructions.length < 3) {
      score -= 20;
      issues++;
    }
    
    // Check each instruction
    instructions.forEach((instruction, index) => {
      // Too brief
      if (instruction.length < 20) {
        score -= 5;
        issues++;
      }
      
      // Too verbose
      if (instruction.length > 300) {
        score -= 3;
        issues++;
      }
      
      // No punctuation
      if (!instruction.match(/[.!?]$/)) {
        score -= 2;
        issues++;
      }
      
      // Check for action verbs (good instructions start with verbs)
      const actionVerbs = ['add', 'mix', 'stir', 'cook', 'bake', 'heat', 'combine', 'place', 'remove', 'serve'];
      const firstWord = instruction.toLowerCase().split(' ')[0];
      if (actionVerbs.includes(firstWord)) {
        score += 1; // Bonus for good structure
      }
      
      // Check for timing information
      if (instruction.includes('minute') || instruction.includes('hour') || instruction.includes('until')) {
        score += 1; // Bonus for timing info
      }
    });
    
    // Cap the deductions
    if (issues > 10) {
      score = Math.max(score, 30);
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Score preparation complexity (0-100)
   */
  private scorePreparationComplexity(recipe: Recipe): number {
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const instructionCount = recipe.instructions?.length || 0;
    const ingredientCount = recipe.ingredients?.length || 0;
    
    let score = 100;
    
    // Time scoring (ideal is 20-60 minutes)
    if (totalTime === 0) {
      score = 50; // No time info
    } else if (totalTime < 15) {
      score -= 20; // Too simple/quick
    } else if (totalTime > 120) {
      score -= 30; // Too complex/long
    } else if (totalTime > 90) {
      score -= 15; // Getting long
    } else if (totalTime >= 20 && totalTime <= 60) {
      score += 0; // Ideal range
    }
    
    // Instruction count (ideal is 4-8 steps)
    if (instructionCount < 3) {
      score -= 20; // Too simple
    } else if (instructionCount > 15) {
      score -= 25; // Too complex
    } else if (instructionCount > 10) {
      score -= 10; // Getting complex
    } else if (instructionCount >= 4 && instructionCount <= 8) {
      score += 0; // Ideal range
    }
    
    // Ingredient count (ideal is 6-12)
    if (ingredientCount < 4) {
      score -= 15; // Too simple
    } else if (ingredientCount > 20) {
      score -= 20; // Too many ingredients
    } else if (ingredientCount > 15) {
      score -= 10; // Getting complex
    } else if (ingredientCount >= 6 && ingredientCount <= 12) {
      score += 0; // Ideal range
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Generate metadata with warnings and suggestions
   */
  private generateMetadata(
    recipe: Recipe, 
    scores: Omit<QualityScore, 'overall' | 'metadata'>
  ): QualityScore['metadata'] {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const strengths: string[] = [];
    
    // Nutritional balance feedback
    if (scores.nutritionalBalance < 60) {
      warnings.push('Poor nutritional balance');
      const nutrition = recipe.nutrition;
      if (nutrition) {
        if ((nutrition.protein || 0) * 4 / (nutrition.calories || 1) < 0.15) {
          suggestions.push('Increase protein content to at least 15% of calories');
        }
        if (!nutrition.fiber || nutrition.fiber < 3) {
          suggestions.push('Add more fiber-rich ingredients (vegetables, whole grains)');
        }
        if (nutrition.sodium && nutrition.sodium > 800) {
          suggestions.push('Reduce sodium content by using herbs and spices instead of salt');
        }
      }
    } else if (scores.nutritionalBalance >= 80) {
      strengths.push('Excellent nutritional balance');
    }
    
    // Ingredient diversity feedback
    if (scores.ingredientDiversity < 60) {
      warnings.push('Limited ingredient variety');
      suggestions.push('Add more diverse ingredients from different food groups');
    } else if (scores.ingredientDiversity >= 80) {
      strengths.push('Great ingredient variety');
    }
    
    // Instruction clarity feedback
    if (scores.instructionClarity < 60) {
      warnings.push('Instructions need improvement');
      suggestions.push('Expand brief instructions with more detail');
      suggestions.push('Start each instruction with an action verb');
    } else if (scores.instructionClarity >= 80) {
      strengths.push('Clear and detailed instructions');
    }
    
    // Complexity feedback
    if (scores.preparationComplexity < 60) {
      if ((recipe.prepTime || 0) + (recipe.cookTime || 0) > 90) {
        warnings.push('Recipe may be too complex');
        suggestions.push('Consider simplifying or breaking into make-ahead components');
      } else {
        warnings.push('Recipe may be too simple');
        suggestions.push('Add more depth with additional cooking techniques or ingredients');
      }
    } else if (scores.preparationComplexity >= 80) {
      strengths.push('Well-balanced complexity');
    }
    
    return { warnings, suggestions, strengths };
  }
}

// Export singleton instance
export const recipeQualityScorer = new RecipeQualityScorer();