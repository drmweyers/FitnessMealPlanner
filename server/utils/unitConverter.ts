/**
 * Enhanced Unit Converter Utility
 *
 * Provides sophisticated unit conversion and normalization for grocery list
 * ingredient aggregation. Handles volume, weight, and count measurements
 * with smart conversion between compatible units.
 *
 * Features:
 * - Volume conversions (cups, tbsp, tsp, fl oz, ml, liters)
 * - Weight conversions (lbs, oz, kg, g)
 * - Count-based units (pieces, cloves, bunches, etc.)
 * - Fraction parsing (1/2, 1/4, 3/4, etc.)
 * - Smart unit normalization for aggregation
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

/**
 * Unit categories for conversion compatibility
 */
export enum UnitCategory {
  VOLUME = 'volume',
  WEIGHT = 'weight',
  COUNT = 'count',
  UNKNOWN = 'unknown'
}

/**
 * Standard base units for each category
 */
export const BASE_UNITS = {
  [UnitCategory.VOLUME]: 'ml',
  [UnitCategory.WEIGHT]: 'g',
  [UnitCategory.COUNT]: 'pcs'
} as const;

/**
 * Conversion factors to base units (ml for volume, g for weight)
 */
const CONVERSION_FACTORS: Record<string, { category: UnitCategory; factor: number; displayUnit: string }> = {
  // Volume conversions (to milliliters)
  'ml': { category: UnitCategory.VOLUME, factor: 1, displayUnit: 'ml' },
  'milliliter': { category: UnitCategory.VOLUME, factor: 1, displayUnit: 'ml' },
  'milliliters': { category: UnitCategory.VOLUME, factor: 1, displayUnit: 'ml' },
  'l': { category: UnitCategory.VOLUME, factor: 1000, displayUnit: 'l' },
  'liter': { category: UnitCategory.VOLUME, factor: 1000, displayUnit: 'l' },
  'liters': { category: UnitCategory.VOLUME, factor: 1000, displayUnit: 'l' },
  'cup': { category: UnitCategory.VOLUME, factor: 240, displayUnit: 'cups' },
  'cups': { category: UnitCategory.VOLUME, factor: 240, displayUnit: 'cups' },
  'c': { category: UnitCategory.VOLUME, factor: 240, displayUnit: 'cups' },
  'tbsp': { category: UnitCategory.VOLUME, factor: 15, displayUnit: 'tbsp' },
  'tablespoon': { category: UnitCategory.VOLUME, factor: 15, displayUnit: 'tbsp' },
  'tablespoons': { category: UnitCategory.VOLUME, factor: 15, displayUnit: 'tbsp' },
  'tsp': { category: UnitCategory.VOLUME, factor: 5, displayUnit: 'tsp' },
  'teaspoon': { category: UnitCategory.VOLUME, factor: 5, displayUnit: 'tsp' },
  'teaspoons': { category: UnitCategory.VOLUME, factor: 5, displayUnit: 'tsp' },
  'fl oz': { category: UnitCategory.VOLUME, factor: 30, displayUnit: 'fl oz' },
  'fluid ounce': { category: UnitCategory.VOLUME, factor: 30, displayUnit: 'fl oz' },
  'fluid ounces': { category: UnitCategory.VOLUME, factor: 30, displayUnit: 'fl oz' },
  'pint': { category: UnitCategory.VOLUME, factor: 480, displayUnit: 'pints' },
  'pints': { category: UnitCategory.VOLUME, factor: 480, displayUnit: 'pints' },
  'quart': { category: UnitCategory.VOLUME, factor: 960, displayUnit: 'quarts' },
  'quarts': { category: UnitCategory.VOLUME, factor: 960, displayUnit: 'quarts' },
  'gallon': { category: UnitCategory.VOLUME, factor: 3840, displayUnit: 'gallons' },
  'gallons': { category: UnitCategory.VOLUME, factor: 3840, displayUnit: 'gallons' },

  // Weight conversions (to grams)
  'g': { category: UnitCategory.WEIGHT, factor: 1, displayUnit: 'g' },
  'gram': { category: UnitCategory.WEIGHT, factor: 1, displayUnit: 'g' },
  'grams': { category: UnitCategory.WEIGHT, factor: 1, displayUnit: 'g' },
  'kg': { category: UnitCategory.WEIGHT, factor: 1000, displayUnit: 'kg' },
  'kilogram': { category: UnitCategory.WEIGHT, factor: 1000, displayUnit: 'kg' },
  'kilograms': { category: UnitCategory.WEIGHT, factor: 1000, displayUnit: 'kg' },
  'oz': { category: UnitCategory.WEIGHT, factor: 28.35, displayUnit: 'oz' },
  'ounce': { category: UnitCategory.WEIGHT, factor: 28.35, displayUnit: 'oz' },
  'ounces': { category: UnitCategory.WEIGHT, factor: 28.35, displayUnit: 'oz' },
  'lb': { category: UnitCategory.WEIGHT, factor: 453.6, displayUnit: 'lbs' },
  'lbs': { category: UnitCategory.WEIGHT, factor: 453.6, displayUnit: 'lbs' },
  'pound': { category: UnitCategory.WEIGHT, factor: 453.6, displayUnit: 'lbs' },
  'pounds': { category: UnitCategory.WEIGHT, factor: 453.6, displayUnit: 'lbs' },

  // Count-based units (no conversion, just normalization)
  'pcs': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'pcs' },
  'piece': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'pcs' },
  'pieces': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'pcs' },
  'pc': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'pcs' },
  'item': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'pcs' },
  'items': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'pcs' },
  'clove': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'cloves' },
  'cloves': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'cloves' },
  'bunch': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'bunches' },
  'bunches': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'bunches' },
  'package': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'packages' },
  'packages': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'packages' },
  'pkg': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'packages' },
  'can': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'cans' },
  'cans': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'cans' },
  'bottle': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'bottles' },
  'bottles': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'bottles' },
  'jar': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'jars' },
  'jars': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'jars' },
  'box': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'boxes' },
  'boxes': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'boxes' },
  'bag': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'bags' },
  'bags': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'bags' },
  'head': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'heads' },
  'heads': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'heads' },
  'stalk': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'stalks' },
  'stalks': { category: UnitCategory.COUNT, factor: 1, displayUnit: 'stalks' },
};

