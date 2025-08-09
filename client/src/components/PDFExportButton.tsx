/**
 * PDF Export Button Component
 * 
 * Provides a user-friendly interface for exporting meal plan recipe cards to PDF.
 * Includes options for customizing the export format and handles loading states.
 */

import { memo, useState, useCallback, useMemo } from 'react';
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
  ChefHat
} from 'lucide-react';
import { 
  exportSingleMealPlanToPDF, 
  exportMultipleMealPlansToPDF 
} from '../utils/pdfExport';

interface PDFExportButtonProps {
  mealPlan?: any;
  mealPlans?: any[];
  customerName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

function PDFExportButton({
  mealPlan,
  mealPlans,
  customerName,
  variant = 'outline',
  size = 'default',
  className = '',
  children
}: PDFExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Export options
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [includeNutrition, setIncludeNutrition] = useState(true);

  // Memoized computed values
  const { isMultiple, isSingle, exportSummary } = useMemo(() => {
    const isMultiple = mealPlans && mealPlans.length > 0;
    const isSingle = mealPlan && !isMultiple;
    
    let exportSummary = { plans: 0, recipes: 0 };
    if (isSingle && mealPlan?.meals) {
      exportSummary = { plans: 1, recipes: mealPlan.meals.length };
    } else if (isMultiple && mealPlans) {
      exportSummary = {
        plans: mealPlans.length,
        recipes: mealPlans.reduce((sum, plan) => sum + (plan.meals?.length || 0), 0)
      };
    }
    
    return { isMultiple, isSingle, exportSummary };
  }, [mealPlan, mealPlans]);

  const handleQuickExport = useCallback(async () => {
    if (!isSingle && !isMultiple) {
      toast({
        title: 'No Data',
        description: 'No meal plan data available for export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    
    try {
      if (isSingle) {
        await exportSingleMealPlanToPDF(mealPlan, {
          includeNutrition: true,
          cardSize: 'medium'
        });
        
        toast({
          title: 'Export Complete',
          description: 'Recipe cards have been exported to PDF successfully.',
        });
      } else if (isMultiple) {
        await exportMultipleMealPlansToPDF(mealPlans!, {
          includeNutrition: true,
          cardSize: 'medium',
          customerName
        });
        
        toast({
          title: 'Export Complete',
          description: `${mealPlans!.length} meal plans exported to PDF successfully.`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred during export.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [isSingle, isMultiple, mealPlan, mealPlans, customerName, toast]);

  const handleCustomExport = useCallback(async () => {
    if (!isSingle && !isMultiple) return;

    setIsExporting(true);
    
    try {
      if (isSingle) {
        await exportSingleMealPlanToPDF(mealPlan, {
          includeNutrition,
          cardSize
        });
      } else if (isMultiple) {
        await exportMultipleMealPlansToPDF(mealPlans!, {
          includeNutrition,
          cardSize,
          customerName
        });
      }
      
      toast({
        title: 'Export Complete',
        description: 'Custom PDF export completed successfully.',
      });
      
      setShowOptions(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred during export.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [isSingle, isMultiple, mealPlan, mealPlans, customerName, cardSize, includeNutrition, toast, setShowOptions]);

  if (!isSingle && !isMultiple) {
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
        {children || (isMultiple ? 'Export All' : 'Export PDF')}
      </Button>

      {/* Options Dialog */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={isExporting}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Export Options
            </DialogTitle>
            <DialogDescription>
              Customize your recipe card export settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Export Info */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ChefHat className="w-4 h-4" />
                Export Summary
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {isSingle && (
                  <>
                    <p>Plan: {mealPlan.mealPlanData?.planName || mealPlan.planName || 'Unnamed Plan'}</p>
                    <p>Recipes: {mealPlan.meals?.length || 0} recipe cards</p>
                  </>
                )}
                {isMultiple && (
                  <>
                    <p>Plans: {exportSummary.plans} meal plans</p>
                    <p>Total Recipes: {exportSummary.recipes} recipe cards</p>
                    {customerName && <p>Customer: {customerName}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Card Size Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Card Size</Label>
              <RadioGroup value={cardSize} onValueChange={(value: 'small' | 'medium' | 'large') => setCardSize(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="small" id="small" />
                  <Label htmlFor="small" className="text-sm">
                    Small (2 per page) - Compact cards with essential info
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-sm">
                    Medium (1 per page) - Balanced detail and readability
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="large" />
                  <Label htmlFor="large" className="text-sm">
                    Large (1 per page) - Maximum detail and instructions
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Content Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Content Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nutrition"
                    checked={includeNutrition}
                    onCheckedChange={(checked) => setIncludeNutrition(checked as boolean)}
                  />
                  <Label htmlFor="nutrition" className="text-sm">
                    Include nutrition information
                  </Label>
                </div>
              </div>
            </div>

            {/* Export Button */}
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
                className="min-w-[120px]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
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

// Export memoized component
export default memo(PDFExportButton);

/**
 * Simplified export button for inline use
 */
const SimplePDFExportButton = memo(function SimplePDFExportButton({
  mealPlan,
  className = '',
  size = 'sm'
}: {
  mealPlan: any;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      await exportSingleMealPlanToPDF(mealPlan, {
        includeNutrition: true,
        cardSize: 'medium'
      });
      
      toast({
        title: 'Export Complete',
        description: 'Recipe cards exported to PDF successfully.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export recipe cards.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [mealPlan, toast]);

  return (
    <Button
      variant="ghost"
      size={size}
      className={className}
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Download className="w-3 h-3" />
      )}
    </Button>
  );
});

export { SimplePDFExportButton };