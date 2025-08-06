/**
 * Longevity Mode Toggle Component
 * 
 * This component provides controls for enabling and configuring Longevity Mode
 * with anti-aging focused meal planning options including fasting strategies,
 * calorie restriction, and antioxidant preferences.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import {
  Clock,
  Leaf,
  Heart,
  Brain,
  Shield,
  Info,
  Zap,
  Apple,
  Target,
} from 'lucide-react';
import type {
  LongevityModeConfig,
  LongevityToggleProps,
  FastingStrategy,
  CalorieRestrictionLevel,
  AntioxidantFocus,
  LongevityFormData,
} from '../types/specializedProtocols';

// Validation schema for longevity form
const longevitySchema = z.object({
  fastingStrategy: z.enum(['16:8', '18:6', '20:4', 'OMAD', 'ADF', 'none']),
  calorieRestriction: z.enum(['none', 'mild', 'moderate', 'strict']),
  antioxidantFocus: z.array(z.enum(['berries', 'leafyGreens', 'turmeric', 'greenTea', 'colorful', 'all'])),
  includeAntiInflammatory: z.boolean(),
  includeBrainHealth: z.boolean(),
  includeHeartHealth: z.boolean(),
  targetVegetableServings: z.number().min(1).max(15),
  targetAntioxidantServings: z.number().min(1).max(10),
  targetOmega3Servings: z.number().min(1).max(7),
});

// Configuration constants
const FASTING_STRATEGIES: { value: FastingStrategy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'none',
    label: 'No Fasting',
    description: 'Regular eating schedule',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    value: '16:8',
    label: '16:8 Intermittent Fasting',
    description: '16 hours fasting, 8 hours eating window',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    value: '18:6',
    label: '18:6 Intermittent Fasting',
    description: '18 hours fasting, 6 hours eating window',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    value: '20:4',
    label: '20:4 (Warrior Diet)',
    description: '20 hours fasting, 4 hours eating window',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    value: 'OMAD',
    label: 'OMAD (One Meal A Day)',
    description: '23 hours fasting, 1 meal per day',
    icon: <Target className="w-4 h-4" />,
  },
  {
    value: 'ADF',
    label: 'Alternate Day Fasting',
    description: 'Fasting every other day',
    icon: <Zap className="w-4 h-4" />,
  },
];

const CALORIE_RESTRICTION_LEVELS: { value: CalorieRestrictionLevel; label: string; description: string; warning?: string }[] = [
  {
    value: 'none',
    label: 'No Restriction',
    description: 'Maintain normal calorie intake',
  },
  {
    value: 'mild',
    label: 'Mild (5-10%)',
    description: 'Gentle calorie reduction for gradual benefits',
  },
  {
    value: 'moderate',
    label: 'Moderate (15-20%)',
    description: 'Moderate restriction for enhanced longevity',
    warning: 'May require nutritional monitoring',
  },
  {
    value: 'strict',
    label: 'Strict (25-30%)',
    description: 'Significant restriction for maximum benefits',
    warning: 'Requires medical supervision',
  },
];

const ANTIOXIDANT_OPTIONS: { value: AntioxidantFocus; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'berries',
    label: 'Berry Focus',
    description: 'Blueberries, strawberries, blackberries',
    icon: <Apple className="w-4 h-4" />,
  },
  {
    value: 'leafyGreens',
    label: 'Leafy Greens',
    description: 'Spinach, kale, arugula',
    icon: <Leaf className="w-4 h-4" />,
  },
  {
    value: 'turmeric',
    label: 'Turmeric & Curcumin',
    description: 'Anti-inflammatory compounds',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    value: 'greenTea',
    label: 'Green Tea Compounds',
    description: 'EGCG and catechins',
    icon: <Leaf className="w-4 h-4" />,
  },
  {
    value: 'colorful',
    label: 'Colorful Vegetables',
    description: 'Rainbow of antioxidants',
    icon: <Apple className="w-4 h-4" />,
  },
  {
    value: 'all',
    label: 'All Sources',
    description: 'Comprehensive antioxidant approach',
    icon: <Target className="w-4 h-4" />,
  },
];

const LongevityModeToggle: React.FC<LongevityToggleProps> = ({
  config,
  onChange,
  disabled = false,
  showTooltips = true,
}) => {
  const form = useForm<LongevityFormData>({
    resolver: zodResolver(longevitySchema),
    defaultValues: {
      fastingStrategy: config.fastingStrategy,
      calorieRestriction: config.calorieRestriction,
      antioxidantFocus: config.antioxidantFocus,
      includeAntiInflammatory: config.includeAntiInflammatory,
      includeBrainHealth: config.includeBrainHealth,
      includeHeartHealth: config.includeHeartHealth,
      targetVegetableServings: config.targetServings.vegetables,
      targetAntioxidantServings: config.targetServings.antioxidantFoods,
      targetOmega3Servings: config.targetServings.omega3Sources,
    },
  });

  const handleToggleLongevityMode = (enabled: boolean) => {
    onChange({
      ...config,
      isEnabled: enabled,
    });
  };

  const handleFormChange = (data: LongevityFormData) => {
    onChange({
      ...config,
      fastingStrategy: data.fastingStrategy,
      calorieRestriction: data.calorieRestriction,
      antioxidantFocus: data.antioxidantFocus,
      includeAntiInflammatory: data.includeAntiInflammatory,
      includeBrainHealth: data.includeBrainHealth,
      includeHeartHealth: data.includeHeartHealth,
      targetServings: {
        vegetables: data.targetVegetableServings,
        antioxidantFoods: data.targetAntioxidantServings,
        omega3Sources: data.targetOmega3Servings,
      },
    });
  };

  const TooltipWrapper: React.FC<{ children: React.ReactNode; content: string; enabled?: boolean }> = ({ 
    children, 
    content, 
    enabled = showTooltips 
  }) => {
    if (!enabled) return <>{children}</>;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>🔄 Longevity Mode</CardTitle>
                <CardDescription>
                  Anti-aging focused meal planning with fasting and antioxidant optimization
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.isEnabled}
              onCheckedChange={handleToggleLongevityMode}
              disabled={disabled}
              aria-label="Enable Longevity Mode"
            />
          </div>
        </CardHeader>

        {config.isEnabled && (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormChange)} className="space-y-6">
                {/* Fasting Strategy Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <Label className="text-base font-medium">Intermittent Fasting Strategy</Label>
                    <TooltipWrapper content="Intermittent fasting can promote autophagy, cellular repair, and longevity benefits">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipWrapper>
                  </div>
                  <FormField
                    control={form.control}
                    name="fastingStrategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fasting strategy" />
                            </SelectTrigger>
                            <SelectContent>
                              {FASTING_STRATEGIES.map((strategy) => (
                                <SelectItem key={strategy.value} value={strategy.value}>
                                  <div className="flex items-center gap-2">
                                    {strategy.icon}
                                    <div>
                                      <div className="font-medium">{strategy.label}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {strategy.description}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Calorie Restriction Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <Label className="text-base font-medium">Calorie Restriction Level</Label>
                    <TooltipWrapper content="Calorie restriction is one of the most scientifically validated longevity interventions">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipWrapper>
                  </div>
                  <FormField
                    control={form.control}
                    name="calorieRestriction"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select calorie restriction level" />
                            </SelectTrigger>
                            <SelectContent>
                              {CALORIE_RESTRICTION_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  <div>
                                    <div className="font-medium">{level.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {level.description}
                                    </div>
                                    {level.warning && (
                                      <div className="text-xs text-amber-600 font-medium">
                                        ⚠️ {level.warning}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Antioxidant Focus Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <Label className="text-base font-medium">Antioxidant Focus</Label>
                    <TooltipWrapper content="Antioxidants help combat oxidative stress and cellular damage associated with aging">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipWrapper>
                  </div>
                  <FormField
                    control={form.control}
                    name="antioxidantFocus"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ANTIOXIDANT_OPTIONS.map((option) => (
                            <FormField
                              key={option.value}
                              control={form.control}
                              name="antioxidantFocus"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={option.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, option.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== option.value
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="grid gap-1.5 leading-none">
                                      <div className="flex items-center gap-2">
                                        {option.icon}
                                        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                          {option.label}
                                        </Label>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {option.description}
                                      </p>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Health Focus Areas */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Additional Health Focus</Label>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="includeAntiInflammatory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-orange-600" />
                              <FormLabel className="text-base">Anti-Inflammatory Foods</FormLabel>
                            </div>
                            <FormDescription>
                              Include foods that reduce chronic inflammation
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeBrainHealth"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-600" />
                              <FormLabel className="text-base">Brain Health Foods</FormLabel>
                            </div>
                            <FormDescription>
                              Include foods that support cognitive function and neuroprotection
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeHeartHealth"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-red-600" />
                              <FormLabel className="text-base">Heart Health Foods</FormLabel>
                            </div>
                            <FormDescription>
                              Include foods that support cardiovascular health
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Current Configuration Summary */}
                {(config.fastingStrategy !== 'none' || config.calorieRestriction !== 'none' || config.antioxidantFocus.length > 0) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Active Longevity Settings</Label>
                      <div className="flex flex-wrap gap-2">
                        {config.fastingStrategy !== 'none' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {FASTING_STRATEGIES.find(s => s.value === config.fastingStrategy)?.label}
                          </Badge>
                        )}
                        {config.calorieRestriction !== 'none' && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {CALORIE_RESTRICTION_LEVELS.find(l => l.value === config.calorieRestriction)?.label}
                          </Badge>
                        )}
                        {config.antioxidantFocus.map((focus) => (
                          <Badge key={focus} variant="outline" className="flex items-center gap-1">
                            <Leaf className="w-3 h-3" />
                            {ANTIOXIDANT_OPTIONS.find(o => o.value === focus)?.label}
                          </Badge>
                        ))}
                        {config.includeAntiInflammatory && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Anti-Inflammatory
                          </Badge>
                        )}
                        {config.includeBrainHealth && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            Brain Health
                          </Badge>
                        )}
                        {config.includeHeartHealth && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Heart Health
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </form>
            </Form>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
};

export default LongevityModeToggle;