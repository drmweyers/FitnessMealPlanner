/**
 * Client Ailments Selector Component
 * 
 * Comprehensive interface for selecting multiple health ailments that clients
 * are experiencing. Organizes ailments by categories with search/filter functionality
 * and provides detailed information about nutritional support for each condition.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Info, AlertTriangle, CheckCircle, X, Filter, ChevronDown, ChevronRight } from 'lucide-react';
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
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

import {
  CLIENT_AILMENTS_DATABASE,
  AILMENT_CATEGORIES,
  type ClientAilment,
  type AilmentCategory,
  type AilmentCategoryInfo,
  searchAilments,
  getAilmentNutritionalFocus
} from '../data/clientAilments';

interface ClientAilmentsSelectorProps {
  selectedAilments: string[];
  onSelectionChange: (ailmentIds: string[]) => void;
  maxSelections?: number;
  disabled?: boolean;
  showNutritionalSummary?: boolean;
  showCategoryCount?: boolean;
  className?: string;
}

const ClientAilmentsSelector: React.FC<ClientAilmentsSelectorProps> = ({
  selectedAilments,
  onSelectionChange,
  maxSelections = 10,
  disabled = false,
  showNutritionalSummary = true,
  showCategoryCount = true,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<AilmentCategory>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<AilmentCategory | 'all'>('all');
  const [showMedicalDisclaimer, setShowMedicalDisclaimer] = useState(false);

  // Auto-expand categories that have selected ailments
  useEffect(() => {
    const categoriesToExpand = new Set<AilmentCategory>();
    selectedAilments.forEach(ailmentId => {
      const ailment = CLIENT_AILMENTS_DATABASE.find(a => a.id === ailmentId);
      if (ailment) {
        categoriesToExpand.add(ailment.category);
      }
    });
    setExpandedCategories(categoriesToExpand);
  }, [selectedAilments]);

  // Filter and search functionality
  const filteredAilments = useMemo(() => {
    let ailments = CLIENT_AILMENTS_DATABASE;

    // Apply search filter
    if (searchQuery.trim()) {
      ailments = searchAilments(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      ailments = ailments.filter(ailment => ailment.category === selectedCategory);
    }

    return ailments;
  }, [searchQuery, selectedCategory]);

  // Group filtered ailments by category
  const groupedAilments = useMemo(() => {
    const grouped: Record<AilmentCategory, ClientAilment[]> = {} as Record<AilmentCategory, ClientAilment[]>;
    
    AILMENT_CATEGORIES.forEach(category => {
      grouped[category.id] = filteredAilments.filter(ailment => ailment.category === category.id);
    });

    return grouped;
  }, [filteredAilments]);

  // Calculate nutritional summary
  const nutritionalSummary = useMemo(() => {
    if (selectedAilments.length === 0) return null;
    return getAilmentNutritionalFocus(selectedAilments);
  }, [selectedAilments]);

  // Get selected ailments details
  const selectedAilmentDetails = useMemo(() => {
    return selectedAilments.map(id => CLIENT_AILMENTS_DATABASE.find(a => a.id === id)).filter(Boolean) as ClientAilment[];
  }, [selectedAilments]);

  const handleAilmentToggle = (ailmentId: string, checked: boolean) => {
    if (disabled) return;

    if (checked) {
      if (selectedAilments.length >= maxSelections) {
        alert(`Maximum ${maxSelections} ailments can be selected.`);
        return;
      }
      onSelectionChange([...selectedAilments, ailmentId]);
    } else {
      onSelectionChange(selectedAilments.filter(id => id !== ailmentId));
    }
  };

  const handleCategoryToggle = (category: AilmentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (expandedCategories.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSelectAllInCategory = (category: AilmentCategory) => {
    const categoryAilments = groupedAilments[category];
    const categoryAilmentIds = categoryAilments.map(a => a.id);
    const currentlySelected = categoryAilmentIds.filter(id => selectedAilments.includes(id));
    
    if (currentlySelected.length === categoryAilments.length) {
      // Deselect all in category
      onSelectionChange(selectedAilments.filter(id => !categoryAilmentIds.includes(id)));
    } else {
      // Select all in category (up to max limit)
      const newSelections = [...selectedAilments];
      categoryAilmentIds.forEach(id => {
        if (!newSelections.includes(id) && newSelections.length < maxSelections) {
          newSelections.push(id);
        }
      });
      onSelectionChange(newSelections);
    }
  };

  const clearAllSelections = () => {
    onSelectionChange([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAilmentCard = (ailment: ClientAilment) => {
    const isSelected = selectedAilments.includes(ailment.id);
    
    return (
      <div
        key={ailment.id}
        className={`p-3 border rounded-lg transition-all duration-200 ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-sm' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <Checkbox
            id={ailment.id}
            checked={isSelected}
            onCheckedChange={(checked) => handleAilmentToggle(ailment.id, checked as boolean)}
            disabled={disabled}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={ailment.id}
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                {ailment.name}
              </label>
              <div className="flex items-center space-x-1">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getSeverityColor(ailment.severity)}`}
                >
                  {ailment.severity}
                </Badge>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Info className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <span>{ailment.name}</span>
                        <Badge className={getSeverityColor(ailment.severity)}>
                          {ailment.severity}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription>
                        {ailment.description}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Common Symptoms:</h4>
                        <div className="flex flex-wrap gap-1">
                          {ailment.commonSymptoms.map(symptom => (
                            <Badge key={symptom} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2 text-green-700">Beneficial Foods:</h4>
                          <ul className="text-sm space-y-1">
                            {ailment.nutritionalSupport.beneficialFoods.map(food => (
                              <li key={food} className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>{food}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 text-red-700">Foods to Avoid:</h4>
                          <ul className="text-sm space-y-1">
                            {ailment.nutritionalSupport.avoidFoods.map(food => (
                              <li key={food} className="flex items-center space-x-1">
                                <X className="h-3 w-3 text-red-600" />
                                <span>{food}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Key Nutrients:</h4>
                        <div className="flex flex-wrap gap-1">
                          {ailment.nutritionalSupport.keyNutrients.map(nutrient => (
                            <Badge key={nutrient} variant="secondary" className="text-xs">
                              {nutrient}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {ailment.medicalDisclaimer && (
                        <Alert className="border-amber-200 bg-amber-50">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Medical Disclaimer</AlertTitle>
                          <AlertDescription>
                            {ailment.medicalDisclaimer}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2">{ailment.description}</p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{ailment.commonSymptoms.slice(0, 2).join(', ')}</span>
              {ailment.commonSymptoms.length > 2 && <span>+{ailment.commonSymptoms.length - 2} more</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategorySection = (categoryInfo: AilmentCategoryInfo) => {
    const categoryAilments = groupedAilments[categoryInfo.id];
    const selectedCount = categoryAilments.filter(a => selectedAilments.includes(a.id)).length;
    const isExpanded = expandedCategories.has(categoryInfo.id);
    
    if (categoryAilments.length === 0) return null;

    return (
      <Collapsible
        key={categoryInfo.id}
        open={isExpanded}
        onOpenChange={() => handleCategoryToggle(categoryInfo.id)}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{categoryInfo.icon}</div>
              <div>
                <h3 className="font-medium text-gray-900">{categoryInfo.name}</h3>
                <p className="text-sm text-gray-600">{categoryInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {showCategoryCount && (
                <Badge variant="secondary">
                  {selectedCount}/{categoryAilments.length}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAllInCategory(categoryInfo.id);
                }}
                disabled={disabled}
                className="text-xs"
              >
                {selectedCount === categoryAilments.length ? 'Deselect All' : 'Select All'}
              </Button>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-3 space-y-2">
            {categoryAilments.map(renderAilmentCard)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Client Health Issues</span>
                {selectedAilments.length > 0 && (
                  <Badge variant="secondary">{selectedAilments.length} selected</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Select health conditions that the client is currently experiencing for targeted meal planning
              </CardDescription>
            </div>
            {selectedAilments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllSelections}
                disabled={disabled}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Medical Disclaimer Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Medical Disclaimer</AlertTitle>
            <AlertDescription>
              This tool provides nutritional guidance only and does not replace professional medical advice. 
              Always consult healthcare providers for proper diagnosis and treatment of health conditions.
            </AlertDescription>
          </Alert>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search health conditions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={disabled}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as AilmentCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={disabled}
            >
              <option value="all">All Categories</option>
              {AILMENT_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selection Summary */}
          {selectedAilments.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Selected Conditions:</h4>
              <div className="flex flex-wrap gap-1">
                {selectedAilmentDetails.map(ailment => (
                  <Badge
                    key={ailment.id}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 cursor-pointer"
                    onClick={() => handleAilmentToggle(ailment.id, false)}
                  >
                    {ailment.name}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {maxSelections - selectedAilments.length} more selections available
              </p>
            </div>
          )}

          {/* Category Sections */}
          <div className="space-y-4">
            {AILMENT_CATEGORIES.map(renderCategorySection)}
          </div>

          {/* Nutritional Summary */}
          {showNutritionalSummary && nutritionalSummary && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Nutritional Guidance Summary</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Beneficial Foods
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {nutritionalSummary.beneficialFoods.slice(0, 8).map(food => (
                        <Badge key={food} variant="outline" className="text-xs bg-white">
                          {food}
                        </Badge>
                      ))}
                      {nutritionalSummary.beneficialFoods.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{nutritionalSummary.beneficialFoods.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-2 flex items-center">
                      <X className="h-4 w-4 mr-1" />
                      Foods to Avoid
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {nutritionalSummary.avoidFoods.slice(0, 8).map(food => (
                        <Badge key={food} variant="outline" className="text-xs bg-white">
                          {food}
                        </Badge>
                      ))}
                      {nutritionalSummary.avoidFoods.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{nutritionalSummary.avoidFoods.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h5 className="font-medium text-purple-900 mb-2">Key Nutrients to Focus On</h5>
                  <div className="flex flex-wrap gap-1">
                    {nutritionalSummary.keyNutrients.map(nutrient => (
                      <Badge key={nutrient} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                        {nutrient}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <h5 className="font-medium text-amber-900 mb-2">Meal Plan Focus Areas</h5>
                  <div className="flex flex-wrap gap-1">
                    {nutritionalSummary.mealPlanFocus.map(focus => (
                      <Badge key={focus} variant="outline" className="text-xs bg-white">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {filteredAilments.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conditions found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or category filter
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ClientAilmentsSelector;