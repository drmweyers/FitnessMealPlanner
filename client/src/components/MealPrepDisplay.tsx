import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  ShoppingCart, 
  ChefHat, 
  Clock, 
  Refrigerator, 
  CheckSquare, 
  Square,
  ArrowRight,
  Timer,
  Package
} from "lucide-react";

interface MealPrepData {
  totalPrepTime: number;
  shoppingList: Array<{
    ingredient: string;
    totalAmount: string;
    unit: string;
    usedInRecipes: string[];
  }>;
  prepInstructions: Array<{
    step: number;
    instruction: string;
    estimatedTime: number;
    ingredients: string[];
  }>;
  storageInstructions: Array<{
    ingredient: string;
    method: string;
    duration: string;
  }>;
}

interface MealPrepDisplayProps {
  mealPrep: MealPrepData;
  planName?: string;
  days?: number;
}

export default function MealPrepDisplay({ mealPrep, planName, days }: MealPrepDisplayProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleShoppingItem = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const togglePrepStep = (stepNumber: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepNumber)) {
      newCompleted.delete(stepNumber);
    } else {
      newCompleted.add(stepNumber);
    }
    setCompletedSteps(newCompleted);
  };

  const categorizeIngredients = (shoppingList: MealPrepData['shoppingList']) => {
    const produce = shoppingList.filter(item => 
      ['tomato', 'lettuce', 'onion', 'garlic', 'pepper', 'carrot', 'spinach', 'broccoli', 'cucumber', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'fruit', 'vegetable', 'herbs', 'basil', 'parsley'].some(keyword => 
        item.ingredient.toLowerCase().includes(keyword)
      )
    );
    
    const proteins = shoppingList.filter(item => 
      ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'egg', 'tofu', 'protein', 'meat', 'turkey', 'shrimp', 'beans', 'lentils'].some(keyword => 
        item.ingredient.toLowerCase().includes(keyword)
      )
    );
    
    const dairy = shoppingList.filter(item => 
      ['milk', 'cheese', 'yogurt', 'butter', 'cream'].some(keyword => 
        item.ingredient.toLowerCase().includes(keyword)
      )
    );
    
    const pantry = shoppingList.filter(item => 
      !produce.includes(item) && !proteins.includes(item) && !dairy.includes(item)
    );

    return { produce, proteins, dairy, pantry };
  };

  const { produce, proteins, dairy, pantry } = categorizeIngredients(mealPrep.shoppingList);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Weekly Meal Prep Guide
            </h2>
            <p className="text-slate-600 mt-1">
              {planName && `${planName} • `}
              {days && `${days}-day cycling plan • `}
              Get ready for your week in {mealPrep.totalPrepTime} minutes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{mealPrep.totalPrepTime}</div>
            <div className="text-sm text-slate-600">Total Prep Time (min)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{mealPrep.shoppingList.length}</div>
            <div className="text-sm text-slate-600">Ingredients to Buy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{mealPrep.prepInstructions.length}</div>
            <div className="text-sm text-slate-600">Prep Steps</div>
          </div>
        </div>
      </div>

      {days && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <ArrowRight className="w-5 h-5" />
              <span className="font-medium">Meal Plan Cycling</span>
            </div>
            <p className="text-orange-600 text-sm">
              This {days}-day plan repeats in cycles. After day {days}, start again from day 1. 
              This meal prep will cover multiple cycles, so you'll be ready for weeks ahead!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Shopping List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Shopping List
            <Badge variant="secondary" className="ml-2">
              {checkedItems.size}/{mealPrep.shoppingList.length} checked
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Produce */}
          {produce.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                🥬 Produce & Fresh Items
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {produce.map((item, index) => {
                  const globalIndex = mealPrep.shoppingList.indexOf(item);
                  const isChecked = checkedItems.has(globalIndex);
                  return (
                    <div 
                      key={globalIndex} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleShoppingItem(globalIndex)}
                    >
                      {isChecked ? 
                        <CheckSquare className="w-5 h-5 text-green-600" /> : 
                        <Square className="w-5 h-5 text-gray-400" />
                      }
                      <div className="flex-1">
                        <div className={`font-medium ${isChecked ? 'line-through' : ''}`}>
                          {item.ingredient}
                        </div>
                        <div className="text-sm text-blue-600">
                          {item.totalAmount} {item.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          Used in: {item.usedInRecipes.slice(0, 2).join(', ')}
                          {item.usedInRecipes.length > 2 && ` +${item.usedInRecipes.length - 2} more`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proteins */}
          {proteins.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                🥩 Proteins & Meat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {proteins.map((item, index) => {
                  const globalIndex = mealPrep.shoppingList.indexOf(item);
                  const isChecked = checkedItems.has(globalIndex);
                  return (
                    <div 
                      key={globalIndex} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleShoppingItem(globalIndex)}
                    >
                      {isChecked ? 
                        <CheckSquare className="w-5 h-5 text-green-600" /> : 
                        <Square className="w-5 h-5 text-gray-400" />
                      }
                      <div className="flex-1">
                        <div className={`font-medium ${isChecked ? 'line-through' : ''}`}>
                          {item.ingredient}
                        </div>
                        <div className="text-sm text-blue-600">
                          {item.totalAmount} {item.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          Used in: {item.usedInRecipes.slice(0, 2).join(', ')}
                          {item.usedInRecipes.length > 2 && ` +${item.usedInRecipes.length - 2} more`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dairy */}
          {dairy.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                🧀 Dairy & Refrigerated
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dairy.map((item, index) => {
                  const globalIndex = mealPrep.shoppingList.indexOf(item);
                  const isChecked = checkedItems.has(globalIndex);
                  return (
                    <div 
                      key={globalIndex} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleShoppingItem(globalIndex)}
                    >
                      {isChecked ? 
                        <CheckSquare className="w-5 h-5 text-green-600" /> : 
                        <Square className="w-5 h-5 text-gray-400" />
                      }
                      <div className="flex-1">
                        <div className={`font-medium ${isChecked ? 'line-through' : ''}`}>
                          {item.ingredient}
                        </div>
                        <div className="text-sm text-blue-600">
                          {item.totalAmount} {item.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          Used in: {item.usedInRecipes.slice(0, 2).join(', ')}
                          {item.usedInRecipes.length > 2 && ` +${item.usedInRecipes.length - 2} more`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pantry Items */}
          {pantry.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-700 mb-3 flex items-center gap-2">
                🥫 Pantry & Dry Goods
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pantry.map((item, index) => {
                  const globalIndex = mealPrep.shoppingList.indexOf(item);
                  const isChecked = checkedItems.has(globalIndex);
                  return (
                    <div 
                      key={globalIndex} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleShoppingItem(globalIndex)}
                    >
                      {isChecked ? 
                        <CheckSquare className="w-5 h-5 text-green-600" /> : 
                        <Square className="w-5 h-5 text-gray-400" />
                      }
                      <div className="flex-1">
                        <div className={`font-medium ${isChecked ? 'line-through' : ''}`}>
                          {item.ingredient}
                        </div>
                        <div className="text-sm text-blue-600">
                          {item.totalAmount} {item.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          Used in: {item.usedInRecipes.slice(0, 2).join(', ')}
                          {item.usedInRecipes.length > 2 && ` +${item.usedInRecipes.length - 2} more`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prep Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-purple-600" />
            Meal Prep Steps
            <Badge variant="secondary" className="ml-2">
              {completedSteps.size}/{mealPrep.prepInstructions.length} completed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mealPrep.prepInstructions.map((step, index) => {
              const isCompleted = completedSteps.has(step.step);
              return (
                <div 
                  key={step.step}
                  className={`flex gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => togglePrepStep(step.step)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isCompleted ? 'bg-green-500 text-white' : 'bg-purple-500 text-white'
                  }`}>
                    {isCompleted ? '✓' : step.step}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm mb-2 ${isCompleted ? 'line-through text-green-700' : 'text-gray-900'}`}>
                      {step.instruction}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {step.estimatedTime} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {step.ingredients.length} ingredients
                      </span>
                    </div>
                    {step.ingredients.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {step.ingredients.map((ingredient, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {ingredient}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Storage Instructions */}
      {mealPrep.storageInstructions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Refrigerator className="w-5 h-5 text-blue-600" />
              Storage Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealPrep.storageInstructions.map((storage, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-900 mb-1">
                    {storage.ingredient}
                  </div>
                  <div className="text-sm text-blue-700 mb-1">
                    {storage.method}
                  </div>
                  <div className="text-xs text-blue-600">
                    Stays fresh: {storage.duration}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}