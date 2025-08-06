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