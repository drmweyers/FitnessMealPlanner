import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import RecipeAssignment from "./RecipeAssignment";
import type { Recipe } from "@shared/schema";

interface RecipeListItemWithAssignmentProps {
  recipe: Recipe;
  onClick: () => void;
  showAssignment?: boolean;
}

export default function RecipeListItemWithAssignment({ 
  recipe, 
  onClick, 
  showAssignment = true 
}: RecipeListItemWithAssignmentProps) {
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAssignmentModal(true);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer">
        <CardContent className="p-4" onClick={onClick}>
          <div className="flex items-start space-x-4">
            {/* Recipe Image */}
            <div className="flex-shrink-0">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-utensils text-xl text-orange-400"></i>
                </div>
              )}
            </div>

            {/* Recipe Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1">
                    {recipe.name}
                  </h3>
                  
                  {/* Meal Types */}
                  {recipe.mealTypes && recipe.mealTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.mealTypes.slice(0, 3).map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                      {recipe.mealTypes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.mealTypes.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-fire text-orange-500 text-xs"></i>
                      <span>{recipe.caloriesKcal} cal</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-clock text-blue-500 text-xs"></i>
                      <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes}m</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-dumbbell text-green-500 text-xs"></i>
                      <span>{recipe.proteinGrams}g protein</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-users text-purple-500 text-xs"></i>
                      <span>{recipe.servings} servings</span>
                    </div>
                  </div>
                </div>

                {/* Assignment Button */}
                {showAssignment && (
                  <div className="flex-shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAssignClick}
                      className="text-xs"
                    >
                      <i className="fas fa-user-plus mr-2"></i>
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      <Dialog open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Recipe: {recipe.name}</DialogTitle>
          </DialogHeader>
          <RecipeAssignment recipe={recipe} />
        </DialogContent>
      </Dialog>
    </>
  );
} 