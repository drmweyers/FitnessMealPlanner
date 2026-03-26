export interface BatchConstraints {
  id: string;
  name: string;
  targetCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

export interface ConstraintValidationResult {
  id: string;
  name: string;
  feasible: boolean;
  errors: string[];
  warnings: string[];
}

const PROTEIN_CAL_PER_G = 4;
const CARB_CAL_PER_G = 4;
const FAT_CAL_PER_G = 9;

export function validateConstraints(batch: BatchConstraints): ConstraintValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Range checks: min must be <= max
  if (batch.minProtein !== undefined && batch.maxProtein !== undefined && batch.minProtein > batch.maxProtein) {
    errors.push(`Protein range invalid: minProtein (${batch.minProtein}g) > maxProtein (${batch.maxProtein}g)`);
  }

  if (batch.minCarbs !== undefined && batch.maxCarbs !== undefined && batch.minCarbs > batch.maxCarbs) {
    errors.push(`Carbs range invalid: minCarbs (${batch.minCarbs}g) > maxCarbs (${batch.maxCarbs}g)`);
  }

  if (batch.minFat !== undefined && batch.maxFat !== undefined && batch.minFat > batch.maxFat) {
    errors.push(`Fat range invalid: minFat (${batch.minFat}g) > maxFat (${batch.maxFat}g)`);
  }

  // Calorie feasibility: minimum macro calories must not exceed calorie ceiling
  const caloryCeiling = batch.maxCalories ?? batch.targetCalories;
  if (caloryCeiling !== undefined) {
    const minMacroCalories =
      (batch.minProtein ?? 0) * PROTEIN_CAL_PER_G +
      (batch.minCarbs ?? 0) * CARB_CAL_PER_G +
      (batch.minFat ?? 0) * FAT_CAL_PER_G;

    if (minMacroCalories > caloryCeiling) {
      errors.push(
        `Minimum macro calories (${minMacroCalories} kcal) exceed max calories (${caloryCeiling} kcal) — mathematically impossible`
      );
    }
  }

  // Extremely restrictive warnings
  if (batch.maxCarbs !== undefined && batch.maxCarbs <= 5) {
    warnings.push(`Extremely restrictive carb limit: maxCarbs=${batch.maxCarbs}g — very few recipes will qualify`);
  }

  if (batch.maxFat !== undefined && batch.maxFat <= 5) {
    warnings.push(`Extremely restrictive fat limit: maxFat=${batch.maxFat}g — very few recipes will qualify`);
  }

  // Narrow window warnings
  if (batch.minProtein !== undefined && batch.maxProtein !== undefined) {
    const proteinRange = batch.maxProtein - batch.minProtein;
    if (proteinRange >= 0 && proteinRange <= 5) {
      warnings.push(`Narrow protein window: ${batch.minProtein}–${batch.maxProtein}g (${proteinRange}g range) — may be tight`);
    }
  }

  if (batch.minCarbs !== undefined && batch.maxCarbs !== undefined) {
    const carbRange = batch.maxCarbs - batch.minCarbs;
    if (carbRange >= 0 && carbRange <= 5) {
      warnings.push(`Narrow carbs window: ${batch.minCarbs}–${batch.maxCarbs}g (${carbRange}g range) — may be tight`);
    }
  }

  if (batch.minFat !== undefined && batch.maxFat !== undefined) {
    const fatRange = batch.maxFat - batch.minFat;
    if (fatRange >= 0 && fatRange <= 5) {
      warnings.push(`Narrow fat window: ${batch.minFat}–${batch.maxFat}g (${fatRange}g range) — may be tight`);
    }
  }

  if (batch.targetCalories !== undefined && batch.maxCalories !== undefined) {
    const calRange = batch.maxCalories - batch.targetCalories;
    if (calRange >= 0 && calRange <= 20) {
      warnings.push(`Narrow calorie window: ${batch.targetCalories}–${batch.maxCalories} kcal (${calRange} kcal range) — may be tight`);
    }
  }

  return {
    id: batch.id,
    name: batch.name,
    feasible: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAllBatches(batches: BatchConstraints[]): ConstraintValidationResult[] {
  return batches.map(validateConstraints);
}
