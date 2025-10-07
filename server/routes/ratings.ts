import express from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { 
  recipeRatings, 
  recipeRatingSummary, 
  ratingHelpfulness,
  users,
  recipes,
  createRatingSchema,
  updateRatingSchema,
  voteHelpfulnessSchema,
  type RecipeRatingWithUser 
} from "@shared/schema";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { z } from "zod";

const router = express.Router();

/**
 * POST /api/ratings/recipes/:recipeId/rate
 * Create or update a rating for a recipe
 */
router.post("/recipes/:recipeId/rate", requireAuth, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const validationResult = createRatingSchema.safeParse({
      ...req.body,
      recipeId
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid rating data",
        details: validationResult.error.issues
      });
    }

    const { rating, reviewText, cookingDifficulty, wouldCookAgain, isHelpful } = validationResult.data;

    // Check if recipe exists
    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
    if (!recipe.length) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Check if user has already rated this recipe
    const existingRating = await db
      .select()
      .from(recipeRatings)
      .where(and(eq(recipeRatings.userId, userId), eq(recipeRatings.recipeId, recipeId)))
      .limit(1);

    const ratingData = {
      userId,
      recipeId,
      rating,
      reviewText: reviewText || null,
      cookingDifficulty: cookingDifficulty || null,
      wouldCookAgain: wouldCookAgain || null,
      isHelpful: isHelpful || false,
      updatedAt: new Date()
    };

    let result;
    if (existingRating.length > 0) {
      // Update existing rating
      result = await db
        .update(recipeRatings)
        .set(ratingData)
        .where(eq(recipeRatings.id, existingRating[0].id))
        .returning();
    } else {
      // Create new rating
      result = await db
        .insert(recipeRatings)
        .values(ratingData)
        .returning();
    }

    // Fetch the complete rating data with user info
    const fullRating = await db
      .select({
        id: recipeRatings.id,
        userId: recipeRatings.userId,
        recipeId: recipeRatings.recipeId,
        rating: recipeRatings.rating,
        reviewText: recipeRatings.reviewText,
        cookingDifficulty: recipeRatings.cookingDifficulty,
        wouldCookAgain: recipeRatings.wouldCookAgain,
        isHelpful: recipeRatings.isHelpful,
        createdAt: recipeRatings.createdAt,
        updatedAt: recipeRatings.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(recipeRatings)
      .innerJoin(users, eq(recipeRatings.userId, users.id))
      .where(eq(recipeRatings.id, result[0].id))
      .limit(1);

    res.status(existingRating.length > 0 ? 200 : 201).json({
      success: true,
      rating: fullRating[0],
      message: existingRating.length > 0 ? "Rating updated successfully" : "Rating created successfully"
    });

  } catch (error) {
    console.error("Error creating/updating rating:", error);
    res.status(500).json({ error: "Failed to save rating" });
  }
});

/**
 * GET /api/ratings/recipes/:recipeId/ratings
 * Get all ratings for a recipe with pagination
 */
