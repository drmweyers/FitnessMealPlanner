/**
 * Specialized Ingredient Selector Component
 * 
 * This component provides an advanced ingredient selection interface specifically
 * designed for longevity and parasite cleanse protocols, featuring categorized
 * ingredients with health benefits, contraindications, and usage guidelines.
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Search,
  Filter,
  Info,
  Star,
  AlertTriangle,
  Leaf,
  Apple,
  Shield,
  Heart,
  Brain,
  Zap,
  Target,
  CheckCircle,
  X,
  Plus,
} from 'lucide-react';
import type {
  SpecializedIngredientSelectorProps,
  SpecializedIngredient,
  IngredientCategory,
} from '../types/specializedProtocols';

// Ingredient database
const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  {
    id: 'anti-parasitic',
    name: 'Anti-Parasitic Foods',
    description: 'Foods traditionally used to combat parasites and support elimination',
    icon: '🪱',
    protocolRelevance: ['parasite-cleanse'],
    ingredients: [
      {
        id: 'garlic',
        name: 'Garlic',
        category: 'anti-parasitic',
        protocols: ['parasite-cleanse'],
        benefits: ['Strong antimicrobial properties', 'Supports immune system', 'Contains allicin'],
        contraindications: ['Blood thinners', 'GERD/acid reflux'],
        maxDailyAmount: '2-3 cloves',
        preparationNotes: 'Best consumed raw or lightly cooked. Crush and let sit 10 minutes to activate allicin.',
      },
      {
        id: 'oregano',
        name: 'Oregano Oil/Fresh',
        category: 'anti-parasitic',
        protocols: ['parasite-cleanse'],
        benefits: ['Potent antifungal', 'Antiparasitic compounds', 'Digestive support'],
        contraindications: ['Pregnancy', 'Iron deficiency'],
        maxDailyAmount: '1-2 drops oil or 1 tsp fresh',
        preparationNotes: 'Oil form is very potent - dilute properly. Fresh herb is gentler.',
      },
      {
        id: 'pumpkin-seeds',
        name: 'Pumpkin Seeds',
        category: 'anti-parasitic',
        protocols: ['parasite-cleanse'],
        benefits: ['Traditional deworming remedy', 'Rich in zinc', 'Cucurbitacin compounds'],
        maxDailyAmount: '1-2 oz (28-56g)',
        preparationNotes: 'Raw or lightly toasted. Can be ground into powder.',
      },
      {
        id: 'coconut-oil',
        name: 'Coconut Oil',
        category: 'anti-parasitic',
        protocols: ['parasite-cleanse'],
        benefits: ['Medium-chain fatty acids', 'Lauric acid antimicrobial', 'Supports gut health'],
        maxDailyAmount: '2-3 tablespoons',
        preparationNotes: 'Start with small amounts. Virgin, unrefined preferred.',
      },
      {
        id: 'papaya-seeds',
        name: 'Papaya Seeds',
        category: 'anti-parasitic',
        protocols: ['parasite-cleanse'],
        benefits: ['Enzyme-rich', 'Traditional antiparasitic', 'Digestive support'],
        maxDailyAmount: '1 teaspoon ground seeds',
        preparationNotes: 'Dry and grind seeds. Very bitter - mix with honey or smoothie.',
      },
      {
        id: 'wormwood',
        name: 'Wormwood Tea',
        category: 'anti-parasitic',
        protocols: ['parasite-cleanse'],
        benefits: ['Traditional bitter herb', 'Antimicrobial properties', 'Digestive stimulant'],
        contraindications: ['Pregnancy', 'Breastfeeding', 'Seizure disorders', 'Kidney disease'],
        maxDailyAmount: '1 cup tea or as directed',
        preparationNotes: 'Use under supervision. Very bitter. Not for long-term use.',
      },
    ],
  },
  {
    id: 'antioxidant-superfoods',
    name: 'Antioxidant Superfoods',
    description: 'High-antioxidant foods for longevity and cellular protection',
    icon: '🫐',
    protocolRelevance: ['longevity'],
    ingredients: [
      {
        id: 'blueberries',
        name: 'Blueberries',
        category: 'antioxidant',
        protocols: ['longevity'],
        benefits: ['High anthocyanins', 'Brain health', 'Anti-inflammatory', 'ORAC score: 9,621'],
        maxDailyAmount: '1 cup fresh or 1/2 cup dried',
        preparationNotes: 'Fresh or frozen. Organic preferred to avoid pesticides.',
      },
      {
        id: 'goji-berries',
        name: 'Goji Berries',
        category: 'antioxidant',
        protocols: ['longevity'],
        benefits: ['Zeaxanthin for eye health', 'Adaptogenic properties', 'Vitamin C rich'],
        maxDailyAmount: '1-2 tablespoons dried',
        preparationNotes: 'Soak dried berries or add to smoothies and teas.',
      },
      {
        id: 'acai-berries',
        name: 'Acai Berries',
        category: 'antioxidant',
        protocols: ['longevity'],
        benefits: ['Highest ORAC values', 'Healthy fats', 'Anthocyanins'],
        maxDailyAmount: '100g frozen pulp',
        preparationNotes: 'Available frozen or powder form. Mix into smoothie bowls.',
      },
      {
        id: 'dark-chocolate',
        name: 'Dark Chocolate (85%+)',
        category: 'antioxidant',
        protocols: ['longevity'],
        benefits: ['Flavanols', 'Heart health', 'Cognitive benefits'],
        contraindications: ['Caffeine sensitivity', 'Migraines'],
        maxDailyAmount: '20-30g (1-2 squares)',
        preparationNotes: 'Choose 85% cacao or higher. Organic and fair-trade preferred.',
      },
    ],
  },
  {
    id: 'anti-inflammatory',
    name: 'Anti-Inflammatory Foods',
    description: 'Foods that help reduce chronic inflammation and support longevity',
    icon: '🧄',
    protocolRelevance: ['longevity', 'parasite-cleanse'],
    ingredients: [
      {
        id: 'turmeric',
        name: 'Turmeric/Curcumin',
        category: 'anti-inflammatory',
        protocols: ['longevity', 'parasite-cleanse'],
        benefits: ['Powerful anti-inflammatory', 'Antioxidant properties', 'Joint health'],
        contraindications: ['Blood thinners', 'Gallstones', 'GERD'],
        maxDailyAmount: '1-3g curcumin or 1-2 tsp powder',
        preparationNotes: 'Combine with black pepper and fat for absorption. Golden milk recipe.',
      },
      {
        id: 'ginger',
        name: 'Fresh Ginger',
        category: 'anti-inflammatory',
        protocols: ['longevity', 'parasite-cleanse'],
        benefits: ['Digestive support', 'Anti-nausea', 'Anti-inflammatory gingerols'],
        contraindications: ['Blood thinners', 'Gallstones'],
        maxDailyAmount: '1-4g fresh or 1-2 tsp powder',
        preparationNotes: 'Fresh root preferred. Grate into teas, smoothies, or cooking.',
      },
      {
        id: 'green-tea',
        name: 'Green Tea',
        category: 'anti-inflammatory',
        protocols: ['longevity'],
        benefits: ['EGCG catechins', 'Metabolic support', 'Neuroprotective'],
        contraindications: ['Iron deficiency', 'Caffeine sensitivity'],
        maxDailyAmount: '2-3 cups or 300-400mg EGCG',
        preparationNotes: 'Steep 3-5 minutes at 175°F. Organic, high-quality leaves preferred.',
      },
    ],
  },
  {
    id: 'probiotics-prebiotics',
    name: 'Gut Health Foods',
    description: 'Fermented and fiber-rich foods for microbiome support',
    icon: '🥬',
    protocolRelevance: ['parasite-cleanse'],
    ingredients: [
      {
        id: 'sauerkraut',
        name: 'Raw Sauerkraut',
        category: 'probiotic',
        protocols: ['parasite-cleanse'],
        benefits: ['Live probiotics', 'Vitamin K2', 'Digestive enzymes'],
        maxDailyAmount: '2-4 tablespoons',
        preparationNotes: 'Must be raw/unpasteurized. Refrigerated section. Start small.',
      },
      {
        id: 'kefir',
        name: 'Kefir',
        category: 'probiotic',
        protocols: ['parasite-cleanse'],
        benefits: ['Multiple probiotic strains', 'Bioactive compounds', 'Protein'],
        contraindications: ['Dairy sensitivity'],
        maxDailyAmount: '1 cup',
        preparationNotes: 'Water kefir available for dairy-free option.',
      },
      {
        id: 'kimchi',
        name: 'Kimchi',
        category: 'probiotic',
        protocols: ['parasite-cleanse'],
        benefits: ['Lacto-fermented vegetables', 'Vitamin C', 'Spicy compounds'],
        maxDailyAmount: '2-4 tablespoons',
        preparationNotes: 'Traditional fermented version. Check for live cultures.',
      },
      {
        id: 'psyllium-husk',
        name: 'Psyllium Husk',
        category: 'fiber-rich',
        protocols: ['parasite-cleanse'],
        benefits: ['Soluble fiber', 'Toxin binding', 'Bowel regularity'],
        maxDailyAmount: '1-2 teaspoons with plenty of water',
        preparationNotes: 'MUST drink with ample water. Start with small amounts.',
      },
    ],
  },
  {
    id: 'brain-health',
    name: 'Brain Health Foods',
    description: 'Foods specifically beneficial for cognitive function and neuroprotection',
    icon: '🧠',
    protocolRelevance: ['longevity'],
    ingredients: [
      {
        id: 'wild-salmon',
        name: 'Wild-Caught Salmon',
        category: 'anti-inflammatory',
        protocols: ['longevity'],
        benefits: ['Omega-3 DHA/EPA', 'High-quality protein', 'Astaxanthin'],
        maxDailyAmount: '4-6 oz, 2-3 times per week',
        preparationNotes: 'Wild-caught preferred. Check for mercury levels.',
      },
      {
        id: 'walnuts',
        name: 'Walnuts',
        category: 'antioxidant',
        protocols: ['longevity'],
        benefits: ['ALA omega-3s', 'Vitamin E', 'Cognitive support'],
        maxDailyAmount: '1 oz (handful)',
        preparationNotes: 'Raw or lightly toasted. Store in refrigerator to prevent rancidity.',
      },
      {
        id: 'lions-mane',
        name: "Lion's Mane Mushroom",
        category: 'anti-inflammatory',
        protocols: ['longevity'],
        benefits: ['Nerve growth factor', 'Neuroprotective', 'Cognitive enhancement'],
        maxDailyAmount: '500-1000mg extract or 1 cup cooked',
        preparationNotes: 'Fresh, dried, or supplement form. Cook like seafood.',
      },
    ],
  },
];

// Helper functions
const getAllIngredients = (): SpecializedIngredient[] => {
  return INGREDIENT_CATEGORIES.flatMap(category => category.ingredients);
};

const filterIngredientsByProtocol = (ingredients: SpecializedIngredient[], protocol: 'longevity' | 'parasite-cleanse' | 'both'): SpecializedIngredient[] => {
  if (protocol === 'both') {
    return ingredients.filter(ingredient => 
      ingredient.protocols.includes('longevity') && ingredient.protocols.includes('parasite-cleanse')
    );
  }
  return ingredients.filter(ingredient => ingredient.protocols.includes(protocol));
};

const SpecializedIngredientSelector: React.FC<SpecializedIngredientSelectorProps> = ({
  selectedIngredients,
  onSelectionChange,
  protocolType,
  maxSelections,
  showCategories = true,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const allIngredients = getAllIngredients();
  
  const filteredIngredients = useMemo(() => {
    let ingredients = protocolType === 'both' 
      ? allIngredients 
      : filterIngredientsByProtocol(allIngredients, protocolType);
    
    if (searchTerm) {
      ingredients = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.benefits.some(benefit => benefit.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (activeCategory !== 'all') {
      ingredients = ingredients.filter(ingredient => ingredient.category === activeCategory);
    }
    
    return ingredients;
  }, [allIngredients, protocolType, searchTerm, activeCategory]);

  const relevantCategories = useMemo(() => {
    return INGREDIENT_CATEGORIES.filter(category => {
      if (protocolType === 'both') return true;
      return category.protocolRelevance.includes(protocolType);
    });
  }, [protocolType]);

  const handleIngredientToggle = (ingredientId: string) => {
    if (disabled) return;
    
    const isSelected = selectedIngredients.includes(ingredientId);
    let newSelection: string[];
    
    if (isSelected) {
      newSelection = selectedIngredients.filter(id => id !== ingredientId);
    } else {
      if (maxSelections && selectedIngredients.length >= maxSelections) {
        return; // Don't add if at max capacity
      }
      newSelection = [...selectedIngredients, ingredientId];
    }
    
    onSelectionChange(newSelection);
  };

  const getSelectionInfo = () => {
    const selected = selectedIngredients.length;
    const max = maxSelections || 'unlimited';
    return `${selected}${maxSelections ? `/${max}` : ''} selected`;
  };

  const IngredientCard: React.FC<{ ingredient: SpecializedIngredient }> = ({ ingredient }) => {
    const isSelected = selectedIngredients.includes(ingredient.id);
    const isMaxReached = maxSelections && selectedIngredients.length >= maxSelections && !isSelected;
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-primary bg-primary/5' 
            : isMaxReached 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-muted/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !isMaxReached && handleIngredientToggle(ingredient.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Checkbox
                checked={isSelected}
                disabled={disabled || isMaxReached}
                className="pointer-events-none"
              />
              {ingredient.name}
            </CardTitle>
            <Dialog open={showDetails === ingredient.id} onOpenChange={(open) => setShowDetails(open ? ingredient.id : null)}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {ingredient.name}
                    <Badge variant="outline" className="capitalize">
                      {ingredient.category.replace('-', ' ')}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Benefits
                    </Label>
                    <ul className="mt-1 text-sm space-y-1">
                      {ingredient.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {ingredient.contraindications && (
                    <div>
                      <Label className="text-sm font-medium text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Contraindications
                      </Label>
                      <ul className="mt-1 text-sm space-y-1">
                        {ingredient.contraindications.map((contraindication, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            {contraindication}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {ingredient.maxDailyAmount && (
                    <div>
                      <Label className="text-sm font-medium text-blue-600 flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Recommended Daily Amount
                      </Label>
                      <p className="mt-1 text-sm">{ingredient.maxDailyAmount}</p>
                    </div>
                  )}
                  
                  {ingredient.preparationNotes && (
                    <div>
                      <Label className="text-sm font-medium text-purple-600 flex items-center gap-1">
                        <Leaf className="w-4 h-4" />
                        Preparation Notes
                      </Label>
                      <p className="mt-1 text-sm">{ingredient.preparationNotes}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {ingredient.protocols.map(protocol => (
                      <Badge key={protocol} variant="secondary" className="capitalize">
                        {protocol.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {ingredient.protocols.map(protocol => (
              <Badge key={protocol} variant="outline" className="text-xs capitalize">
                {protocol.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {ingredient.benefits.slice(0, 2).join(', ')}
              {ingredient.benefits.length > 2 && '...'}
            </div>
            {ingredient.contraindications && ingredient.contraindications.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                <span>Has contraindications</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg font-semibold">Specialized Ingredients</Label>
            <p className="text-sm text-muted-foreground">
              Select ingredients optimized for your {protocolType.replace('-', ' ')} protocol
            </p>
          </div>
          <Badge variant="secondary">
            {getSelectionInfo()}
          </Badge>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients or benefits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {showCategories && (
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {relevantCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Max selections warning */}
        {maxSelections && selectedIngredients.length >= maxSelections && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Maximum Selection Reached</AlertTitle>
            <AlertDescription>
              You've selected the maximum number of ingredients ({maxSelections}). 
              Deselect an ingredient to choose a different one.
            </AlertDescription>
          </Alert>
        )}

        {/* Ingredients Grid */}
        {showCategories ? (
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              {relevantCategories.slice(0, 4).map(category => (
                <TabsTrigger key={category.id} value={category.id} className="text-xs">
                  <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
                  <span className="sm:hidden">{category.icon}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="mt-4">
              <ScrollArea className="h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                  {filteredIngredients.map(ingredient => (
                    <IngredientCard key={ingredient.id} ingredient={ingredient} />
                  ))}
                </div>
                {filteredIngredients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No ingredients found matching your criteria.
                  </div>
                )}
              </ScrollArea>
            </div>
          </Tabs>
        ) : (
          <ScrollArea className="h-96">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
              {filteredIngredients.map(ingredient => (
                <IngredientCard key={ingredient.id} ingredient={ingredient} />
              ))}
            </div>
            {filteredIngredients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No ingredients found matching your criteria.
              </div>
            )}
          </ScrollArea>
        )}

        {/* Selected Ingredients Summary */}
        {selectedIngredients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected Ingredients Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedIngredients.map(ingredientId => {
                  const ingredient = allIngredients.find(i => i.id === ingredientId);
                  if (!ingredient) return null;
                  
                  return (
                    <Badge key={ingredient.id} variant="secondary" className="flex items-center gap-1">
                      {ingredient.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleIngredientToggle(ingredient.id)}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SpecializedIngredientSelector;