/**
 * Common fraction mappings for parsing
 */
const FRACTIONS: Record<string, number> = {
  '1/8': 0.125,
  '1/4': 0.25,
  '1/3': 0.333,
  '1/2': 0.5,
  '2/3': 0.667,
  '3/4': 0.75,
  '7/8': 0.875,
};

/**
 * Parsed quantity and unit information
 */
export interface ParsedQuantity {
  quantity: number;
  unit: string;
  category: UnitCategory;
  baseQuantity: number; // Converted to base unit for comparison
  displayUnit: string; // Preferred display unit for this measurement
}

/**
 * Parse quantity from ingredient amount string with enhanced fraction and unit detection
 */
export function parseQuantityAndUnit(amount: string, unit?: string): ParsedQuantity {
  const cleanAmount = amount.trim().toLowerCase();

  // Extract numeric part (including fractions)
  let quantity = 1;
  let parsedUnit = unit?.toLowerCase() || '';

  // Look for fractions first
  const fractionMatch = cleanAmount.match(/(\d+\s+)?(\d+\/\d+)/);
  if (fractionMatch) {
    const wholePart = fractionMatch[1] ? parseInt(fractionMatch[1].trim()) : 0;
    const fractionPart = fractionMatch[2];

    if (FRACTIONS[fractionPart]) {
      quantity = wholePart + FRACTIONS[fractionPart];
    } else {
      // Parse custom fraction
      const [numerator, denominator] = fractionPart.split('/').map(n => parseInt(n));
      quantity = wholePart + (numerator / denominator);
    }
  } else {
    // Look for decimal or whole numbers
    const numberMatch = cleanAmount.match(/(\d+(?:\.\d+)?)/);
    quantity = numberMatch ? parseFloat(numberMatch[1]) : 1;
  }

  // Extract unit from amount if not provided
  if (!parsedUnit) {
    // Remove the number part and fractions to isolate unit
    const unitText = cleanAmount
      .replace(/(\d+\s+)?\d+\/\d+/, '')
      .replace(/\d+(?:\.\d+)?/, '')
      .trim();

    // Check for known units
    const unitWords = unitText.split(/\s+/);
    for (const word of unitWords) {
      const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation
      if (CONVERSION_FACTORS[cleanWord]) {
        parsedUnit = cleanWord;
        break;
      }
    }

    // If no unit found, default to pieces
    if (!parsedUnit) {
      parsedUnit = 'pcs';
    }
  }

  // Get unit information
  const unitInfo = CONVERSION_FACTORS[parsedUnit] || {
    category: UnitCategory.UNKNOWN,
    factor: 1,
    displayUnit: parsedUnit
  };

  return {
    quantity,
    unit: parsedUnit,
    category: unitInfo.category,
    baseQuantity: quantity * unitInfo.factor,
    displayUnit: unitInfo.displayUnit
  };
}

