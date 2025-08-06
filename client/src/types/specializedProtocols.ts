/**
 * TypeScript definitions for Longevity and Parasite Cleanse Protocol features
 * 
 * This file contains all type definitions, interfaces, and enums for the specialized
 * health protocol features in the FitnessMealPlanner application.
 */

// ===== LONGEVITY MODE TYPES =====

export type FastingStrategy = 
  | '16:8'    // 16 hours fasting, 8 hours eating window
  | '18:6'    // 18 hours fasting, 6 hours eating window  
  | '20:4'    // 20 hours fasting, 4 hours eating window
  | 'OMAD'    // One Meal A Day
  | 'ADF'     // Alternate Day Fasting
  | 'none';   // No fasting strategy

export type CalorieRestrictionLevel = 
  | 'none'       // No calorie restriction (0%)
  | 'mild'       // 5-10% reduction
  | 'moderate'   // 15-20% reduction
  | 'strict';    // 25-30% reduction (requires medical supervision)

export type AntioxidantFocus = 
  | 'berries'      // Blueberries, strawberries, blackberries
  | 'leafyGreens'  // Spinach, kale, arugula
  | 'turmeric'     // Curcumin-rich foods
  | 'greenTea'     // Green tea compounds
  | 'colorful'     // Mixed colorful vegetables
  | 'all';         // All antioxidant sources

export interface LongevityModeConfig {
  isEnabled: boolean;
  fastingStrategy: FastingStrategy;
  calorieRestriction: CalorieRestrictionLevel;
  antioxidantFocus: AntioxidantFocus[];
  includeAntiInflammatory: boolean;
  includeBrainHealth: boolean;
  includeHeartHealth: boolean;
  targetServings: {
    vegetables: number;        // Daily servings of vegetables
    antioxidantFoods: number; // Daily servings of high-antioxidant foods
    omega3Sources: number;    // Weekly servings of omega-3 rich foods
  };
}

// ===== PARASITE CLEANSE TYPES =====

export type CleanseDuration = 7 | 14 | 30 | 60 | 90; // Days

export type CleanseIntensity = 
  | 'gentle'     // Mild herbs, gradual approach
  | 'moderate'   // Standard protocol
  | 'intensive'; // Maximum strength (requires supervision)

export type CleansePhase = 
  | 'preparation' // Pre-cleanse preparation (1-7 days)
  | 'elimination' // Active parasite elimination phase
  | 'rebuilding'  // Gut rebuilding phase
  | 'maintenance';// Post-cleanse maintenance

export interface ParasiteCleanseConfig {
  isEnabled: boolean;
  duration: CleanseDuration;
  intensity: CleanseIntensity;
  currentPhase: CleansePhase;
  includeHerbalSupplements: boolean;
  dietOnlyCleanse: boolean;
  startDate: Date | null;
  endDate: Date | null;
  targetFoods: {
    antiParasitic: string[];    // Garlic, oregano, pumpkin seeds, etc.
    probiotics: string[];       // Fermented foods for gut health
    fiberRich: string[];       // To aid elimination
    excludeFoods: string[];    // Sugar, processed foods, etc.
  };
}

// ===== SHARED PROTOCOL TYPES =====

export interface MedicalDisclaimer {
  hasReadDisclaimer: boolean;
  hasConsented: boolean;
  consentTimestamp: Date | null;
  acknowledgedRisks: boolean;
  hasHealthcareProviderApproval: boolean;
  pregnancyScreeningComplete: boolean;
  medicalConditionsScreened: boolean;
}

export interface ProtocolProgress {
  startDate: Date;
  currentDay: number;
  totalDays: number;
  completionPercentage: number;
  symptomsLogged: SymptomLog[];
  measurements: ProgressMeasurement[];
  notes: ProgressNote[];
}

export interface SymptomLog {
  id: string;
  date: Date;
  symptoms: string[];
  severity: 1 | 2 | 3 | 4 | 5; // 1 = mild, 5 = severe
  notes?: string;
  protocolType: 'longevity' | 'parasite-cleanse';
}

export interface ProgressMeasurement {
  id: string;
  date: Date;
  type: 'weight' | 'energy' | 'sleep' | 'digestion' | 'mood';
  value: number; // 1-10 scale or actual measurement
  unit: string;
  notes?: string;
}

export interface ProgressNote {
  id: string;
  date: Date;
  content: string;
  category: 'general' | 'diet' | 'symptoms' | 'improvements';
}

// ===== UI COMPONENT PROPS TYPES =====

