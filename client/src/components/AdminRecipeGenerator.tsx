import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Sparkles, Database, Target, Zap, Clock } from "lucide-react";
import { z } from "zod";

const adminRecipeGenerationSchema = z.object({
  count: z.number().min(1).max(50).default(10),
  mealType: z.string().optional(),
  dietaryTag: z.string().optional(),
  maxPrepTime: z.number().optional(),
  maxCalories: z.number().optional(),
  minCalories: z.number().optional(),
  minProtein: z.number().optional(),
  maxProtein: z.number().optional(),
  minCarbs: z.number().optional(),
  maxCarbs: z.number().optional(),
  minFat: z.number().optional(),
  maxFat: z.number().optional(),
  focusIngredient: z.string().optional(),
  difficulty: z.string().optional(),
});

type AdminRecipeGeneration = z.infer<typeof adminRecipeGenerationSchema>;

interface GenerationResult {
  message: string;
  count: number;
  started: boolean;
}

export default function AdminRecipeGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const form = useForm<AdminRecipeGeneration>({
    resolver: zodResolver(adminRecipeGenerationSchema),
    defaultValues: {
      count: 10,
    },
  });

  const generateRecipes = useMutation({
    mutationFn: async (data: AdminRecipeGeneration): Promise<GenerationResult> => {
      const response = await fetch('/api/admin/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start recipe generation');
      }
      
      return response.json();
    },
    onSuccess: (data: GenerationResult) => {
      setLastGeneration(data);
      toast({
        title: "Recipe Generation Started",
        description: data.message,
      });
      
      // Refresh all recipe data after generation completes
      setTimeout(() => {
        queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/recipes' });
        queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
        
        setTimeout(() => {
          queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/recipes' });
          queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
        }, 8000);
      }, 15000);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkGenerate = useMutation({
    mutationFn: async (count: number): Promise<GenerationResult> => {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start bulk generation');
      }
      
      return response.json();
    },
    onSuccess: (data: GenerationResult) => {
      setLastGeneration(data);
      toast({
        title: "Bulk Generation Started",
        description: data.message,
      });
      
      // Refresh all recipe data after generation completes
      setTimeout(() => {
        queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/recipes' });
        queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
        
        setTimeout(() => {
          queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/recipes' });
          queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
        }, 8000);
      }, 15000);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminRecipeGeneration) => {
    generateRecipes.mutate(data);
  };

  const handleBulkGenerate = (count: number) => {
    bulkGenerate.mutate(count);
  };

  const handleRefreshStats = () => {
    // Force immediate refresh of all recipe data
    queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/recipes' });
    queryClient.refetchQueries({ predicate: (query) => query.queryKey[0] === '/api/admin/stats' });
    toast({
      title: "Recipes Refreshed",
      description: "Recipe database has been updated with new recipes",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle>AI Recipe Generator</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-sm`}></i>
            </Button>
          </div>
          {!isCollapsed && (
            <CardDescription>
              Generate custom recipes using AI based on specific dietary requirements and nutritional targets.
            </CardDescription>
          )}
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Generation Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Number of Recipes
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Generate 1-50 recipes per batch</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="focusIngredient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Ingredient</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., chicken, salmon, quinoa" {...field} />
                      </FormControl>
                      <FormDescription>Optional main ingredient to focus on</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || 'all'}
                          onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any Difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Difficulty</SelectItem>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Recipe Type Filters */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-4">Recipe Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Meals" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Meals</SelectItem>
                              <SelectItem value="breakfast">Breakfast</SelectItem>
                              <SelectItem value="lunch">Lunch</SelectItem>
                              <SelectItem value="dinner">Dinner</SelectItem>
                              <SelectItem value="snack">Snack</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dietaryTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dietary Focus</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Diets" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Diets</SelectItem>
                              <SelectItem value="vegetarian">Vegetarian</SelectItem>
                              <SelectItem value="vegan">Vegan</SelectItem>
                              <SelectItem value="keto">Keto</SelectItem>
                              <SelectItem value="paleo">Paleo</SelectItem>
                              <SelectItem value="gluten-free">Gluten Free</SelectItem>
                              <SelectItem value="low-carb">Low Carb</SelectItem>
                              <SelectItem value="high-protein">High Protein</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPrepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Max Prep Time
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Time</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Max Calories
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value?.toString() || 'all'}
                            onValueChange={(value) => field.onChange(value === 'all' ? undefined : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any Amount" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Amount</SelectItem>
                              <SelectItem value="300">Under 300</SelectItem>
                              <SelectItem value="500">Under 500</SelectItem>
                              <SelectItem value="800">Under 800</SelectItem>
                              <SelectItem value="1200">Under 1200</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Macro Nutrient Targets */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Nutritional Targets (per serving)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Protein */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Protein (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minProtein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxProtein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Max</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Carbohydrates */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Carbohydrates (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minCarbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxCarbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Max</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-slate-600">Fat (g)</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minFat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Min</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxFat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Max</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="∞"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={generateRecipes.isPending}
                size="lg"
              >
                {generateRecipes.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Recipes...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Custom Recipes
                  </>
                )}
              </Button>
            </form>
          </Form>
          </CardContent>
        )}
      </Card>

      {/* Quick Bulk Generation */}
      {!isCollapsed && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quick Bulk Generation
          </CardTitle>
          <CardDescription>
            Generate multiple recipes quickly with default fitness-focused parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[10, 20, 30, 50].map((count) => (
              <Button
                key={count}
                variant="outline"
                onClick={() => handleBulkGenerate(count)}
                disabled={bulkGenerate.isPending}
                className="h-16 flex flex-col items-center justify-center"
              >
                <span className="text-lg font-bold">{count}</span>
                <span className="text-xs text-slate-600">recipes</span>
              </Button>
            ))}
          </div>
        </CardContent>
        </Card>
      )}

      {/* Generation Status */}
      {lastGeneration && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Generation Status</span>
            </div>
            <p className="text-green-600 mt-2">{lastGeneration.message}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="secondary">
                {lastGeneration.count} recipes requested
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStats}
                className="text-xs"
              >
                Refresh Stats
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}