import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import StarRating from './StarRating';
import { apiRequest } from '../../lib/queryClient';
import { toast } from '../../hooks/use-toast';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Calendar, 
  ChefHat, 
  Heart,
  MoreHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { RecipeRatingWithUser } from '@shared/schema';

interface RecipeReviewsListProps {
  recipeId: string;
  currentUserId?: string;
  className?: string;
}

type SortOption = 'recent' | 'helpful' | 'rating_high' | 'rating_low';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'rating_high', label: 'Highest Rated' },
  { value: 'rating_low', label: 'Lowest Rated' }
];

export default function RecipeReviewsList({
  recipeId,
  currentUserId,
  className
}: RecipeReviewsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  // Fetch reviews
  const { data: reviewsData, isLoading, error } = useQuery({
    queryKey: [`/api/recipes/${recipeId}/ratings`, page, sortBy],
    queryFn: async () => {
      const response = await apiRequest('GET', 
        `/api/recipes/${recipeId}/ratings?page=${page}&limit=10&sortBy=${sortBy}`
      );
      return response.json();
    },
  });

  // Vote on helpfulness
  const voteHelpfulnessMutation = useMutation({
    mutationFn: async ({ ratingId, isHelpful }: { ratingId: string; isHelpful: boolean }) => {
      const response = await apiRequest('POST', `/api/ratings/${ratingId}/vote-helpful`, {
        isHelpful
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/recipes/${recipeId}/ratings`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record vote',
        variant: 'destructive',
      });
    },
  });

  const handleVoteHelpful = (ratingId: string, isHelpful: boolean) => {
    voteHelpfulnessMutation.mutate({ ratingId, isHelpful });
  };

  const toggleReviewExpansion = (ratingId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(ratingId)) {
      newExpanded.delete(ratingId);
    } else {
      newExpanded.add(ratingId);
    }
    setExpandedReviews(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-red-600">Failed to load reviews</p>
      </div>
    );
  }

  const reviews = reviewsData?.ratings || [];
  const totalReviews = reviewsData?.pagination?.total || 0;
  const hasMore = page < (reviewsData?.pagination?.pages || 1);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Reviews ({totalReviews.toLocaleString()})
        </h3>
        
        {totalReviews > 0 && (
          <Select value={sortBy} onValueChange={(value: SortOption) => {
            setSortBy(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-gray-200 rounded"></div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              <ChefHat className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h4 className="font-medium mb-2">No reviews yet</h4>
              <p className="text-sm">Be the first to share your experience with this recipe!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: RecipeRatingWithUser, index: number) => {
            const isExpanded = expandedReviews.has(review.id);
            const reviewText = review.reviewText || '';
            const shouldShowExpansion = reviewText.length > 200;
            const displayText = shouldShowExpansion && !isExpanded 
              ? reviewText.substring(0, 200) + '...'
              : reviewText;

            return (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Review Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StarRating 
                            rating={review.rating} 
                            readonly 
                            size="sm"
                          />
                          <Badge variant="outline" className="text-xs">
                            {review.rating}/5
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">
                            {review.user.name || review.user.email.split('@')[0]}
                          </span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(review.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Text */}
                    {reviewText && (
                      <div className="space-y-2">
                        <p className="text-gray-700 leading-relaxed">
                          {displayText}
                        </p>
                        {shouldShowExpansion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReviewExpansion(review.id)}
                            className="h-6 px-2 text-xs text-primary"
                          >
                            {isExpanded ? (
                              <>
                                Show Less <ChevronUp className="w-3 h-3 ml-1" />
                              </>
                            ) : (
                              <>
                                Show More <ChevronDown className="w-3 h-3 ml-1" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Additional Review Details */}
                    <div className="flex flex-wrap gap-2">
                      {review.cookingDifficulty && (
                        <Badge variant="outline" className="text-xs">
                          Difficulty: {review.cookingDifficulty}/5
                        </Badge>
                      )}
                      
                      {review.wouldCookAgain && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          Would cook again
                        </Badge>
                      )}
                      
                      {review.isHelpful && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          <Heart className="w-3 h-3 mr-1" />
                          Helpful for fitness goals
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    {/* Helpfulness Voting */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Was this helpful?</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={review.helpfulnessStats.userVote === true ? "default" : "outline"}
                            onClick={() => handleVoteHelpful(review.id, true)}
                            disabled={!currentUserId || voteHelpfulnessMutation.isPending}
                            className="h-8 px-3"
                          >
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            {review.helpfulnessStats.helpfulCount || 0}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant={review.helpfulnessStats.userVote === false ? "default" : "outline"}
                            onClick={() => handleVoteHelpful(review.id, false)}
                            disabled={!currentUserId || voteHelpfulnessMutation.isPending}
                            className="h-8 px-3"
                          >
                            <ThumbsDown className="w-3 h-3 mr-1" />
                            {review.helpfulnessStats.notHelpfulCount || 0}
                          </Button>
                        </div>
                      </div>

                      {!currentUserId && (
                        <p className="text-xs text-gray-500">
                          Sign in to vote on reviews
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setPage(prev => prev + 1)}
                disabled={isLoading}
              >
                Load More Reviews
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}