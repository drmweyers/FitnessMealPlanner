import { Router, Request, Response } from 'express';
import { requireAuth } from './authRoutes';
import { storage } from './storage';
import { users, recipes, personalizedRecipes } from '../shared/schema';

const recipeRouter = Router();

interface AuthRequest extends Request {
  user?: any;
}

recipeRouter.get('/personalized', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.user.id;
    const assignedRecipes = await storage.getPersonalizedRecipes(customerId);
    res.json(assignedRecipes);
  } catch (error) {
    console.error('Error fetching personalized recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default recipeRouter; 