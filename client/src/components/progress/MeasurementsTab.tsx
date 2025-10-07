import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import {
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogDescription as DialogDescription,
  MobileDialogHeader as DialogHeader,
  MobileDialogTitle as DialogTitle,
  MobileDialogTrigger as DialogTrigger,
} from '@/components/ui/mobile-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Measurement {
  id: string;
  measurementDate: string;
  weightKg?: string;
  weightLbs?: string;
  neckCm?: string;
  shouldersCm?: string;
  chestCm?: string;
  waistCm?: string;
  hipsCm?: string;
  bicepLeftCm?: string;
  bicepRightCm?: string;
  thighLeftCm?: string;
  thighRightCm?: string;
  calfLeftCm?: string;
  calfRightCm?: string;
  bodyFatPercentage?: string;
  muscleMassKg?: string;
  notes?: string;
  createdAt: string;
}

const MeasurementsTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Measurement>>({
    measurementDate: new Date().toISOString().split('T')[0],
  });

  // Fetch measurements
  const { data: measurements, isLoading } = useQuery({
    queryKey: ['measurements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/progress/measurements');
      const result = await response.json();
      return result.data as Measurement[];
    },
  });

  // Create measurement mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Measurement>) => {
      const response = await apiRequest(
        'POST',
        '/api/progress/measurements',
        {
          ...data,
          measurementDate: data.measurementDate ? new Date(data.measurementDate).toISOString() : new Date().toISOString(),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      setIsAddDialogOpen(false);
      setFormData({ measurementDate: new Date().toISOString().split('T')[0] });
      toast({
        title: 'Success',
        description: 'Measurement added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add measurement',
        variant: 'destructive',
      });
    },
  });

  // Update measurement mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Measurement> }) => {
      const response = await apiRequest(
        'PUT',
        `/api/progress/measurements/${id}`,
        {
          ...data,
          measurementDate: data.measurementDate ? new Date(data.measurementDate).toISOString() : new Date().toISOString(),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      setEditingId(null);
      toast({
        title: 'Success',
        description: 'Measurement updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update measurement',
        variant: 'destructive',
      });
    },
  });

  // Delete measurement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(
        'DELETE',
        `/api/progress/measurements/${id}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      toast({
        title: 'Success',
        description: 'Measurement deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete measurement',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: keyof Measurement, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value ? parseFloat(value) : undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (id: string, data: Partial<Measurement>) => {
    updateMutation.mutate({ id, data });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this measurement?')) {
      deleteMutation.mutate(id);
    }
  };

  const latestMeasurement = measurements?.[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Body Measurements</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Measurement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Measurement</DialogTitle>
              <DialogDescription>
                Record your current body measurements. All fields are optional.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="measurementDate">Date</Label>
                <Input
                  id="measurementDate"
                  type="date"
                  value={formData.measurementDate}
                  onChange={(e) => setFormData({ ...formData, measurementDate: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weightLbs">Weight (lbs)</Label>
                  <Input
                    id="weightLbs"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    onChange={(e) => handleInputChange('weightLbs', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bodyFatPercentage">Body Fat %</Label>
                  <Input
                    id="bodyFatPercentage"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    onChange={(e) => handleInputChange('bodyFatPercentage', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Body Measurements (cm)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neckCm">Neck</Label>
                    <Input
                      id="neckCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('neckCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shouldersCm">Shoulders</Label>
                    <Input
                      id="shouldersCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('shouldersCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="chestCm">Chest</Label>
                    <Input
                      id="chestCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('chestCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="waistCm">Waist</Label>
                    <Input
                      id="waistCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('waistCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hipsCm">Hips</Label>
                    <Input
                      id="hipsCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('hipsCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bicepLeftCm">Left Bicep</Label>
                    <Input
                      id="bicepLeftCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('bicepLeftCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bicepRightCm">Right Bicep</Label>
                    <Input
                      id="bicepRightCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('bicepRightCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="thighLeftCm">Left Thigh</Label>
                    <Input
                      id="thighLeftCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('thighLeftCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="thighRightCm">Right Thigh</Label>
                    <Input
                      id="thighRightCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('thighRightCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="calfLeftCm">Left Calf</Label>
                    <Input
                      id="calfLeftCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('calfLeftCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="calfRightCm">Right Calf</Label>
                    <Input
                      id="calfRightCm"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('calfRightCm', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="muscleMassKg">Muscle Mass (kg)</Label>
                    <Input
                      id="muscleMassKg"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange('muscleMassKg', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Measurement'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Latest Measurement Summary */}
      {latestMeasurement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Latest Measurement - {(() => {
                const date = latestMeasurement.measurementDate ? new Date(latestMeasurement.measurementDate) : null;
                return date && isValid(date) ? format(date, 'MMM d, yyyy') : 'Invalid Date';
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {latestMeasurement.weightLbs && (
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="text-lg font-semibold">{latestMeasurement.weightLbs} lbs</p>
                </div>
              )}
              {latestMeasurement.bodyFatPercentage && (
                <div>
                  <p className="text-sm text-gray-600">Body Fat</p>
                  <p className="text-lg font-semibold">{latestMeasurement.bodyFatPercentage}%</p>
                </div>
              )}
              {latestMeasurement.waistCm && (
                <div>
                  <p className="text-sm text-gray-600">Waist</p>
                  <p className="text-lg font-semibold">{latestMeasurement.waistCm} cm</p>
                </div>
              )}
              {latestMeasurement.chestCm && (
                <div>
                  <p className="text-sm text-gray-600">Chest</p>
                  <p className="text-lg font-semibold">{latestMeasurement.chestCm} cm</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurements History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Measurement History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading measurements...</p>
          ) : measurements && measurements.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <Table className="min-w-[600px] sm:min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Weight</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Body Fat %</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Waist</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Chest</TableHead>
                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurements.map((measurement) => (
                    <TableRow key={measurement.id}>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {(() => {
                          const date = measurement.measurementDate ? new Date(measurement.measurementDate) : null;
                          if (!date || !isValid(date)) return '-';
                          return (
                            <>
                              <span className="hidden sm:inline">{format(date, 'MMM d, yyyy')}</span>
                              <span className="sm:hidden">{format(date, 'M/d/yy')}</span>
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{measurement.weightLbs || '-'} lbs</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{measurement.bodyFatPercentage || '-'}%</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">{measurement.waistCm || '-'} cm</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{measurement.chestCm || '-'} cm</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(measurement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No measurements recorded yet. Click "Add Measurement" to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeasurementsTab;