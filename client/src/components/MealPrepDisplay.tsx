import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChefHat } from "lucide-react";

interface PrepStep {
  step: number;
  instruction: string;
  estimatedTime: number;
  ingredients: string[];
}

interface MealPrepData {
  prepInstructions: PrepStep[];
  // Legacy fields — may be present on older saved plans
  totalPrepTime?: number;
  shoppingList?: any[];
  storageInstructions?: any[];
}

interface MealPrepDisplayProps {
  mealPrep: MealPrepData;
  planName?: string;
  days?: number;
}

export default function MealPrepDisplay({
  mealPrep,
  planName,
  days,
}: MealPrepDisplayProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNumber: number) => {
    const next = new Set(completedSteps);
    if (next.has(stepNumber)) next.delete(stepNumber);
    else next.add(stepNumber);
    setCompletedSteps(next);
  };

  const steps = mealPrep.prepInstructions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-purple-600" />
          Meal Prep Instructions
          {planName && (
            <span className="text-sm font-normal text-gray-500 ml-1">
              — {planName}
            </span>
          )}
          <Badge variant="secondary" className="ml-auto">
            {completedSteps.size}/{steps.length} done
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-500">
            No prep instructions available for this plan.
          </p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step) => {
              const done = completedSteps.has(step.step);
              return (
                <li
                  key={step.step}
                  className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                    done
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => toggleStep(step.step)}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      done
                        ? "bg-green-500 text-white"
                        : "bg-purple-500 text-white"
                    }`}
                  >
                    {done ? "✓" : step.step}
                  </span>
                  <p
                    className={`text-sm leading-relaxed pt-0.5 ${done ? "line-through text-green-700" : "text-gray-900"}`}
                  >
                    {step.instruction}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