export interface LongevityToggleProps {
  config: LongevityModeConfig;
  onChange: (config: LongevityModeConfig) => void;
  disabled?: boolean;
  showTooltips?: boolean;
}

export interface ParasiteCleanseProtocolProps {
  config: ParasiteCleanseConfig;
  onChange: (config: ParasiteCleanseConfig) => void;
  disabled?: boolean;
  onPhaseChange?: (phase: CleansePhase) => void;
}

export interface MedicalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (disclaimer: MedicalDisclaimer) => void;
  protocolType: 'longevity' | 'parasite-cleanse';
  requiredScreenings: string[];
}

export interface ProtocolDashboardProps {
  longevityConfig: LongevityModeConfig;
  parasiteConfig: ParasiteCleanseConfig;
  progress: ProtocolProgress;
  onUpdateProgress: (progress: Partial<ProtocolProgress>) => void;
  onLogSymptom: (symptom: Omit<SymptomLog, 'id'>) => void;
  onAddMeasurement: (measurement: Omit<ProgressMeasurement, 'id'>) => void;
}

export interface SpecializedIngredientSelectorProps {
  selectedIngredients: string[];
  onSelectionChange: (ingredients: string[]) => void;
  protocolType: 'longevity' | 'parasite-cleanse' | 'both';
  maxSelections?: number;
  showCategories?: boolean;
  disabled?: boolean;
}

// ===== FORM VALIDATION TYPES =====

export interface LongevityFormData {
  fastingStrategy: FastingStrategy;
  calorieRestriction: CalorieRestrictionLevel;
  antioxidantFocus: AntioxidantFocus[];
  includeAntiInflammatory: boolean;
  includeBrainHealth: boolean;
  includeHeartHealth: boolean;
  targetVegetableServings: number;
  targetAntioxidantServings: number;
  targetOmega3Servings: number;
}

export interface ParasiteCleanseFormData {
  duration: CleanseDuration;
  intensity: CleanseIntensity;
  includeHerbalSupplements: boolean;
  dietOnlyCleanse: boolean;
  startDate: string; // ISO date string for forms
  antiParasiticFoods: string[];
  probioticFoods: string[];
  fiberRichFoods: string[];
  excludeFoods: string[];
}

// ===== INGREDIENT LIBRARY TYPES =====

export interface SpecializedIngredient {
  id: string;
  name: string;
  category: 'anti-parasitic' | 'antioxidant' | 'anti-inflammatory' | 'probiotic' | 'fiber-rich';
  protocols: ('longevity' | 'parasite-cleanse')[];
  benefits: string[];
  contraindications?: string[];
  maxDailyAmount?: string;
  preparationNotes?: string;
}

export interface IngredientCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  ingredients: SpecializedIngredient[];
  protocolRelevance: ('longevity' | 'parasite-cleanse')[];
}

// ===== ERROR AND VALIDATION TYPES =====

export interface ProtocolValidationError {
  field: string;
  message: string;
  code: 'REQUIRED' | 'INVALID_RANGE' | 'MEDICAL_APPROVAL_REQUIRED' | 'CONTRAINDICATION';
}

export interface ProtocolSafetyWarning {
  type: 'medical' | 'pregnancy' | 'interaction' | 'intensity';
  message: string;
  severity: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

// ===== MEAL PLAN INTEGRATION TYPES =====

export interface SpecializedMealPlanRequest {
  longevityMode?: LongevityModeConfig;
  parasiteCleanseMode?: ParasiteCleanseConfig;
  baseRequirements: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  allergies: string[];
  dietaryRestrictions: string[];
  mealCount: number;
  duration: number; // days
}

export interface ProtocolMealPlan {
  id: string;
  name: string;
  protocolType: 'longevity' | 'parasite-cleanse' | 'combined';
  duration: number;
  meals: ProtocolMeal[];
  nutritionSummary: {
    dailyAverages: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      antioxidants: number; // ORAC units
    };
    protocolCompliance: {
      longevity?: number; // 0-100% compliance score
      parasiteCleanse?: number; // 0-100% compliance score
    };
  };
}

export interface ProtocolMeal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipes: string[]; // recipe IDs
  protocolBenefits: string[];
  fastingWindowCompliant: boolean;
  antiParasiticScore: number; // 1-10
  antioxidantScore: number; // 1-10
}

// ===== EXPORT ALL TYPES =====

export type ProtocolType = 'longevity' | 'parasite-cleanse' | 'combined';

export type SpecializedProtocolConfig = {
  longevity: LongevityModeConfig;
  parasiteCleanse: ParasiteCleanseConfig;
  medical: MedicalDisclaimer;
  progress: ProtocolProgress;
};