import express from 'express';
import { parseNaturalLanguageForMealPlan } from '../services/openai';
import { MealPlanGeneratorService } from '../services/mealPlanGenerator';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import type { MealPlanGeneration } from '@shared/schema';

const mealPlanRouter = express.Router();

mealPlanRouter.post('/parse-natural-language', async (req, res) => {
  const { naturalLanguageInput } = req.body;

  if (!naturalLanguageInput) {
    return res.status(400).json({ error: 'naturalLanguageInput is required' });
  }

  try {
    console.log("Parsing natural language input:", naturalLanguageInput);
    const parsedData = await parseNaturalLanguageForMealPlan(naturalLanguageInput);
    console.log("Successfully parsed data:", parsedData);
    res.json(parsedData);
  } catch (error) {
    console.error('Error parsing natural language input:', error);
    res.status(500).json({ error: 'Failed to parse natural language input' });
  }
});

mealPlanRouter.post('/generate', requireAuth, async (req, res) => {
  const mealPlanParams = req.body as MealPlanGeneration;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const mealPlanService = new MealPlanGeneratorService();
    
    console.log('Generating meal plan with params:', mealPlanParams);
    const mealPlan = await mealPlanService.generateMealPlan(mealPlanParams, userId);

    console.log('Calculating nutrition for generated meal plan...');
    const nutrition = mealPlanService.calculateMealPlanNutrition(mealPlan);

    console.log('Meal plan generated successfully.');
    res.json({ 
      mealPlan,
      nutrition,
      message: 'Meal plan generated successfully',
      completed: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to generate meal plan', details: errorMessage });
  }
});

// GET /api/meal-plan/personalized - Fetch meal plans assigned to the logged-in customer
mealPlanRouter.get('/personalized', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const mealPlans = await storage.getPersonalizedMealPlans(userId);
    
    // Enhance meal plans with additional metadata for better display
    const enhancedMealPlans = mealPlans.map(plan => ({
      ...plan,
      planName: plan.mealPlanData?.planName || 'Unnamed Plan',
      fitnessGoal: plan.mealPlanData?.fitnessGoal || 'General Fitness',
      dailyCalorieTarget: plan.mealPlanData?.dailyCalorieTarget || 0,
      totalDays: plan.mealPlanData?.days || 0,
      mealsPerDay: plan.mealPlanData?.mealsPerDay || 0,
      assignedAt: plan.assignedAt || new Date().toISOString(),
      isActive: true, // Could be enhanced with actual status tracking
      description: plan.mealPlanData?.description,
    }));
    
    res.json({ 
      mealPlans: enhancedMealPlans, 
      total: enhancedMealPlans.length,
      summary: {
        totalPlans: enhancedMealPlans.length,
        activePlans: enhancedMealPlans.filter(p => p.isActive).length,
        totalCalorieTargets: enhancedMealPlans.reduce((sum, p) => sum + (p.dailyCalorieTarget || 0), 0),
        avgCaloriesPerDay: enhancedMealPlans.length > 0 
          ? Math.round(enhancedMealPlans.reduce((sum, p) => sum + (p.dailyCalorieTarget || 0), 0) / enhancedMealPlans.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch personalized meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch personalized meal plans' });
  }
});

export { mealPlanRouter }; 