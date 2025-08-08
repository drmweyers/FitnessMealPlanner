/**
 * Protocols Test Page Component
 * 
 * This component provides a testing interface for all specialized protocol features,
 * allowing developers and testers to verify functionality without integration complexity.
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  TestTube,
  CheckCircle,
  AlertCircle,
  Play,
  RefreshCw,
} from 'lucide-react';

// Import our specialized components
import SpecializedProtocolsPanel from './SpecializedProtocolsPanel';
import LongevityModeToggle from './LongevityModeToggle';
import ParasiteCleanseProtocol from './ParasiteCleanseProtocol';
import MedicalDisclaimerModal from './MedicalDisclaimerModal';
import ProtocolDashboard from './ProtocolDashboard';
import SpecializedIngredientSelector from './SpecializedIngredientSelector';

import type {
  SpecializedProtocolConfig,
  LongevityModeConfig,
  ParasiteCleanseConfig,
  MedicalDisclaimer,
  ProtocolProgress,
} from '../types/specializedProtocols';

// Test data
const SAMPLE_LONGEVITY_CONFIG: LongevityModeConfig = {
  isEnabled: true,
  fastingStrategy: '16:8',
  calorieRestriction: 'mild',
  antioxidantFocus: ['berries', 'leafyGreens', 'turmeric'],
  includeAntiInflammatory: true,
  includeBrainHealth: true,
  includeHeartHealth: false,
  targetServings: {
    vegetables: 7,
    antioxidantFoods: 4,
    omega3Sources: 3,
  },
};

const SAMPLE_PARASITE_CONFIG: ParasiteCleanseConfig = {
  isEnabled: true,
  duration: 30,
  intensity: 'moderate',
  currentPhase: 'elimination',
  includeHerbalSupplements: true,
  dietOnlyCleanse: false,
  startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
  targetFoods: {
    antiParasitic: ['garlic', 'oregano', 'pumpkin-seeds'],
    probiotics: ['sauerkraut', 'kefir'],
    fiberRich: ['chia-seeds', 'psyllium-husk'],
    excludeFoods: ['sugar', 'refined-carbs', 'alcohol'],
  },
};

const SAMPLE_MEDICAL_DISCLAIMER: MedicalDisclaimer = {
  hasReadDisclaimer: true,
  hasConsented: true,
  consentTimestamp: new Date(),
  acknowledgedRisks: true,
  hasHealthcareProviderApproval: true,
  pregnancyScreeningComplete: true,
  medicalConditionsScreened: true,
};

const SAMPLE_PROGRESS: ProtocolProgress = {
  startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  currentDay: 10,
  totalDays: 30,
  completionPercentage: 33,
  symptomsLogged: [
    {
      id: '1',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      symptoms: ['Mild headache', 'Slight fatigue'],
      severity: 2,
      notes: 'Day 8 - manageable symptoms',
      protocolType: 'parasite-cleanse',
    },
  ],
  measurements: [
    {
      id: '1',
      date: new Date(),
      type: 'energy',
      value: 7,
      unit: '1-10',
      notes: 'Feeling good today',
    },
    {
      id: '2',
      date: new Date(),
      type: 'sleep',
      value: 8,
      unit: '1-10',
      notes: 'Slept well',
    },
  ],
  notes: [
    {
      id: '1',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      content: 'Noticed improved digestion and less bloating',
      category: 'improvements',
    },
  ],
};

const ProtocolsTestPage: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string>('full-panel');
  const [testConfig, setTestConfig] = useState<SpecializedProtocolConfig>({
    longevity: { ...SAMPLE_LONGEVITY_CONFIG, isEnabled: false },
    parasiteCleanse: { ...SAMPLE_PARASITE_CONFIG, isEnabled: false },
    medical: { ...SAMPLE_MEDICAL_DISCLAIMER, hasConsented: false },
    progress: SAMPLE_PROGRESS,
    clientAilments: {
      selectedAilments: [],
      nutritionalFocus: null,
      includeInMealPlanning: false,
      priorityLevel: 'low' as const,
    },
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(['garlic', 'blueberries', 'turmeric']);

  const handleConfigChange = (config: SpecializedProtocolConfig) => {
    setTestConfig(config);
    console.log('Config updated:', config);
  };

  const loadSampleData = () => {
    setTestConfig({
      longevity: SAMPLE_LONGEVITY_CONFIG,
      parasiteCleanse: SAMPLE_PARASITE_CONFIG,
      medical: SAMPLE_MEDICAL_DISCLAIMER,
      progress: SAMPLE_PROGRESS,
      clientAilments: {
      selectedAilments: [],
      nutritionalFocus: null,
      includeInMealPlanning: false,
      priorityLevel: 'low' as const,
    },
    });
  };

  const resetData = () => {
    setTestConfig({
      longevity: { ...SAMPLE_LONGEVITY_CONFIG, isEnabled: false },
      parasiteCleanse: { ...SAMPLE_PARASITE_CONFIG, isEnabled: false },
      medical: { ...SAMPLE_MEDICAL_DISCLAIMER, hasConsented: false },
      progress: SAMPLE_PROGRESS,
      clientAilments: {
      selectedAilments: [],
      nutritionalFocus: null,
      includeInMealPlanning: false,
      priorityLevel: 'low' as const,
    },
    });
  };

  const getTestStatus = (componentName: string): 'success' | 'error' | 'warning' => {
    // Simple status logic based on configuration
    switch (componentName) {
      case 'longevity-toggle':
        return testConfig.longevity.isEnabled ? 'success' : 'warning';
      case 'parasite-cleanse':
        return testConfig.parasiteCleanse.isEnabled ? 'success' : 'warning';
      case 'medical-disclaimer':
        return testConfig.medical.hasConsented ? 'success' : 'warning';
      case 'protocol-dashboard':
        return testConfig.longevity.isEnabled || testConfig.parasiteCleanse.isEnabled ? 'success' : 'warning';
      case 'ingredient-selector':
        return selectedIngredients.length > 0 ? 'success' : 'warning';
      default:
        return 'success';
    }
  };

  const StatusIcon = ({ status }: { status: 'success' | 'error' | 'warning' }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5 text-blue-600" />
                Specialized Protocols Test Suite
              </CardTitle>
              <CardDescription>
                Testing interface for longevity and parasite cleanse protocol components
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadSampleData} variant="outline" size="sm">
                <Play className="w-4 h-4 mr-1" />
                Load Sample Data
              </Button>
              <Button onClick={resetData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <TestTube className="h-4 w-4" />
            <AlertTitle>Test Environment</AlertTitle>
            <AlertDescription>
              This page allows testing of all specialized protocol components independently.
              Use the tabs below to test individual components or the full integrated panel.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs value={currentTest} onValueChange={setCurrentTest}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="full-panel">Full Panel</TabsTrigger>
          <TabsTrigger value="longevity">Longevity</TabsTrigger>
          <TabsTrigger value="parasite">Parasite</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="modal">Modal</TabsTrigger>
        </TabsList>

        {/* Component Status Overview */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Component Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={getTestStatus('longevity-toggle')} />
                <span className="text-sm">Longevity Toggle</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={getTestStatus('parasite-cleanse')} />
                <span className="text-sm">Parasite Cleanse</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={getTestStatus('medical-disclaimer')} />
                <span className="text-sm">Medical Disclaimer</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={getTestStatus('protocol-dashboard')} />
                <span className="text-sm">Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={getTestStatus('ingredient-selector')} />
                <span className="text-sm">Ingredient Selector</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full Integrated Panel Test */}
        <TabsContent value="full-panel">
          <Card>
            <CardHeader>
              <CardTitle>Full Integrated Panel Test</CardTitle>
              <CardDescription>
                Test the complete SpecializedProtocolsPanel with all features integrated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpecializedProtocolsPanel
                onConfigChange={handleConfigChange}
                initialConfig={testConfig}
                showDashboard={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Component Tests */}
        <TabsContent value="longevity">
          <Card>
            <CardHeader>
              <CardTitle>Longevity Mode Toggle Test</CardTitle>
              <CardDescription>
                Test longevity mode configuration with all options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LongevityModeToggle
                config={testConfig.longevity}
                onChange={(config) => setTestConfig(prev => ({ ...prev, longevity: config }))}
                showTooltips={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parasite">
          <Card>
            <CardHeader>
              <CardTitle>Parasite Cleanse Protocol Test</CardTitle>
              <CardDescription>
                Test parasite cleanse configuration and progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParasiteCleanseProtocol
                config={testConfig.parasiteCleanse}
                onChange={(config) => setTestConfig(prev => ({ ...prev, parasiteCleanse: config }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Protocol Dashboard Test</CardTitle>
              <CardDescription>
                Test progress tracking and symptom logging functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProtocolDashboard
                longevityConfig={testConfig.longevity}
                parasiteConfig={testConfig.parasiteCleanse}
                progress={testConfig.progress}
                onUpdateProgress={(update) => 
                  setTestConfig(prev => ({ 
                    ...prev, 
                    progress: { ...prev.progress, ...update }
                  }))
                }
                onLogSymptom={(symptom) =>
                  setTestConfig(prev => ({
                    ...prev,
                    progress: {
                      ...prev.progress,
                      symptomsLogged: [
                        ...prev.progress.symptomsLogged,
                        { ...symptom, id: Math.random().toString(36).substr(2, 9) }
                      ]
                    }
                  }))
                }
                onAddMeasurement={(measurement) =>
                  setTestConfig(prev => ({
                    ...prev,
                    progress: {
                      ...prev.progress,
                      measurements: [
                        ...prev.progress.measurements,
                        { ...measurement, id: Math.random().toString(36).substr(2, 9) }
                      ]
                    }
                  }))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle>Specialized Ingredient Selector Test</CardTitle>
              <CardDescription>
                Test ingredient selection for different protocol types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline">Selected: {selectedIngredients.length}</Badge>
                  <Badge variant="secondary">
                    Protocol: {testConfig.longevity.isEnabled && testConfig.parasiteCleanse.isEnabled 
                      ? 'Both' : testConfig.longevity.isEnabled ? 'Longevity' : 'Parasite Cleanse'}
                  </Badge>
                </div>
                <SpecializedIngredientSelector
                  selectedIngredients={selectedIngredients}
                  onSelectionChange={setSelectedIngredients}
                  protocolType={
                    testConfig.longevity.isEnabled && testConfig.parasiteCleanse.isEnabled
                      ? 'both'
                      : testConfig.longevity.isEnabled
                      ? 'longevity'
                      : 'parasite-cleanse'
                  }
                  maxSelections={15}
                  showCategories={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modal">
          <Card>
            <CardHeader>
              <CardTitle>Medical Disclaimer Modal Test</CardTitle>
              <CardDescription>
                Test medical consent and disclaimer functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={() => setShowModal(true)}>
                    Open Longevity Disclaimer
                  </Button>
                  <Button onClick={() => setShowModal(true)}>
                    Open Parasite Cleanse Disclaimer
                  </Button>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Current Consent Status:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Has Read Disclaimer:</span>
                      <Badge variant={testConfig.medical.hasReadDisclaimer ? 'default' : 'secondary'}>
                        {testConfig.medical.hasReadDisclaimer ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Has Consented:</span>
                      <Badge variant={testConfig.medical.hasConsented ? 'default' : 'secondary'}>
                        {testConfig.medical.hasConsented ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Healthcare Approval:</span>
                      <Badge variant={testConfig.medical.hasHealthcareProviderApproval ? 'default' : 'secondary'}>
                        {testConfig.medical.hasHealthcareProviderApproval ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <MedicalDisclaimerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onAccept={(disclaimer) => {
                  setTestConfig(prev => ({ ...prev, medical: disclaimer }));
                  setShowModal(false);
                }}
                protocolType="longevity"
                requiredScreenings={[]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Debug Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-40">
            {JSON.stringify(testConfig, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProtocolsTestPage;