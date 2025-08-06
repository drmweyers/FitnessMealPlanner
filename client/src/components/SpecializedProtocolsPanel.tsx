/**
 * Specialized Protocols Panel Component
 * 
 * This component integrates both Longevity Mode and Parasite Cleanse Protocol
 * features into the meal plan generation workflow, providing a unified interface
 * for specialized health protocols.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Sparkles,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  Activity,
  Clock,
  Bug,
  Leaf,
  Info,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

// Import our new components
import LongevityModeToggle from './LongevityModeToggle';
import ParasiteCleanseProtocol from './ParasiteCleanseProtocol';
import MedicalDisclaimerModal from './MedicalDisclaimerModal';
import ProtocolDashboard from './ProtocolDashboard';
import SpecializedIngredientSelector from './SpecializedIngredientSelector';

import type {
  LongevityModeConfig,
  ParasiteCleanseConfig,
  MedicalDisclaimer,
  ProtocolProgress,
  SpecializedProtocolConfig,
  SymptomLog,
  ProgressMeasurement,
} from '../types/specializedProtocols';

interface SpecializedProtocolsPanelProps {
  onConfigChange: (config: SpecializedProtocolConfig) => void;
  initialConfig?: Partial<SpecializedProtocolConfig>;
  disabled?: boolean;
  showDashboard?: boolean;
}

// Default configurations
const DEFAULT_LONGEVITY_CONFIG: LongevityModeConfig = {
  isEnabled: false,
  fastingStrategy: 'none',
  calorieRestriction: 'none',
  antioxidantFocus: [],
  includeAntiInflammatory: false,
  includeBrainHealth: false,
  includeHeartHealth: false,
  targetServings: {
    vegetables: 5,
    antioxidantFoods: 3,
    omega3Sources: 2,
  },
};

const DEFAULT_PARASITE_CLEANSE_CONFIG: ParasiteCleanseConfig = {
  isEnabled: false,
  duration: 14,
  intensity: 'gentle',
  currentPhase: 'preparation',
  includeHerbalSupplements: false,
  dietOnlyCleanse: true,
  startDate: null,
  endDate: null,
  targetFoods: {
    antiParasitic: [],
    probiotics: [],
    fiberRich: [],
    excludeFoods: [],
  },
};

const DEFAULT_MEDICAL_DISCLAIMER: MedicalDisclaimer = {
  hasReadDisclaimer: false,
  hasConsented: false,
  consentTimestamp: null,
  acknowledgedRisks: false,
  hasHealthcareProviderApproval: false,
  pregnancyScreeningComplete: false,
  medicalConditionsScreened: false,
};

const DEFAULT_PROGRESS: ProtocolProgress = {
  startDate: new Date(),
  currentDay: 1,
  totalDays: 14,
  completionPercentage: 0,
  symptomsLogged: [],
  measurements: [],
  notes: [],
};

const SpecializedProtocolsPanel: React.FC<SpecializedProtocolsPanelProps> = ({
  onConfigChange,
  initialConfig,
  disabled = false,
  showDashboard = false,
}) => {
  // State management
  const [longevityConfig, setLongevityConfig] = useState<LongevityModeConfig>(
    initialConfig?.longevity || DEFAULT_LONGEVITY_CONFIG
  );
  
  const [parasiteConfig, setParasiteConfig] = useState<ParasiteCleanseConfig>(
    initialConfig?.parasiteCleanse || DEFAULT_PARASITE_CLEANSE_CONFIG
  );
  
  const [medicalDisclaimer, setMedicalDisclaimer] = useState<MedicalDisclaimer>(
    initialConfig?.medical || DEFAULT_MEDICAL_DISCLAIMER
  );
  
  const [progress, setProgress] = useState<ProtocolProgress>(
    initialConfig?.progress || DEFAULT_PROGRESS
  );

  // Modal states
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerProtocolType, setDisclaimerProtocolType] = useState<'longevity' | 'parasite-cleanse'>('longevity');
  
  // UI states
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('protocols');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  
  // Generation states
  const [isGeneratingLongevity, setIsGeneratingLongevity] = useState(false);
  const [isGeneratingParasite, setIsGeneratingParasite] = useState(false);
  const [generatedMealPlan, setGeneratedMealPlan] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Update parent component when configurations change
  useEffect(() => {
    const fullConfig: SpecializedProtocolConfig = {
      longevity: longevityConfig,
      parasiteCleanse: parasiteConfig,
      medical: medicalDisclaimer,
      progress: progress,
    };
    onConfigChange(fullConfig);
  }, [longevityConfig, parasiteConfig, medicalDisclaimer, progress, onConfigChange]);

  // Helper functions
  const getActiveProtocols = (): string[] => {
    const protocols = [];
    if (longevityConfig.isEnabled) protocols.push('Longevity Mode');
    if (parasiteConfig.isEnabled) protocols.push('Parasite Cleanse');
    return protocols;
  };

  const hasActiveProtocols = (): boolean => {
    return longevityConfig.isEnabled || parasiteConfig.isEnabled;
  };

  const requiresMedicalConsent = (): boolean => {
    return (
      (longevityConfig.isEnabled && longevityConfig.calorieRestriction !== 'none') ||
      (parasiteConfig.isEnabled && parasiteConfig.intensity !== 'gentle')
    );
  };

  const hasValidMedicalConsent = (): boolean => {
    if (!requiresMedicalConsent()) return true;
    return medicalDisclaimer.hasConsented && medicalDisclaimer.hasHealthcareProviderApproval;
  };

  // Event handlers
  const handleLongevityToggle = (enabled: boolean) => {
    if (enabled && !medicalDisclaimer.hasConsented) {
      setDisclaimerProtocolType('longevity');
      setShowDisclaimerModal(true);
      return;
    }
    
    setLongevityConfig(prev => ({ ...prev, isEnabled: enabled }));
  };

  const handleParasiteCleanseToggle = (enabled: boolean) => {
    if (enabled && !medicalDisclaimer.hasConsented) {
      setDisclaimerProtocolType('parasite-cleanse');
      setShowDisclaimerModal(true);
      return;
    }
    
    setParasiteConfig(prev => ({ ...prev, isEnabled: enabled }));
  };

  const handleMedicalConsentAccept = (disclaimer: MedicalDisclaimer) => {
    setMedicalDisclaimer(disclaimer);
    
    // Enable the protocol that triggered the disclaimer
    if (disclaimerProtocolType === 'longevity') {
      setLongevityConfig(prev => ({ ...prev, isEnabled: true }));
    } else {
      setParasiteConfig(prev => ({ ...prev, isEnabled: true }));
    }
  };

  const handleLogSymptom = (symptom: Omit<SymptomLog, 'id'>) => {
    const newSymptom: SymptomLog = {
      ...symptom,
      id: Math.random().toString(36).substr(2, 9),
    };
    
    setProgress(prev => ({
      ...prev,
      symptomsLogged: [...prev.symptomsLogged, newSymptom],
    }));
  };

  const handleAddMeasurement = (measurement: Omit<ProgressMeasurement, 'id'>) => {
    const newMeasurement: ProgressMeasurement = {
      ...measurement,
      id: Math.random().toString(36).substr(2, 9),
    };
    
    setProgress(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement],
    }));
  };

  const handleUpdateProgress = (progressUpdate: Partial<ProtocolProgress>) => {
    setProgress(prev => ({ ...prev, ...progressUpdate }));
  };

  // Generate meal plan functions
  const handleGenerateLongevityPlan = async () => {
    if (!longevityConfig.isEnabled) {
      setGenerationError('Please enable and configure Longevity Mode first.');
      return;
    }

    setIsGeneratingLongevity(true);
    setGenerationError(null);
    
    try {
      // Prepare request data based on current longevity configuration
      const requestData = {
        planName: `Longevity Protocol - ${new Date().toLocaleDateString()}`,
        duration: 30, // Default 30 days
        fastingProtocol: longevityConfig.fastingStrategy === 'none' ? '16:8' : longevityConfig.fastingStrategy,
        experienceLevel: 'beginner', // Could be made configurable
        primaryGoals: [
          longevityConfig.includeAntiInflammatory ? 'inflammation_reduction' : null,
          longevityConfig.includeBrainHealth ? 'cognitive_function' : null,
          longevityConfig.includeHeartHealth ? 'metabolic_health' : null,
          'anti_aging',
          'cellular_health'
        ].filter(Boolean),
        culturalPreferences: [], // Could be made configurable
        currentAge: 35, // Could be made configurable
        dailyCalorieTarget: longevityConfig.calorieRestriction === 'strict' ? 1400 : 
                           longevityConfig.calorieRestriction === 'moderate' ? 1600 :
                           longevityConfig.calorieRestriction === 'mild' ? 1800 : 2000,
        clientName: 'Current User'
      };

      const response = await fetch('/api/specialized/longevity/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate longevity meal plan');
      }

      const result = await response.json();
      setGeneratedMealPlan({
        type: 'longevity',
        data: result
      });
      setActiveTab('dashboard'); // Switch to dashboard to show results
    } catch (error) {
      console.error('Error generating longevity plan:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGeneratingLongevity(false);
    }
  };

  const handleGenerateParasiteCleansePlan = async () => {
    if (!parasiteConfig.isEnabled) {
      setGenerationError('Please enable and configure Parasite Cleanse Protocol first.');
      return;
    }

    // Safety check for medical consent
    if (!hasValidMedicalConsent()) {
      setGenerationError('Medical consent and healthcare provider approval required for parasite cleanse protocol.');
      return;
    }

    setIsGeneratingParasite(true);
    setGenerationError(null);
    
    try {
      // Prepare request data based on current parasite cleanse configuration
      const requestData = {
        planName: `Parasite Cleanse Protocol - ${new Date().toLocaleDateString()}`,
        duration: parasiteConfig.duration.toString(),
        intensity: parasiteConfig.intensity,
        experienceLevel: 'first_time', // Could be made configurable
        culturalPreferences: [], // Could be made configurable
        supplementTolerance: 'moderate', // Could be made configurable
        currentSymptoms: [], // Could be made configurable
        medicalConditions: [], // Could be made configurable
        pregnancyOrBreastfeeding: false, // Should be checked in medical disclaimer
        healthcareProviderConsent: medicalDisclaimer.hasHealthcareProviderApproval,
        clientName: 'Current User'
      };

      const response = await fetch('/api/specialized/parasite-cleanse/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate parasite cleanse protocol');
      }

      const result = await response.json();
      setGeneratedMealPlan({
        type: 'parasite-cleanse',
        data: result
      });
      setActiveTab('dashboard'); // Switch to dashboard to show results
    } catch (error) {
      console.error('Error generating parasite cleanse plan:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGeneratingParasite(false);
    }
  };

  // Render protocol status summary
  const renderProtocolSummary = () => {
    if (!hasActiveProtocols()) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No specialized protocols active
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {longevityConfig.isEnabled && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-medium text-blue-900">Longevity Mode Active</span>
                <div className="text-xs text-blue-700">
                  {longevityConfig.fastingStrategy !== 'none' && `${longevityConfig.fastingStrategy} fasting`}
                  {longevityConfig.calorieRestriction !== 'none' && ` • ${longevityConfig.calorieRestriction} calorie restriction`}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {longevityConfig.antioxidantFocus.length} antioxidant focuses
            </Badge>
          </div>
        )}

        {parasiteConfig.isEnabled && (
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-orange-600" />
              <div>
                <span className="font-medium text-orange-900">Parasite Cleanse Active</span>
                <div className="text-xs text-orange-700">
                  {parasiteConfig.duration} days • {parasiteConfig.intensity} intensity
                  {parasiteConfig.startDate && ` • Started ${parasiteConfig.startDate.toLocaleDateString()}`}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {parasiteConfig.currentPhase}
            </Badge>
          </div>
        )}

        {/* Medical consent status */}
        {requiresMedicalConsent() && (
          <Alert className={hasValidMedicalConsent() ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
            <Shield className="h-4 w-4" />
            <AlertTitle>Medical Supervision Status</AlertTitle>
            <AlertDescription>
              {hasValidMedicalConsent() 
                ? 'Medical consent obtained and healthcare provider approval confirmed.'
                : 'Healthcare provider consultation required for selected protocol intensity.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Specialized Health Protocols
            </CardTitle>
            <CardDescription>
              Advanced longevity and cleansing protocols with medical safety features
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getActiveProtocols().map((protocol) => (
              <Badge key={protocol} variant="secondary">
                {protocol}
              </Badge>
            ))}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Always show summary */}
        {renderProtocolSummary()}

        {/* Expandable detailed configuration */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <div className="mt-6 space-y-6">
              <Separator />

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="protocols">
                    <Settings className="w-4 h-4 mr-1" />
                    Protocols
                  </TabsTrigger>
                  <TabsTrigger value="ingredients">
                    <Leaf className="w-4 h-4 mr-1" />
                    Ingredients
                  </TabsTrigger>
                  <TabsTrigger value="dashboard">
                    <Activity className="w-4 h-4 mr-1" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="info">
                    <Info className="w-4 h-4 mr-1" />
                    Info
                  </TabsTrigger>
                </TabsList>

                {/* Protocols Tab */}
                <TabsContent value="protocols" className="space-y-6 mt-6">
                  {/* Error display */}
                  {generationError && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Generation Error</AlertTitle>
                      <AlertDescription>{generationError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <LongevityModeToggle
                    config={longevityConfig}
                    onChange={setLongevityConfig}
                    disabled={disabled}
                    showTooltips={true}
                  />
                  
                  {/* Longevity Generate Button */}
                  {longevityConfig.isEnabled && (
                    <div className="flex justify-center py-4">
                      <Button
                        onClick={handleGenerateLongevityPlan}
                        disabled={disabled || isGeneratingLongevity || !hasValidMedicalConsent()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg flex items-center gap-2"
                        size="lg"
                      >
                        {isGeneratingLongevity ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Generating Longevity Plan...
                          </>
                        ) : (
                          <>
                            <Clock className="w-5 h-5" />
                            Generate Longevity Meal Plan
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <ParasiteCleanseProtocol
                    config={parasiteConfig}
                    onChange={setParasiteConfig}
                    disabled={disabled}
                  />
                  
                  {/* Parasite Cleanse Generate Button */}
                  {parasiteConfig.isEnabled && (
                    <div className="flex justify-center py-4">
                      <Button
                        onClick={handleGenerateParasiteCleansePlan}
                        disabled={disabled || isGeneratingParasite || !hasValidMedicalConsent()}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg flex items-center gap-2"
                        size="lg"
                      >
                        {isGeneratingParasite ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Generating Cleanse Protocol...
                          </>
                        ) : (
                          <>
                            <Bug className="w-5 h-5" />
                            Generate Parasite Cleanse Protocol
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Ingredients Tab */}
                <TabsContent value="ingredients" className="mt-6">
                  <SpecializedIngredientSelector
                    selectedIngredients={selectedIngredients}
                    onSelectionChange={setSelectedIngredients}
                    protocolType={
                      longevityConfig.isEnabled && parasiteConfig.isEnabled
                        ? 'both'
                        : longevityConfig.isEnabled
                        ? 'longevity'
                        : 'parasite-cleanse'
                    }
                    maxSelections={20}
                    showCategories={true}
                    disabled={disabled || !hasActiveProtocols()}
                  />
                </TabsContent>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="mt-6">
                  {generatedMealPlan ? (
                    <div className="space-y-6">
                      {/* Generated Meal Plan Display */}
                      <Card className="border-2 border-green-200 bg-green-50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-5 h-5" />
                            {generatedMealPlan.type === 'longevity' ? 'Longevity Meal Plan Generated!' : 'Parasite Cleanse Protocol Generated!'}
                          </CardTitle>
                          <CardDescription className="text-green-700">
                            Your specialized meal plan has been successfully created based on your configuration.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Meal Plan Summary */}
                          {generatedMealPlan.data.mealPlan && (
                            <div>
                              <h4 className="font-semibold mb-2 text-green-800">Meal Plan Details:</h4>
                              <div className="bg-white rounded-lg p-4 space-y-2">
                                <p><strong>Duration:</strong> {generatedMealPlan.data.mealPlan.duration || 'N/A'} days</p>
                                <p><strong>Total Meals:</strong> {generatedMealPlan.data.mealPlan.meals?.length || 'N/A'}</p>
                                <p><strong>Protocol Type:</strong> {generatedMealPlan.type === 'longevity' ? 'Anti-Aging & Longevity' : 'Parasite Cleanse'}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Fasting Schedule (Longevity) */}
                          {generatedMealPlan.type === 'longevity' && generatedMealPlan.data.fastingSchedule && (
                            <div>
                              <h4 className="font-semibold mb-2 text-green-800">Fasting Schedule:</h4>
                              <div className="bg-white rounded-lg p-4">
                                <pre className="text-sm whitespace-pre-wrap">
                                  {JSON.stringify(generatedMealPlan.data.fastingSchedule, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Daily Schedules (Parasite Cleanse) */}
                          {generatedMealPlan.type === 'parasite-cleanse' && generatedMealPlan.data.dailySchedules && (
                            <div>
                              <h4 className="font-semibold mb-2 text-green-800">Daily Protocol Schedule:</h4>
                              <div className="bg-white rounded-lg p-4">
                                <pre className="text-sm whitespace-pre-wrap">
                                  {JSON.stringify(generatedMealPlan.data.dailySchedules, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Safety Disclaimer */}
                          {generatedMealPlan.data.safetyDisclaimer && (
                            <Alert className="border-amber-200 bg-amber-50">
                              <Shield className="h-4 w-4" />
                              <AlertTitle>{generatedMealPlan.data.safetyDisclaimer.title}</AlertTitle>
                              <AlertDescription className="whitespace-pre-wrap">
                                {generatedMealPlan.data.safetyDisclaimer.content}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-4">
                            <Button 
                              onClick={() => setGeneratedMealPlan(null)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Generate New Plan
                            </Button>
                            <Button 
                              onClick={() => setActiveTab('protocols')}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <Settings className="w-4 h-4" />
                              Modify Settings
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : hasActiveProtocols() ? (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Ready to Generate Your Meal Plan</h3>
                        <p className="text-muted-foreground mb-6">
                          Your protocols are configured. Generate your specialized meal plan to see detailed results here.
                        </p>
                        <Button 
                          onClick={() => setActiveTab('protocols')}
                          className="flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Go to Protocols Tab to Generate
                        </Button>
                      </div>
                      
                      {/* Standard Protocol Dashboard */}
                      <ProtocolDashboard
                        longevityConfig={longevityConfig}
                        parasiteConfig={parasiteConfig}
                        progress={progress}
                        onUpdateProgress={handleUpdateProgress}
                        onLogSymptom={handleLogSymptom}
                        onAddMeasurement={handleAddMeasurement}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Protocol Dashboard</h3>
                        <p className="text-muted-foreground mb-6">
                          Activate a health protocol to unlock advanced tracking and monitoring features.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveTab('protocols')}
                            className="flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            Configure Protocols
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveTab('info')}
                            className="flex items-center gap-2"
                          >
                            <Info className="w-4 h-4" />
                            Learn More
                          </Button>
                        </div>
                      </div>
                      
                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Dashboard Features</AlertTitle>
                        <AlertDescription>
                          Once you enable a protocol, you'll have access to:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Real-time progress tracking</li>
                            <li>Symptom and wellness logging</li>
                            <li>Measurement recording</li>
                            <li>Protocol phase management</li>
                            <li>Visual progress charts</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </TabsContent>

                {/* Info Tab */}
                <TabsContent value="info" className="mt-6">
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>About Specialized Protocols</AlertTitle>
                      <AlertDescription>
                        These protocols are designed to support specific health goals through targeted nutrition.
                        All protocols include comprehensive safety measures and medical supervision requirements.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="w-4 h-4 text-blue-600" />
                            Longevity Mode
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <ul className="space-y-1">
                            <li>• Intermittent fasting protocols</li>
                            <li>• Calorie restriction options</li>
                            <li>• High-antioxidant food focus</li>
                            <li>• Anti-inflammatory nutrients</li>
                            <li>• Brain and heart health support</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Bug className="w-4 h-4 text-orange-600" />
                            Parasite Cleanse
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                          <ul className="space-y-1">
                            <li>• Phased cleansing approach</li>
                            <li>• Anti-parasitic foods</li>
                            <li>• Gut microbiome support</li>
                            <li>• Elimination diet principles</li>
                            <li>• Progress tracking tools</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Safety First</AlertTitle>
                      <AlertDescription>
                        These protocols require medical supervision, especially for individuals with existing
                        health conditions. Always consult with a healthcare provider before beginning any protocol.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Medical Disclaimer Modal */}
      <MedicalDisclaimerModal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        onAccept={handleMedicalConsentAccept}
        protocolType={disclaimerProtocolType}
        requiredScreenings={[]}
      />
    </Card>
  );
};

export default SpecializedProtocolsPanel;