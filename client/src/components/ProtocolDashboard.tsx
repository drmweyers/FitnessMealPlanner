/**
 * Protocol Dashboard Component
 * 
 * This component provides comprehensive tracking and monitoring for both
 * Longevity Mode and Parasite Cleanse protocols, including progress visualization,
 * symptom logging, measurements, and protocol-specific metrics.
 */

import React, { useState } from 'react';
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
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import {
  Calendar,
  TrendingUp,
  Activity,
  Heart,
  Brain,
  Zap,
  Target,
  Clock,
  Plus,
  BarChart3,
  LineChart,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Star,
  Moon,
  Coffee,
  Apple,
  Droplets,
} from 'lucide-react';
import type {
  ProtocolDashboardProps,
  SymptomLog,
  ProgressMeasurement,
  ProgressNote,
  CleansePhase,
} from '../types/specializedProtocols';

// Validation schemas
const symptomLogSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'Select at least one symptom'),
  severity: z.number().min(1).max(5),
  notes: z.string().optional(),
  protocolType: z.enum(['longevity', 'parasite-cleanse']),
});

const measurementSchema = z.object({
  type: z.enum(['weight', 'energy', 'sleep', 'digestion', 'mood']),
  value: z.number().min(1).max(10),
  unit: z.string(),
  notes: z.string().optional(),
});

const noteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  category: z.enum(['general', 'diet', 'symptoms', 'improvements']),
});

// Constants for forms
const COMMON_SYMPTOMS = {
  longevity: [
    'Fatigue', 'Hunger pangs', 'Headache', 'Dizziness', 'Irritability',
    'Difficulty concentrating', 'Sleep changes', 'Mood changes',
  ],
  'parasite-cleanse': [
    'Digestive upset', 'Nausea', 'Headache', 'Fatigue', 'Skin changes',
    'Mood changes', 'Sleep disturbances', 'Flu-like symptoms', 'Joint aches',
  ],
};

const MEASUREMENT_TYPES = [
  { value: 'weight', label: 'Weight', unit: 'lbs/kg', icon: <Target className="w-4 h-4" /> },
  { value: 'energy', label: 'Energy Level', unit: '1-10', icon: <Zap className="w-4 h-4" /> },
  { value: 'sleep', label: 'Sleep Quality', unit: '1-10', icon: <Moon className="w-4 h-4" /> },
  { value: 'digestion', label: 'Digestion', unit: '1-10', icon: <Apple className="w-4 h-4" /> },
  { value: 'mood', label: 'Mood', unit: '1-10', icon: <Heart className="w-4 h-4" /> },
];

const CLEANSE_PHASES: { [key in CleansePhase]: { label: string; color: string; description: string } } = {
  preparation: {
    label: 'Preparation',
    color: 'bg-blue-100 text-blue-800',
    description: 'Pre-cleanse preparation and diet adjustment',
  },
  elimination: {
    label: 'Active Elimination',
    color: 'bg-orange-100 text-orange-800',
    description: 'Active parasite elimination phase',
  },
  rebuilding: {
    label: 'Gut Rebuilding',
    color: 'bg-green-100 text-green-800',
    description: 'Restore and rebuild gut health',
  },
  maintenance: {
    label: 'Maintenance',
    color: 'bg-purple-100 text-purple-800',
    description: 'Post-cleanse maintenance protocol',
  },
};

const ProtocolDashboard: React.FC<ProtocolDashboardProps> = ({
  longevityConfig,
  parasiteConfig,
  progress,
  onUpdateProgress,
  onLogSymptom,
  onAddMeasurement,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Forms
  const symptomForm = useForm({
    resolver: zodResolver(symptomLogSchema),
    defaultValues: {
      symptoms: [],
      severity: 3,
      notes: '',
      protocolType: (longevityConfig.isEnabled ? 'longevity' : 'parasite-cleanse') as 'longevity' | 'parasite-cleanse',
    },
  });

  const measurementForm = useForm({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      type: 'energy' as const,
      value: 5,
      unit: '1-10',
      notes: '',
    },
  });

  const noteForm = useForm({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: '',
      category: 'general' as const,
    },
  });

  // Helper functions
  const calculateDaysActive = (): number => {
    const now = new Date();
    const start = new Date(progress.startDate);
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getActiveProtocols = (): string[] => {
    const protocols = [];
    if (longevityConfig.isEnabled) protocols.push('Longevity Mode');
    if (parasiteConfig.isEnabled) protocols.push('Parasite Cleanse');
    return protocols;
  };

  const getCurrentPhase = (): CleansePhase => {
    if (progress.completionPercentage < 15) return 'preparation';
    if (progress.completionPercentage < 75) return 'elimination';
    if (progress.completionPercentage < 90) return 'rebuilding';
    return 'maintenance';
  };

  // Form handlers
  const handleLogSymptom = (data: any) => {
    const symptomLog: Omit<SymptomLog, 'id'> = {
      date: new Date(),
      symptoms: data.symptoms,
      severity: data.severity,
      notes: data.notes,
      protocolType: data.protocolType,
    };
    onLogSymptom(symptomLog);
    setShowSymptomModal(false);
    symptomForm.reset();
  };

  const handleAddMeasurement = (data: any) => {
    const measurement: Omit<ProgressMeasurement, 'id'> = {
      date: new Date(),
      type: data.type,
      value: data.value,
      unit: data.unit,
      notes: data.notes,
    };
    onAddMeasurement(measurement);
    setShowMeasurementModal(false);
    measurementForm.reset();
  };

  const getRecentSymptoms = (days: number = 7): SymptomLog[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return progress.symptomsLogged.filter(log => new Date(log.date) >= cutoff);
  };

  const getAverageValue = (type: string, days: number = 7): number => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recentMeasurements = progress.measurements.filter(
      m => m.type === type && new Date(m.date) >= cutoff
    );
    if (recentMeasurements.length === 0) return 0;
    return recentMeasurements.reduce((sum, m) => sum + m.value, 0) / recentMeasurements.length;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Protocol Dashboard
              </CardTitle>
              <CardDescription>
                Track your progress across {getActiveProtocols().join(' and ')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getActiveProtocols().map((protocol) => (
                <Badge key={protocol} variant="secondary">
                  {protocol}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{calculateDaysActive()}</div>
              <div className="text-sm text-muted-foreground">Days Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(progress.completionPercentage)}%</div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getRecentSymptoms().length}</div>
              <div className="text-sm text-muted-foreground">Symptoms (7 days)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(getAverageValue('energy') * 10) / 10}</div>
              <div className="text-sm text-muted-foreground">Avg Energy (7 days)</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progress.currentDay} of {progress.totalDays} days</span>
            </div>
            <Progress value={progress.completionPercentage} className="h-3" />
          </div>

          {/* Current Phase (if parasite cleanse is active) */}
          {parasiteConfig.isEnabled && (
            <div className="mt-4 flex items-center gap-2">
              <Label className="text-sm font-medium">Current Phase:</Label>
              <Badge className={CLEANSE_PHASES[getCurrentPhase()].color}>
                {CLEANSE_PHASES[getCurrentPhase()].label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {CLEANSE_PHASES[getCurrentPhase()].description}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progress.measurements.slice(-5).map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {MEASUREMENT_TYPES.find(t => t.value === measurement.type)?.icon}
                        <span className="capitalize">{measurement.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{measurement.value}</span>
                        <span className="text-muted-foreground">{measurement.unit}</span>
                      </div>
                    </div>
                  ))}
                  {progress.measurements.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No measurements recorded yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Dialog open={showSymptomModal} onOpenChange={setShowSymptomModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Log Symptoms
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Symptoms</DialogTitle>
                      </DialogHeader>
                      <Form {...symptomForm}>
                        <form onSubmit={symptomForm.handleSubmit(handleLogSymptom)} className="space-y-4">
                          <FormField
                            control={symptomForm.control}
                            name="protocolType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Protocol Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select protocol" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {longevityConfig.isEnabled && (
                                      <SelectItem value="longevity">Longevity Mode</SelectItem>
                                    )}
                                    {parasiteConfig.isEnabled && (
                                      <SelectItem value="parasite-cleanse">Parasite Cleanse</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={symptomForm.control}
                            name="symptoms"
                            render={() => (
                              <FormItem>
                                <FormLabel>Symptoms</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  {COMMON_SYMPTOMS[symptomForm.watch('protocolType')]?.map((symptom) => (
                                    <FormField
                                      key={symptom}
                                      control={symptomForm.control}
                                      name="symptoms"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <input
                                              type="checkbox"
                                              checked={field.value?.includes(symptom)}
                                              onChange={(e) => {
                                                const updatedSymptoms = e.target.checked
                                                  ? [...(field.value || []), symptom]
                                                  : (field.value || []).filter(s => s !== symptom);
                                                field.onChange(updatedSymptoms);
                                              }}
                                              className="rounded border-gray-300"
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal">
                                            {symptom}
                                          </FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={symptomForm.control}
                            name="severity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Severity (1-5)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  1 = Very Mild, 3 = Moderate, 5 = Severe
                                </FormDescription>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={symptomForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Additional Notes</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Optional notes about symptoms..." />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowSymptomModal(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Log Symptoms</Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showMeasurementModal} onOpenChange={setShowMeasurementModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Add Measurement
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Measurement</DialogTitle>
                      </DialogHeader>
                      <Form {...measurementForm}>
                        <form onSubmit={measurementForm.handleSubmit(handleAddMeasurement)} className="space-y-4">
                          <FormField
                            control={measurementForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Measurement Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select measurement type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {MEASUREMENT_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        <div className="flex items-center gap-2">
                                          {type.icon}
                                          {type.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={measurementForm.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  For ratings: 1 = Poor, 5 = Average, 10 = Excellent
                                </FormDescription>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={measurementForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Optional notes..." />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowMeasurementModal(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Add Measurement</Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" className="w-full justify-start" onClick={() => setShowNoteModal(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Symptoms Tab */}
        <TabsContent value="symptoms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Symptoms</CardTitle>
              <CardDescription>
                Track symptoms and side effects during your protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {progress.symptomsLogged.map((log) => (
                    <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.protocolType === 'longevity' ? 'Longevity' : 'Parasite Cleanse'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {log.symptoms.map((symptom, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground">{log.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: log.severity }, (_, i) => (
                            <Star key={i} className="w-3 h-3 fill-red-500 text-red-500" />
                          ))}
                          {Array.from({ length: 5 - log.severity }, (_, i) => (
                            <Star key={i} className="w-3 h-3 text-gray-300" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">Severity</span>
                      </div>
                    </div>
                  ))}
                  {progress.symptomsLogged.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No symptoms logged yet. This is good news!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MEASUREMENT_TYPES.map((type) => {
              const recentValue = getAverageValue(type.value);
              const measurements = progress.measurements.filter(m => m.type === type.value);
              
              return (
                <Card key={type.value}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {type.icon}
                      {type.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">7-day average</span>
                        <span className="text-lg font-bold">{Math.round(recentValue * 10) / 10}</span>
                      </div>
                      <Progress value={recentValue * 10} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {measurements.length} total measurements
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Notes</CardTitle>
              <CardDescription>
                Keep track of observations, improvements, and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {progress.notes.map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {note.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                  {progress.notes.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No notes yet. Start documenting your journey!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProtocolDashboard;