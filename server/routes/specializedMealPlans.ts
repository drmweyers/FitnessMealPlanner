/**
 * Specialized Meal Plans Router
 * 
 * Handles API endpoints for Longevity (Anti-Aging) and Parasite Cleansing meal plans.
 * Extends the existing meal plan system with specialized protocols and safety features.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  LongevityMealPlanService,
  ParasiteCleanseService,
  longevityMealPlanService,
  parasiteCleanseService
} from '../services/specializedMealPlans';

const specializedMealPlanRouter = express.Router();

// Validation schemas
const longevityPlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  duration: z.number().min(7).max(90),
  fastingProtocol: z.enum(['16:8', '18:6', '20:4', 'OMAD', 'ADF', 'none']).default('16:8'),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  primaryGoals: z.array(z.enum([
    'cellular_health', 
    'anti_aging', 
    'cognitive_function', 
    'metabolic_health',
    'inflammation_reduction'
  ])),
  culturalPreferences: z.array(z.string()).optional(),
  currentAge: z.number().min(18).max(100),
  dailyCalorieTarget: z.number().min(1200).max(3500),
  medicalConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  clientName: z.string().optional()
});

const parasitieCleansePlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  duration: z.enum(['7', '14', '30', '90']).default('14'),
  intensity: z.enum(['gentle', 'moderate', 'intensive']).default('gentle'),
  experienceLevel: z.enum(['first_time', 'experienced', 'advanced']).default('first_time'),
  culturalPreferences: z.array(z.string()).optional(),
  supplementTolerance: z.enum(['minimal', 'moderate', 'high']).default('moderate'),
  currentSymptoms: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  pregnancyOrBreastfeeding: z.boolean().default(false),
  healthcareProviderConsent: z.boolean().default(false),
  clientName: z.string().optional()
});

const ailmentsBasedPlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  duration: z.number().min(7).max(90).default(30),
  selectedAilments: z.array(z.string()).min(1, "At least one ailment must be selected"),
  nutritionalFocus: z.object({
    beneficialFoods: z.array(z.string()),
    avoidFoods: z.array(z.string()),
    keyNutrients: z.array(z.string()),
    mealPlanFocus: z.array(z.string())
  }).optional(),
  priorityLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  dailyCalorieTarget: z.number().min(1200).max(3500).default(2000),
  clientName: z.string().optional()
});

// LONGEVITY MEAL PLAN ENDPOINTS

/**
 * POST /api/specialized/longevity/generate
 * Generate a personalized longevity-focused meal plan
 */
specializedMealPlanRouter.post('/longevity/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request body
    const validatedData = longevityPlanSchema.parse(req.body);
    
    // Initialize longevity service
    const longevityService = new LongevityMealPlanService();
    
    // Generate specialized meal plan
    const mealPlan = await longevityService.generateLongevityPlan(validatedData, userId);
    
    // Calculate specialized nutrition metrics
    const nutrition = longevityService.calculateLongevityNutrition(mealPlan);
    
    // Generate fasting schedule
    const fastingSchedule = longevityService.generateFastingSchedule(
      validatedData.fastingProtocol, 
      validatedData.duration
    );

    // Compile lifestyle recommendations (commented out due to private method)
    // const lifestyleRecommendations = longevityService.generateLifestyleRecommendations(validatedData);
    const lifestyleRecommendations = {
      exercise: 'Regular moderate exercise, strength training, flexibility work',
      sleep: '7-9 hours quality sleep, consistent sleep schedule',
      stress: 'Stress management techniques, meditation, social connections'
    };

    res.json({
      mealPlan,
      nutrition,
      fastingSchedule,
      lifestyleRecommendations,
      safetyDisclaimer: {
        title: "Longevity Protocol Safety Information",
        content: "This longevity meal plan is for educational purposes. Consult healthcare providers before starting any new dietary protocol, especially if you have medical conditions or take medications. Intermittent fasting may not be suitable for everyone.",
        acknowledgmentRequired: true
      },
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating longevity meal plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate longevity meal plan', 
      details: errorMessage 
    });
  }
});

/**
 * GET /api/specialized/longevity/protocols
 * Get available longevity protocol templates
 */
specializedMealPlanRouter.get('/longevity/protocols', requireAuth, async (req, res) => {
  try {
    const protocols = await storage.getLongevityProtocolTemplates();
    res.json({ protocols });
  } catch (error) {
    console.error('Error fetching longevity protocols:', error);
    res.status(500).json({ error: 'Failed to fetch longevity protocols' });
  }
});

// PARASITE CLEANSE ENDPOINTS

/**
 * POST /api/specialized/parasite-cleanse/generate
 * Generate a structured parasite cleanse protocol
 */
specializedMealPlanRouter.post('/parasite-cleanse/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request body
    const validatedData = parasitieCleansePlanSchema.parse(req.body);

    // Safety checks
    if (validatedData.pregnancyOrBreastfeeding) {
      return res.status(400).json({
        error: 'Parasite cleanse protocols are not recommended during pregnancy or breastfeeding',
        safetyViolation: true
      });
    }

    if (!validatedData.healthcareProviderConsent && validatedData.medicalConditions?.length) {
      return res.status(400).json({
        error: 'Healthcare provider consultation required for individuals with medical conditions',
        consultationRequired: true
      });
    }

    // Initialize parasite cleanse service
    const cleanseService = new ParasiteCleanseService();
    
    // Generate cleanse protocol
    const cleanseProtocol = await cleanseService.generateCleanseProtocol({
      ...validatedData,
      duration: parseInt(validatedData.duration)
    }, userId);
    
    // Generate daily schedules
    const dailySchedules = cleanseService.generateDailySchedules(
      parseInt(validatedData.duration), 
      validatedData.intensity
    );

    // Compile ingredient sourcing guide
    const ingredientGuide = cleanseService.generateIngredientSourcingGuide();

    // Generate symptom tracking template
    const symptomTracking = cleanseService.generateSymptomTrackingTemplate();

    res.json({
      cleanseProtocol,
      dailySchedules,
      ingredientGuide,
      symptomTracking,
      safetyDisclaimer: {
        title: "Parasite Cleanse Safety Warning",
        content: `⚠️ IMPORTANT MEDICAL DISCLAIMER:
        
        This parasite cleanse protocol is for educational purposes only and does not constitute medical advice. 
        
        REQUIRED BEFORE STARTING:
        • Consult with a qualified healthcare provider
        • Discuss any medications or supplements you're taking
        • Review medical history and current health status
        
        NOT RECOMMENDED FOR:
        • Pregnant or breastfeeding women
        • Children under 18 years
        • Individuals with serious medical conditions
        • Those taking prescription medications without medical supervision
        
        STOP IMMEDIATELY if you experience:
        • Severe abdominal pain
        • Persistent nausea or vomiting
        • Signs of dehydration
        • Any concerning symptoms
        
        By proceeding, you acknowledge these risks and confirm healthcare provider consultation.`,
        acknowledgmentRequired: true,
        severity: 'high'
      },
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating parasite cleanse protocol:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate parasite cleanse protocol', 
      details: errorMessage 
    });
  }
});

/**
 * GET /api/specialized/parasite-cleanse/ingredients
 * Get anti-parasitic ingredients database
 */
specializedMealPlanRouter.get('/parasite-cleanse/ingredients', requireAuth, async (req, res) => {
  try {
    const ingredients = await storage.getAntiParasiticIngredients();
    res.json({ ingredients });
  } catch (error) {
    console.error('Error fetching anti-parasitic ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients database' });
  }
});

/**
 * POST /api/specialized/parasite-cleanse/log-symptoms
 * Log daily symptoms and progress during cleanse
 */
specializedMealPlanRouter.post('/parasite-cleanse/log-symptoms', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const logData = z.object({
      protocolId: z.string().uuid(),
      dayNumber: z.number().min(1),
      energyLevel: z.number().min(1).max(10),
      digestiveComfort: z.number().min(1).max(10),
      sleepQuality: z.number().min(1).max(10),
      symptomsNotes: z.string().optional(),
      sideEffects: z.string().optional(),
      mealsCompleted: z.number().min(0).max(6),
      supplementsTaken: z.boolean().default(false)
    }).parse(req.body);

    await storage.logProtocolSymptoms(userId, logData);
    
    res.json({ 
      success: true, 
      message: 'Symptoms logged successfully' 
    });

  } catch (error) {
    console.error('Error logging symptoms:', error);
    res.status(500).json({ error: 'Failed to log symptoms' });
  }
});

// AILMENTS-BASED MEAL PLAN ENDPOINTS

/**
 * POST /api/specialized/ailments-based/generate
 * Generate a meal plan targeted at specific health ailments
 */