router.get("/recipes/:recipeId/ratings", async (req, res) => {
  try {
    const { recipeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'recent'; // recent, helpful, rating_high, rating_low
    const offset = (page - 1) * limit;

    // Check if recipe exists
    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
    if (!recipe.length) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Determine sort order
    let orderBy;
    switch (sortBy) {
      case 'helpful':
        // TODO: Sort by helpfulness votes (requires subquery)
        orderBy = desc(recipeRatings.createdAt);
        break;
      case 'rating_high':
        orderBy = desc(recipeRatings.rating);
        break;
      case 'rating_low':
        orderBy = asc(recipeRatings.rating);
        break;
      case 'recent':
      default:
        orderBy = desc(recipeRatings.createdAt);
        break;
    }

    // Get ratings with user info and helpfulness stats
    const ratingsQuery = db
      .select({
        id: recipeRatings.id,
        userId: recipeRatings.userId,
        recipeId: recipeRatings.recipeId,
        rating: recipeRatings.rating,
        reviewText: recipeRatings.reviewText,
        cookingDifficulty: recipeRatings.cookingDifficulty,
        wouldCookAgain: recipeRatings.wouldCookAgain,
        isHelpful: recipeRatings.isHelpful,
        createdAt: recipeRatings.createdAt,
        updatedAt: recipeRatings.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(recipeRatings)
      .innerJoin(users, eq(recipeRatings.userId, users.id))
      .where(eq(recipeRatings.recipeId, recipeId))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const ratings = await ratingsQuery;

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(recipeRatings)
      .where(eq(recipeRatings.recipeId, recipeId));
    
    const totalCount = totalCountResult[0]?.count || 0;

    // Get helpfulness stats for each rating
    const ratingsWithStats: RecipeRatingWithUser[] = [];
    
    for (const rating of ratings) {
      const helpfulnessStats = await db
        .select({
          isHelpful: ratingHelpfulness.isHelpful,
          count: count()
        })
        .from(ratingHelpfulness)
        .where(eq(ratingHelpfulness.ratingId, rating.id))
        .groupBy(ratingHelpfulness.isHelpful);

      const helpfulCount = helpfulnessStats.find(s => s.isHelpful)?.count || 0;
      const notHelpfulCount = helpfulnessStats.find(s => !s.isHelpful)?.count || 0;

      // Check if current user voted (if authenticated)
      let userVote = undefined;
      if (req.user) {
        const userVoteResult = await db
          .select({ isHelpful: ratingHelpfulness.isHelpful })
          .from(ratingHelpfulness)
          .where(
            and(
              eq(ratingHelpfulness.ratingId, rating.id),
              eq(ratingHelpfulness.userId, req.user.id)
            )
          )
          .limit(1);
        
        userVote = userVoteResult.length > 0 ? userVoteResult[0].isHelpful : undefined;
      }

      ratingsWithStats.push({
        ...rating,
        helpfulnessStats: {
          helpfulCount: Number(helpfulCount),
          notHelpfulCount: Number(notHelpfulCount),
          userVote
        }
      });
    }

    res.json({
      success: true,
      ratings: ratingsWithStats,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        pages: Math.ceil(Number(totalCount) / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

/**
 * PUT /api/ratings/recipes/:recipeId/ratings/:ratingId
 * Update a specific rating (only by the user who created it)
 */
router.put("/recipes/:recipeId/ratings/:ratingId", requireAuth, async (req, res) => {
  try {
    const { recipeId, ratingId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const validationResult = updateRatingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid rating data",
        details: validationResult.error.issues
      });
    }

    // Check if rating exists and belongs to user
    const existingRating = await db
      .select()
      .from(recipeRatings)
      .where(
        and(
          eq(recipeRatings.id, ratingId),
          eq(recipeRatings.userId, userId),
          eq(recipeRatings.recipeId, recipeId)
        )
      )
      .limit(1);

    if (!existingRating.length) {
      return res.status(404).json({ error: "Rating not found or unauthorized" });
    }

    // Update rating
    const updateData = {
      ...validationResult.data,
      updatedAt: new Date()
    };

    const result = await db
      .update(recipeRatings)
      .set(updateData)
      .where(eq(recipeRatings.id, ratingId))
      .returning();

    res.json({
      success: true,
      rating: result[0],
      message: "Rating updated successfully"
    });

  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({ error: "Failed to update rating" });
  }
});

/**
 * DELETE /api/ratings/recipes/:recipeId/ratings/:ratingId
 * Delete a specific rating (only by the user who created it)
 */
router.delete("/recipes/:recipeId/ratings/:ratingId", requireAuth, async (req, res) => {
  try {
    const { recipeId, ratingId } = req.params;
    const userId = req.user!.id;

    // Check if rating exists and belongs to user
    const existingRating = await db
      .select()
      .from(recipeRatings)
      .where(
        and(
          eq(recipeRatings.id, ratingId),
          eq(recipeRatings.userId, userId),
          eq(recipeRatings.recipeId, recipeId)
        )
      )
      .limit(1);

    if (!existingRating.length) {
      return res.status(404).json({ error: "Rating not found or unauthorized" });
    }

    // Delete rating
    await db.delete(recipeRatings).where(eq(recipeRatings.id, ratingId));

    res.json({
      success: true,
      message: "Rating deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting rating:", error);
    res.status(500).json({ error: "Failed to delete rating" });
  }
});

/**
 * GET /api/ratings/recipes/:recipeId/rating-summary
 * Get aggregated rating statistics for a recipe
 */
router.get("/recipes/:recipeId/rating-summary", async (req, res) => {
  try {
    const { recipeId } = req.params;

    // Check if recipe exists
    const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
    if (!recipe.length) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Get rating summary
    const summary = await db
      .select()
      .from(recipeRatingSummary)
      .where(eq(recipeRatingSummary.recipeId, recipeId))
      .limit(1);

    if (!summary.length) {
      // No ratings yet, return default summary
      return res.json({
        success: true,
        summary: {
          recipeId,
          averageRating: 0,
          totalRatings: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          helpfulCount: 0,
          wouldCookAgainCount: 0,
          averageDifficulty: null
        }
      });
    }

    res.json({
      success: true,
      summary: summary[0]
    });

  } catch (error) {
    console.error("Error fetching rating summary:", error);
    res.status(500).json({ error: "Failed to fetch rating summary" });
  }
});

/**
 * POST /api/ratings/:ratingId/vote-helpful
 * Vote on whether a rating/review was helpful
 */
router.post("/:ratingId/vote-helpful", requireAuth, async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const validationResult = voteHelpfulnessSchema.safeParse({
      ...req.body,
      ratingId
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid vote data",
        details: validationResult.error.issues
      });
    }

    const { isHelpful } = validationResult.data;

    // Check if rating exists
    const rating = await db.select().from(recipeRatings).where(eq(recipeRatings.id, ratingId)).limit(1);
    if (!rating.length) {
      return res.status(404).json({ error: "Rating not found" });
    }

    // Check if user already voted on this rating
    const existingVote = await db
      .select()
      .from(ratingHelpfulness)
      .where(
        and(
          eq(ratingHelpfulness.userId, userId),
          eq(ratingHelpfulness.ratingId, ratingId)
        )
      )
      .limit(1);

    if (existingVote.length > 0) {
      // Update existing vote
      await db
        .update(ratingHelpfulness)
        .set({ isHelpful })
        .where(eq(ratingHelpfulness.id, existingVote[0].id));

      res.json({
        success: true,
        message: "Vote updated successfully"
      });
    } else {
      // Create new vote
      await db
        .insert(ratingHelpfulness)
        .values({
          userId,
          ratingId,
          isHelpful
        });

      res.status(201).json({
        success: true,
        message: "Vote recorded successfully"
      });
    }

  } catch (error) {
    console.error("Error voting on helpfulness:", error);
    res.status(500).json({ error: "Failed to record vote" });
  }
});

/**
 * GET /api/ratings/my-ratings
 * Get current user's ratings with pagination
 */
router.get("/my-ratings", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get user's ratings with recipe info
    const ratings = await db
      .select({
        id: recipeRatings.id,
        rating: recipeRatings.rating,
        reviewText: recipeRatings.reviewText,
        cookingDifficulty: recipeRatings.cookingDifficulty,
        wouldCookAgain: recipeRatings.wouldCookAgain,
        isHelpful: recipeRatings.isHelpful,
        createdAt: recipeRatings.createdAt,
        updatedAt: recipeRatings.updatedAt,
        recipe: {
          id: recipes.id,
          name: recipes.name,
          imageUrl: recipes.imageUrl,
          caloriesKcal: recipes.caloriesKcal
        }
      })
      .from(recipeRatings)
      .innerJoin(recipes, eq(recipeRatings.recipeId, recipes.id))
      .where(eq(recipeRatings.userId, userId))
      .orderBy(desc(recipeRatings.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(recipeRatings)
      .where(eq(recipeRatings.userId, userId));
    
    const totalCount = totalCountResult[0]?.count || 0;

    res.json({
      success: true,
      ratings,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        pages: Math.ceil(Number(totalCount) / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching user ratings:", error);
    res.status(500).json({ error: "Failed to fetch user ratings" });
  }
});

export default router;