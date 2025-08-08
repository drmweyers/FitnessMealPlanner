/**
 * Parasite Cleanse Protocol Component
 * 
 * This component provides controls for configuring and monitoring parasite cleanse
 * protocols with different durations, intensities, and dietary approaches.
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
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Bug,
  Calendar,
  Zap,
  Shield,
  AlertTriangle,
  Info,
  Clock,
  Target,
  Leaf,
  Pill,
  Apple,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Heart,
} from 'lucide-react';
import type {
  ParasiteCleanseConfig,
  ParasiteCleanseProtocolProps,
  CleanseDuration,
  CleanseIntensity,
  CleansePhase,
  ParasiteCleanseFormData,
} from '../types/specializedProtocols';

// Validation schema
const parasiteCleanseSchema = z.object({
  duration: z.number().refine((val) => [7, 14, 30, 60, 90].includes(val)),
  intensity: z.enum(['gentle', 'moderate', 'intensive']),
  includeHerbalSupplements: z.boolean(),
  dietOnlyCleanse: z.boolean(),
  startDate: z.string().optional(),
  antiParasiticFoods: z.array(z.string()),
  probioticFoods: z.array(z.string()),
  fiberRichFoods: z.array(z.string()),
  excludeFoods: z.array(z.string()),
});

// Configuration constants
const CLEANSE_DURATIONS: { value: CleanseDuration; label: string; description: string; recommendation: string }[] = [
  {
    value: 7,
    label: '7 Days (Gentle Start)',
    description: 'Short introduction to cleansing',
    recommendation: 'Best for beginners or sensitive systems',
  },
  {
    value: 14,
    label: '14 Days (Standard)',
    description: 'Typical cleanse duration',
    recommendation: 'Good balance of effectiveness and manageability',
  },
  {
    value: 30,
    label: '30 Days (Comprehensive)',
    description: 'Thorough cleansing protocol',
    recommendation: 'For more established cleansers',
  },
  {
    value: 60,
    label: '60 Days (Extended)',
    description: 'Deep cleansing approach',
    recommendation: 'Requires experience and medical consultation',
  },
  {
    value: 90,
    label: '90 Days (Maximum)',
    description: 'Complete lifecycle approach',
    recommendation: 'Only with healthcare provider supervision',
  },
];

const CLEANSE_INTENSITIES: { value: CleanseIntensity; label: string; description: string; warning?: string }[] = [
  {
    value: 'gentle',
    label: 'Gentle',
    description: 'Mild approach with food-based methods',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Standard protocol with some herbal support',
  },
  {
    value: 'intensive',
    label: 'Intensive',
    description: 'Strong protocol with full herbal support',
    warning: 'Requires healthcare provider supervision',
  },
];

const CLEANSE_PHASES: { value: CleansePhase; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'preparation',
    label: 'Preparation',
    description: 'Pre-cleanse preparation and diet adjustment',
    icon: <Target className="w-4 h-4" />,
  },
  {
    value: 'elimination',
    label: 'Active Elimination',
    description: 'Active parasite elimination phase',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    value: 'rebuilding',
    label: 'Gut Rebuilding',
    description: 'Restore and rebuild gut health',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    description: 'Post-cleanse maintenance protocol',
    icon: <CheckCircle className="w-4 h-4" />,
  },
];

const ANTI_PARASITIC_FOODS = [
  { value: 'garlic', label: 'Garlic', category: 'Strong antimicrobial' },
  { value: 'oregano', label: 'Oregano', category: 'Antifungal & antiparasitic' },
  { value: 'pumpkin-seeds', label: 'Pumpkin Seeds', category: 'Traditional remedy' },
  { value: 'coconut', label: 'Coconut Oil', category: 'Medium-chain fatty acids' },
  { value: 'papaya-seeds', label: 'Papaya Seeds', category: 'Enzyme-rich' },
  { value: 'wormwood', label: 'Wormwood Tea', category: 'Traditional bitter herb' },
  { value: 'cloves', label: 'Cloves', category: 'Antimicrobial spice' },
  { value: 'ginger', label: 'Ginger', category: 'Digestive support' },
];

const PROBIOTIC_FOODS = [
  { value: 'kefir', label: 'Kefir', category: 'Fermented dairy' },
  { value: 'sauerkraut', label: 'Sauerkraut', category: 'Fermented vegetables' },
  { value: 'kimchi', label: 'Kimchi', category: 'Fermented vegetables' },
  { value: 'kombucha', label: 'Kombucha', category: 'Fermented tea' },
  { value: 'miso', label: 'Miso', category: 'Fermented soy' },
  { value: 'tempeh', label: 'Tempeh', category: 'Fermented soy' },
];

const FIBER_RICH_FOODS = [
  { value: 'chia-seeds', label: 'Chia Seeds', category: 'Soluble fiber' },
  { value: 'flax-seeds', label: 'Flax Seeds', category: 'Binding fiber' },
  { value: 'psyllium', label: 'Psyllium Husk', category: 'Bulking fiber' },
  { value: 'berries', label: 'Berries', category: 'Natural fiber' },
  { value: 'vegetables', label: 'Cruciferous Vegetables', category: 'Detox support' },
];

const EXCLUDE_FOODS = [
  { value: 'sugar', label: 'Sugar & Sweeteners', category: 'Feeds parasites' },
  { value: 'refined-carbs', label: 'Refined Carbohydrates', category: 'Promotes growth' },
  { value: 'alcohol', label: 'Alcohol', category: 'Weakens immune system' },
  { value: 'processed-foods', label: 'Processed Foods', category: 'Hard to digest' },
  { value: 'dairy', label: 'Dairy Products', category: 'Can be inflammatory' },
];

const ParasiteCleanseProtocol: React.FC<ParasiteCleanseProtocolProps> = ({
  config,
  onChange,
  disabled = false,
  onPhaseChange,
}) => {
  const form = useForm<ParasiteCleanseFormData>({
    resolver: zodResolver(parasiteCleanseSchema),
    defaultValues: {
      duration: config.duration,
      intensity: config.intensity,
      includeHerbalSupplements: config.includeHerbalSupplements,
      dietOnlyCleanse: config.dietOnlyCleanse,
      startDate: config.startDate?.toISOString().split('T')[0] || '',
      antiParasiticFoods: config.targetFoods.antiParasitic,
      probioticFoods: config.targetFoods.probiotics,
      fiberRichFoods: config.targetFoods.fiberRich,
      excludeFoods: config.targetFoods.excludeFoods,
    },
  });

  const handleToggleCleanse = (enabled: boolean) => {
    onChange({
      ...config,
      isEnabled: enabled,
    });
  };

  const handleFormChange = (data: ParasiteCleanseFormData) => {
    onChange({
      ...config,
      duration: data.duration as CleanseDuration,
      intensity: data.intensity,
      includeHerbalSupplements: data.includeHerbalSupplements,
      dietOnlyCleanse: data.dietOnlyCleanse,
      startDate: data.startDate ? new Date(data.startDate) : null,
      targetFoods: {
        antiParasitic: data.antiParasiticFoods,
        probiotics: data.probioticFoods,
        fiberRich: data.fiberRichFoods,
        excludeFoods: data.excludeFoods,
      },
    });
  };

  const calculateProgress = (): number => {
    if (!config.startDate || !config.endDate) return 0;
    const now = new Date();
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const getDaysRemaining = (): number => {
    if (!config.endDate) return config.duration;
    const now = new Date();
    const end = new Date(config.endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getCurrentPhase = (): CleansePhase => {
    const progress = calculateProgress();
    if (progress < 15) return 'preparation';
    if (progress < 75) return 'elimination';
    if (progress < 90) return 'rebuilding';
    return 'maintenance';
  };

  const TooltipWrapper: React.FC<{ children: React.ReactNode; content: string }> = ({ 
    children, 
    content 
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-orange-600" />
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>🪱 Parasite Cleanse Protocol</CardTitle>
                <CardDescription>
                  Comprehensive parasite elimination and gut health restoration
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.isEnabled}
              onCheckedChange={handleToggleCleanse}
              disabled={disabled}
              aria-label="Enable Parasite Cleanse Protocol"
            />
          </div>
        </CardHeader>

        {config.isEnabled && (
          <CardContent>
            {/* Safety Warning */}
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important Medical Disclaimer</AlertTitle>
              <AlertDescription>
                This protocol is for educational purposes only and should not replace professional medical advice. 
                Consult with a healthcare provider before beginning any cleanse, especially if you have medical conditions, 
                are pregnant, or are taking medications.
              </AlertDescription>
            </Alert>

            {/* Progress Tracking (if active) */}
            {config.startDate && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">Cleanse Progress</Label>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {CLEANSE_PHASES.find(p => p.value === getCurrentPhase())?.icon}
                    {CLEANSE_PHASES.find(p => p.value === getCurrentPhase())?.label}
                  </Badge>
                </div>
                <Progress value={calculateProgress()} className="mb-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Day {config.duration - getDaysRemaining() + 1} of {config.duration}</span>
                  <span>{getDaysRemaining()} days remaining</span>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormChange)} className="space-y-6">
                {/* Duration Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <Label className="text-base font-medium">Cleanse Duration</Label>
                    <TooltipWrapper content="Longer durations may be more effective but require greater commitment and supervision">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipWrapper>
                  </div>
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value.toString()}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cleanse duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {CLEANSE_DURATIONS.map((duration) => (
                                <SelectItem key={duration.value} value={duration.value.toString()}>
                                  <div>
                                    <div className="font-medium">{duration.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {duration.description}
                                    </div>
                                    <div className="text-xs text-blue-600">
                                      {duration.recommendation}
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

                {/* Intensity Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <Label className="text-base font-medium">Cleanse Intensity</Label>
                    <TooltipWrapper content="Higher intensities may be more effective but can cause stronger detox reactions">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipWrapper>
                  </div>
                  <FormField
                    control={form.control}
                    name="intensity"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cleanse intensity" />
                            </SelectTrigger>
                            <SelectContent>
                              {CLEANSE_INTENSITIES.map((intensity) => (
                                <SelectItem key={intensity.value} value={intensity.value}>
                                  <div>
                                    <div className="font-medium">{intensity.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {intensity.description}
                                    </div>
                                    {intensity.warning && (
                                      <div className="text-xs text-amber-600 font-medium">
                                        ⚠️ {intensity.warning}
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

                {/* Protocol Options */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Protocol Options</Label>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="includeHerbalSupplements"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-green-600" />
                              <FormLabel className="text-base">Include Herbal Supplements</FormLabel>
                            </div>
                            <FormDescription>
                              Add traditional antiparasitic herbs like wormwood, black walnut, and cloves
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
                      name="dietOnlyCleanse"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Apple className="w-4 h-4 text-red-600" />
                              <FormLabel className="text-base">Diet-Only Cleanse</FormLabel>
                            </div>
                            <FormDescription>
                              Focus solely on dietary changes without herbal supplements
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

                <Separator />

                {/* Start Date */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Start Date (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormDescription>
                          Set a start date to track progress and phases
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Food Categories */}
                <div className="space-y-6">
                  <Label className="text-base font-medium">Food Categories</Label>
                  
                  {/* Anti-Parasitic Foods */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-orange-600">✓ Include: Anti-Parasitic Foods</Label>
                    <FormField
                      control={form.control}
                      name="antiParasiticFoods"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ANTI_PARASITIC_FOODS.map((food) => (
                              <FormField
                                key={food.value}
                                control={form.control}
                                name="antiParasiticFoods"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(food.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, food.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== food.value
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="grid gap-1.5 leading-none">
                                      <Label className="text-sm font-medium">
                                        {food.label}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">
                                        {food.category}
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Probiotic Foods */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-blue-600">✓ Include: Probiotic Foods</Label>
                    <FormField
                      control={form.control}
                      name="probioticFoods"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PROBIOTIC_FOODS.map((food) => (
                              <FormField
                                key={food.value}
                                control={form.control}
                                name="probioticFoods"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(food.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, food.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== food.value
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="grid gap-1.5 leading-none">
                                      <Label className="text-sm font-medium">
                                        {food.label}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">
                                        {food.category}
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Foods to Exclude */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-red-600">✗ Exclude: Foods to Avoid</Label>
                    <FormField
                      control={form.control}
                      name="excludeFoods"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {EXCLUDE_FOODS.map((food) => (
                              <FormField
                                key={food.value}
                                control={form.control}
                                name="excludeFoods"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(food.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, food.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== food.value
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="grid gap-1.5 leading-none">
                                      <Label className="text-sm font-medium">
                                        {food.label}
                                      </Label>
                                      <p className="text-xs text-muted-foreground">
                                        {food.category}
                                      </p>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Current Configuration Summary */}
                {config.isEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Active Protocol Settings</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {config.duration} Days
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {config.intensity.charAt(0).toUpperCase() + config.intensity.slice(1)} Intensity
                        </Badge>
                        {config.includeHerbalSupplements && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Pill className="w-3 h-3" />
                            Herbal Supplements
                          </Badge>
                        )}
                        {config.dietOnlyCleanse && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Apple className="w-3 h-3" />
                            Diet Only
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

export default ParasiteCleanseProtocol;