specializedMealPlanRouter.post('/ailments-based/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request body
    const validatedData = ailmentsBasedPlanSchema.parse(req.body);
    
    // Generate ailments-targeted meal plan using existing longevity service with modifications
    const longevityService = new LongevityMealPlanService();
    
    // Create modified parameters that incorporate ailments focus
    const longevityParams = {
      planName: validatedData.planName,
      duration: validatedData.duration,
      fastingProtocol: 'none', // No fasting for health issue targeting
      experienceLevel: 'beginner',
      primaryGoals: ['inflammation_reduction', 'metabolic_health', 'cellular_health'], // Health-focused goals
      culturalPreferences: [],
      currentAge: 35, // Could be made configurable
      dailyCalorieTarget: validatedData.dailyCalorieTarget,
      clientName: validatedData.clientName,
      // Add ailments-specific data
      selectedAilments: validatedData.selectedAilments,
      nutritionalFocus: validatedData.nutritionalFocus,
      priorityLevel: validatedData.priorityLevel
    };
    
    // Generate the meal plan with health focus
    const mealPlan = await longevityService.generateLongevityPlan(longevityParams, userId);
    
    // Calculate nutrition with health focus
    const nutrition = longevityService.calculateLongevityNutrition(mealPlan);
    
    // Generate health-specific recommendations
    const healthRecommendations = generateHealthRecommendations(validatedData);

    res.json({
      mealPlan,
      nutrition,
      healthRecommendations,
      ailmentsTargeted: validatedData.selectedAilments,
      nutritionalFocus: validatedData.nutritionalFocus,
      safetyDisclaimer: {
        title: "Health-Targeted Meal Plan Disclaimer",
        content: "This meal plan is designed to provide nutritional support for the selected health conditions. It is not intended to diagnose, treat, cure, or prevent any disease. Always consult with healthcare professionals for medical advice and treatment. Individual results may vary.",
        acknowledgmentRequired: true
      },
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating ailments-based meal plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate health-targeted meal plan', 
      details: errorMessage 
    });
  }
});

/**
 * Generate health-specific recommendations based on selected ailments
 */
function generateHealthRecommendations(data: any) {
  const { selectedAilments, nutritionalFocus, priorityLevel } = data;
  
  return {
    dietaryGuidelines: {
      emphasize: nutritionalFocus?.beneficialFoods?.slice(0, 10) || [],
      minimize: nutritionalFocus?.avoidFoods?.slice(0, 10) || [],
      keyNutrients: nutritionalFocus?.keyNutrients?.slice(0, 8) || []
    },
    mealTiming: {
      frequency: priorityLevel === 'high' ? '5-6 small meals' : '3 meals + 1-2 snacks',
      hydration: 'Aim for 8-10 glasses of water daily',
      supplements: 'Consider targeted supplements based on nutritional gaps'
    },
    lifestyleFactors: [
      'Regular physical activity appropriate for your conditions',
      'Stress management techniques',
      'Adequate sleep (7-9 hours)',
      'Regular monitoring of symptoms and progress'
    ],
    progressTracking: [
      'Keep a food and symptom diary',
      'Monitor energy levels daily',
      'Track sleep quality',
      'Note any improvements in targeted health areas'
    ]
  };
}

// SHARED ENDPOINTS

/**
 * GET /api/specialized/user-preferences
 * Get user's specialized meal plan preferences
 */
specializedMealPlanRouter.get('/user-preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const preferences = await storage.getUserHealthPreferences(userId);
    res.json({ preferences });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

/**
 * POST /api/specialized/user-preferences
 * Update user's specialized meal plan preferences
 */
specializedMealPlanRouter.post('/user-preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const preferencesSchema = z.object({
      longevityGoals: z.array(z.string()).optional(),
      fastingProtocol: z.string().optional(),
      fastingExperienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      cleanseExperienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      preferredCleanseDuration: z.number().optional(),
      cleanseIntensity: z.enum(['gentle', 'moderate', 'intensive']).optional(),
      culturalFoodPreferences: z.array(z.string()).optional(),
      supplementTolerance: z.enum(['minimal', 'moderate', 'high']).optional(),
      currentMedications: z.array(z.string()).optional(),
      healthConditions: z.array(z.string()).optional(),
      pregnancyBreastfeeding: z.boolean().optional()
    });

    const validatedPreferences = preferencesSchema.parse(req.body);
    
    await storage.updateUserHealthPreferences(userId, validatedPreferences);
    
    res.json({ 
      success: true, 
      message: 'Preferences updated successfully' 
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

/**
 * GET /api/specialized/active-protocols
 * Get user's currently active specialized protocols
 */
specializedMealPlanRouter.get('/active-protocols', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const activeProtocols = await storage.getActiveProtocols(userId);
    res.json({ activeProtocols });
  } catch (error) {
    console.error('Error fetching active protocols:', error);
    res.status(500).json({ error: 'Failed to fetch active protocols' });
  }
});

export { specializedMealPlanRouter };