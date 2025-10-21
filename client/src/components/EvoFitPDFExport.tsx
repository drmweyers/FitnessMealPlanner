/**
 * EvoFit PDF Export Component
 * 
 * Server-side PDF generation using Puppeteer for professional EvoFit branded meal plans
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { useToast } from '../hooks/use-toast';
import { 
  Download, 
  FileText, 
  Loader2, 
  Settings,
  ChefHat,
  Printer,
  Share
} from 'lucide-react';
import { saveAs } from 'file-saver';

interface ExportOptions {
  includeShoppingList?: boolean;
  includeMacroSummary?: boolean;
  includeRecipePhotos?: boolean;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
}

interface EvoFitPDFExportProps {
  mealPlan?: any;
  mealPlans?: any[];
  customerName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  planId?: string; // For server-side retrieval
}

export default function EvoFitPDFExport({
  mealPlan,
  mealPlans,
  customerName,
  variant = 'outline',
  size = 'default',
  className = '',
  children,
  planId
}: EvoFitPDFExportProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Export options with EvoFit defaults
  const [options, setOptions] = useState<ExportOptions>({
    includeShoppingList: true,
    includeMacroSummary: true,
    includeRecipePhotos: false, // Disabled for performance
    orientation: 'portrait',
    pageSize: 'A4'
  });

  const isMultiple = mealPlans && mealPlans.length > 0;
  const isSingle = mealPlan && !isMultiple;
  const isServerSide = !!planId;

  /**
   * Quick export with default settings
   */
  const handleQuickExport = async () => {
    if (!isSingle && !isMultiple && !isServerSide) {
      toast({
        title: 'No Data',
        description: 'No meal plan data available for export.',
        variant: 'destructive',
      });
      return;
    }

    await executeExport({
      includeShoppingList: true,
      includeMacroSummary: true,
      includeRecipePhotos: false,
      orientation: 'portrait',
      pageSize: 'A4'
    });
  };

  /**
   * Custom export with user-selected options
   */
  const handleCustomExport = async () => {
    await executeExport(options);
    setShowOptions(false);
  };

  /**
   * Execute the PDF export with specified options
   */
  const executeExport = async (exportOptions: ExportOptions) => {
    console.log('[PDF Export] Starting export...');
    console.log('[PDF Export] isSingle:', isSingle, 'isMultiple:', isMultiple, 'isServerSide:', isServerSide);
    console.log('[PDF Export] mealPlan:', mealPlan ? 'exists' : 'null');
    console.log('[PDF Export] Export options:', exportOptions);

    setIsExporting(true);

    try {
      let response: Response;

      if (isServerSide && planId) {
        // Server-side meal plan retrieval and export
        response = await fetch(`/api/pdf/export/meal-plan/${planId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            options: exportOptions
          })
        });
      } else if (isSingle) {
        // Single meal plan export
        console.log('[PDF Export] Calling single meal plan export API');
        console.log('[PDF Export] Endpoint: /api/pdf/export');
        console.log('[PDF Export] Meal plan name:', mealPlan.planName || 'Unnamed');
        console.log('[PDF Export] Customer name:', customerName);

        response = await fetch('/api/pdf/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            mealPlanData: mealPlan,
            customerName,
            options: exportOptions
          })
        });

        console.log('[PDF Export] Response status:', response.status);
      } else if (isMultiple) {
        // Multiple meal plans export
        const combinedMealPlan = {
          planName: `${customerName || 'Customer'} Meal Plans Collection`,
          fitnessGoal: 'comprehensive_nutrition',
          description: `Collection of ${mealPlans!.length} meal plans`,
          dailyCalorieTarget: Math.round(
            mealPlans!.reduce((sum, plan) => 
              sum + (plan.mealPlanData?.dailyCalorieTarget || plan.dailyCalorieTarget || 2000), 0
            ) / mealPlans!.length
          ),
          days: Math.max(...mealPlans!.map(plan => plan.mealPlanData?.days || plan.days || 7)),
          mealsPerDay: Math.max(...mealPlans!.map(plan => plan.mealPlanData?.mealsPerDay || plan.mealsPerDay || 3)),
          meals: mealPlans!.flatMap(plan => plan.meals || [])
        };

        response = await fetch('/api/pdf/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            mealPlanData: combinedMealPlan,
            customerName,
            options: exportOptions
          })
        });
      } else {
        throw new Error('Invalid export configuration');
      }

      if (!response.ok) {
        console.error('[PDF Export] Response not OK - status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('[PDF Export] Error data:', errorData);
        throw new Error(errorData.message || `Export failed with status ${response.status}`);
      }

      console.log('[PDF Export] Response OK, getting blob...');
      // Get the PDF blob
      const blob = await response.blob();
      console.log('[PDF Export] Blob size:', blob.size, 'bytes');

      // Extract filename from response headers or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'EvoFit_Meal_Plan.pdf';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      console.log('[PDF Export] Saving file:', filename);
      // Save the file
      saveAs(blob, filename);

      console.log('[PDF Export] SUCCESS - File downloaded');
      toast({
        title: 'Export Complete',
        description: `${isSingle ? 'Meal plan' : isMultiple ? `${mealPlans!.length} meal plans` : 'Meal plan'} exported successfully.`,
      });

    } catch (error) {
      console.error('[PDF Export] ERROR:', error);
      console.error('[PDF Export] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred during export.',
        variant: 'destructive',
      });
    } finally {
      console.log('[PDF Export] Export process finished');
      setIsExporting(false);
    }
  };

  // Don't render if no data available
  if (!isSingle && !isMultiple && !isServerSide) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Quick Export Button */}
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleQuickExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {children || (isMultiple ? 'Export Collection' : 'Export PDF')}
      </Button>

      {/* Options Dialog */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={isExporting}
            title="Export Options"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-red-600" />
              EvoFit PDF Export Options
            </DialogTitle>
            <DialogDescription>
              Customize your professional meal plan export
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Export Info */}
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                <ChefHat className="w-4 h-4" />
                Export Summary
              </div>
              <div className="mt-2 text-sm text-red-600">
                {isSingle && (
                  <>
                    <p>Plan: {mealPlan.mealPlanData?.planName || mealPlan.planName || 'Unnamed Plan'}</p>
                    <p>Recipes: {mealPlan.meals?.length || 0} recipe cards</p>
                  </>
                )}
                {isMultiple && (
                  <>
                    <p>Collection: {mealPlans!.length} meal plans</p>
                    <p>Total Recipes: {mealPlans!.reduce((sum, plan) => sum + (plan.meals?.length || 0), 0)} recipe cards</p>
                    {customerName && <p>Customer: {customerName}</p>}
                  </>
                )}
                {isServerSide && (
                  <>
                    <p>Server Plan ID: {planId}</p>
                    <p>Professional EvoFit branding included</p>
                  </>
                )}
              </div>
            </div>

            {/* Page Format Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Page Format</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Size</Label>
                  <RadioGroup 
                    value={options.pageSize} 
                    onValueChange={(value: 'A4' | 'Letter') => setOptions(prev => ({ ...prev, pageSize: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A4" id="a4" />
                      <Label htmlFor="a4" className="text-sm">A4 (Standard)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Letter" id="letter" />
                      <Label htmlFor="letter" className="text-sm">Letter (US)</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Orientation</Label>
                  <RadioGroup 
                    value={options.orientation} 
                    onValueChange={(value: 'portrait' | 'landscape') => setOptions(prev => ({ ...prev, orientation: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="portrait" id="portrait" />
                      <Label htmlFor="portrait" className="text-sm">Portrait</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="landscape" id="landscape" />
                      <Label htmlFor="landscape" className="text-sm">Landscape</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Content Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Content Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shopping"
                    checked={options.includeShoppingList}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeShoppingList: checked as boolean }))}
                  />
                  <Label htmlFor="shopping" className="text-sm">
                    Include shopping list with categorized ingredients
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nutrition"
                    checked={options.includeMacroSummary}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMacroSummary: checked as boolean }))}
                  />
                  <Label htmlFor="nutrition" className="text-sm">
                    Include nutrition summary with macro breakdown
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="photos"
                    checked={options.includeRecipePhotos}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeRecipePhotos: checked as boolean }))}
                    disabled={true}
                  />
                  <Label htmlFor="photos" className="text-sm text-slate-400">
                    Include recipe photos (coming soon)
                  </Label>
                </div>
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowOptions(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomExport}
                disabled={isExporting}
                className="min-w-[140px] bg-red-600 hover:bg-red-700"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Export EvoFit PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Simple inline PDF export button
 */
export function SimpleEvoFitPDFExport({
  mealPlan,
  planId,
  className = '',
  size = 'sm'
}: {
  mealPlan?: any;
  planId?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let response: Response;

      if (planId) {
        // Server-side export
        response = await fetch(`/api/pdf/export/meal-plan/${planId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            options: {
              includeShoppingList: true,
              includeMacroSummary: true,
              includeRecipePhotos: false,
              orientation: 'portrait',
              pageSize: 'A4'
            }
          })
        });
      } else if (mealPlan) {
        // Client-side data export
        response = await fetch('/api/pdf/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            mealPlanData: mealPlan,
            options: {
              includeShoppingList: true,
              includeMacroSummary: true,
              includeRecipePhotos: false,
              orientation: 'portrait',
              pageSize: 'A4'
            }
          })
        });
      } else {
        throw new Error('No meal plan data or ID provided');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }

      const blob = await response.blob();
      const filename = 'EvoFit_Meal_Plan.pdf';
      saveAs(blob, filename);
      
      toast({
        title: 'Export Complete',
        description: 'EvoFit meal plan exported successfully.',
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export meal plan PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${className}`}
      onClick={handleExport}
      disabled={isExporting}
      title="Export EvoFit PDF"
    >
      {isExporting ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Download className="w-3 h-3" />
      )}
    </Button>
  );
}