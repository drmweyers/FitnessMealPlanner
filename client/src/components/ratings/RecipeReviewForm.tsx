import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import StarRating from './StarRating';
import { apiRequest } from '../../lib/queryClient';
import { toast } from '../../hooks/use-toast';
import { Loader2, Edit3, Plus } from 'lucide-react';
import type { RecipeRating, CreateRating, UpdateRating } from '@shared/schema';

interface RecipeReviewFormProps {
  recipeId: string;
  existingRating?: RecipeRating;
  onSuccess?: (rating: RecipeRating) => void;
  onCancel?: () => void;
  className?: string;
}

export default function RecipeReviewForm({
  recipeId,
  existingRating,
  onSuccess,
  onCancel,
  className
}: RecipeReviewFormProps) {
  const [formData, setFormData] = useState({
    rating: existingRating?.rating || 0,
    reviewText: existingRating?.reviewText || '',
    cookingDifficulty: existingRating?.cookingDifficulty || 0,
    wouldCookAgain: existingRating?.wouldCookAgain || false,
    isHelpful: existingRating?.isHelpful || false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const queryClient = useQueryClient();

  const createRatingMutation = useMutation({
    mutationFn: async (data: CreateRating | UpdateRating) => {
      const endpoint = existingRating 
        ? `/api/recipes/${recipeId}/ratings/${existingRating.id}`
        : `/api/recipes/${recipeId}/rate`;
      
      const method = existingRating ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: existingRating ? 'Rating Updated' : 'Rating Added',
        description: existingRating 
          ? 'Your rating has been updated successfully.' 
          : 'Thank you for rating this recipe!',
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/recipes/${recipeId}/ratings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/recipes/${recipeId}/rating-summary`] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/my-ratings'] });
      
      onSuccess?.(data.rating);
    },
    onError: (error: any) => {
      console.error('Rating submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save rating. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a star rating before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const submitData = existingRating ? {
      rating: formData.rating,
      reviewText: formData.reviewText.trim() || undefined,
      cookingDifficulty: formData.cookingDifficulty || undefined,
      wouldCookAgain: formData.wouldCookAgain,
      isHelpful: formData.isHelpful,
    } : {
      recipeId,
      rating: formData.rating,
      reviewText: formData.reviewText.trim() || undefined,
      cookingDifficulty: formData.cookingDifficulty || undefined,
      wouldCookAgain: formData.wouldCookAgain,
      isHelpful: formData.isHelpful,
    };

    createRatingMutation.mutate(submitData as CreateRating | UpdateRating);
  }, [formData, recipeId, existingRating, createRatingMutation]);

  const handleRatingChange = useCallback((rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  }, []);

  const handleReviewTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, reviewText: e.target.value }));
  }, []);

  const handleDifficultyChange = useCallback((difficulty: number) => {
    setFormData(prev => ({ ...prev, cookingDifficulty: difficulty }));
  }, []);

  const isSubmitting = createRatingMutation.isPending;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {existingRating ? (
            <>
              <Edit3 className="w-5 h-5" />
              Update Your Rating
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Rate This Recipe
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Your Rating *</Label>
            <StarRating
              rating={formData.rating}
              onRatingChange={handleRatingChange}
              size="lg"
              showValue={true}
              className="justify-start"
            />
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="reviewText" className="text-base font-medium">
              Write a Review (Optional)
            </Label>
            <Textarea
              id="reviewText"
              value={formData.reviewText}
              onChange={handleReviewTextChange}
              placeholder="Share your thoughts about this recipe. How did it turn out? Any tips for other cooks?"
              className="min-h-[100px] resize-none"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              {formData.reviewText.length}/1000 characters
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showAdvanced"
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
              disabled={isSubmitting}
            />
            <Label htmlFor="showAdvanced" className="text-sm cursor-pointer">
              Show additional options
            </Label>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              {/* Cooking Difficulty */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Cooking Difficulty (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={formData.cookingDifficulty}
                    onRatingChange={handleDifficultyChange}
                    size="sm"
                    showValue={false}
                  />
                  <span className="text-sm text-gray-600">
                    {formData.cookingDifficulty === 0 ? 'Not rated' : 
                     formData.cookingDifficulty === 1 ? 'Very Easy' :
                     formData.cookingDifficulty === 2 ? 'Easy' :
                     formData.cookingDifficulty === 3 ? 'Medium' :
                     formData.cookingDifficulty === 4 ? 'Hard' : 'Very Hard'}
                  </span>
                </div>
              </div>

              {/* Would Cook Again */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wouldCookAgain"
                  checked={formData.wouldCookAgain}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, wouldCookAgain: !!checked }))
                  }
                  disabled={isSubmitting}
                />
                <Label htmlFor="wouldCookAgain" className="text-sm cursor-pointer">
                  I would cook this recipe again
                </Label>
              </div>

              {/* Recipe Helpful */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isHelpful"
                  checked={formData.isHelpful}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isHelpful: !!checked }))
                  }
                  disabled={isSubmitting}
                />
                <Label htmlFor="isHelpful" className="text-sm cursor-pointer">
                  This recipe was helpful for my fitness goals
                </Label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || formData.rating === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {existingRating ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                existingRating ? 'Update Rating' : 'Submit Rating'
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}