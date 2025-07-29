import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import RecipeAssignment from "./RecipeAssignment";
import type { Recipe } from "@shared/schema";

interface RecipeCardWithAssignmentProps {
  recipe: Recipe;
  onClick: () => void;
  showAssignment?: boolean;
}

export default function RecipeCardWithAssignment({ 
  recipe, 
  onClick, 
  showAssignment = true 
}: RecipeCardWithAssignmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    e.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200 hover:border-slate-300">
        <div className="relative">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-48 object-cover rounded-t-xl"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 rounded-t-xl flex items-center justify-center">
              <i className="fas fa-utensils text-4xl text-orange-400"></i>
            </div>
          )}
          
          {/* Assignment button overlay */}
          {showAssignment && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAssignClick}
                className="h-8 px-2 bg-white/90 hover:bg-white shadow-sm border border-slate-200"
              >
                <i className="fas fa-user-plus text-xs"></i>
              </Button>
            </div>
          )}
        </div>

        <CardContent className="p-4" onClick={onClick}>
          <div className="space-y-3">
            {/* Recipe Name */}
            <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight">
              {recipe.name}
            </h3>

            {/* Meal Types */}
            {recipe.mealTypes && recipe.mealTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.mealTypes.slice(0, 2).map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs px-2 py-1">
                    {type}
                  </Badge>
                ))}
                {recipe.mealTypes.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    +{recipe.mealTypes.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
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

            {/* Assignment Action */}
            {showAssignment && (
              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={handleAssignClick}
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Assign to Customers
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <i className="fas fa-utensils text-blue-600"></i>
              <span>Assign Recipe to Customers</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
            <h4 className="font-semibold text-slate-900 mb-2">{recipe.name}</h4>
            <div className="flex flex-wrap gap-2">
              {recipe.mealTypes?.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              <span className="mr-4">🔥 {recipe.caloriesKcal} cal</span>
              <span className="mr-4">⏰ {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
              <span>👥 {recipe.servings} servings</span>
            </div>
          </div>
          <RecipeAssignment recipe={recipe} />
        </DialogContent>
      </Dialog>
    </>
  );
} 