/**
 * Check if two units are compatible for aggregation
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const info1 = CONVERSION_FACTORS[unit1.toLowerCase()];
  const info2 = CONVERSION_FACTORS[unit2.toLowerCase()];

  if (!info1 || !info2) return false;

  return info1.category === info2.category && info1.category !== UnitCategory.UNKNOWN;
}

/**
 * Convert between compatible units
 */
export function convertUnits(quantity: number, fromUnit: string, toUnit: string): number | null {
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    return null;
  }

  const fromInfo = CONVERSION_FACTORS[fromUnit.toLowerCase()];
  const toInfo = CONVERSION_FACTORS[toUnit.toLowerCase()];

  if (!fromInfo || !toInfo) return null;

  // Convert to base unit, then to target unit
  const baseQuantity = quantity * fromInfo.factor;
  return baseQuantity / toInfo.factor;
}

/**
 * Get the best display unit for a given quantity and category
 */
export function getBestDisplayUnit(baseQuantity: number, category: UnitCategory): string {
  switch (category) {
    case UnitCategory.VOLUME:
      if (baseQuantity >= 1000) return 'l';
      if (baseQuantity >= 240) return 'cups';
      if (baseQuantity >= 15) return 'tbsp';
      return 'tsp';

    case UnitCategory.WEIGHT:
      if (baseQuantity >= 1000) return 'kg';
      if (baseQuantity >= 453.6) return 'lbs';
      if (baseQuantity >= 28.35) return 'oz';
      return 'g';

    case UnitCategory.COUNT:
    default:
      return 'pcs';
  }
}

/**
 * Aggregate two compatible quantities
 */
export function aggregateQuantities(
  qty1: ParsedQuantity,
  qty2: ParsedQuantity
): ParsedQuantity | null {
  if (qty1.category !== qty2.category || qty1.category === UnitCategory.UNKNOWN) {
    return null;
  }

  // Sum base quantities
  const totalBaseQuantity = qty1.baseQuantity + qty2.baseQuantity;

  // Determine best display unit
  const bestUnit = getBestDisplayUnit(totalBaseQuantity, qty1.category);
  const unitInfo = CONVERSION_FACTORS[bestUnit];

  if (!unitInfo) return null;

  // Convert back to display quantity
  const displayQuantity = totalBaseQuantity / unitInfo.factor;

  return {
    quantity: Math.round(displayQuantity * 100) / 100, // Round to 2 decimal places
    unit: bestUnit,
    category: qty1.category,
    baseQuantity: totalBaseQuantity,
    displayUnit: unitInfo.displayUnit
  };
}

/**
 * Format quantity for display (handles decimal rounding and unit pluralization)
 */
export function formatQuantity(parsedQty: ParsedQuantity): string {
  const { quantity, displayUnit } = parsedQty;

  // Round to reasonable precision
  const roundedQty = Math.round(quantity * 100) / 100;

  // Handle singular/plural for count units
  if (parsedQty.category === UnitCategory.COUNT && roundedQty === 1) {
    const singularForms: Record<string, string> = {
      'pcs': 'piece',
      'cloves': 'clove',
      'bunches': 'bunch',
      'packages': 'package',
      'cans': 'can',
      'bottles': 'bottle',
      'jars': 'jar',
      'boxes': 'box',
      'bags': 'bag',
      'heads': 'head',
      'stalks': 'stalk'
    };

    const singular = singularForms[displayUnit];
    if (singular) {
      return `${roundedQty} ${singular}`;
    }
  }

  return `${roundedQty} ${displayUnit}`;
}