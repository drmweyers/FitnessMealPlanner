import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Camera, Target } from 'lucide-react';
import MeasurementsTab from '@/components/progress/MeasurementsTab';
import PhotosTab from '@/components/progress/PhotosTab';
import GoalsTab from '@/components/progress/GoalsTab';
import ProgressCharts from '@/components/progress/ProgressCharts';

/**
 * ProgressTracking Component
 * 
 * Main dashboard for customer progress tracking functionality. This component serves
 * as the central hub for customers to monitor their fitness journey through:
 * - Body measurements tracking
 * - Progress photo uploads
 * - Fitness goal management
 * - Visual progress charts
 * 
 * @component
 * @example
 * // Usage in a customer dashboard
 * <ProgressTracking />
 * 
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */
const ProgressTracking: React.FC = () => {
  /**
   * State to track which tab is currently active
   * @type {string} activeTab - Current active tab ('measurements', 'photos', 'goals')
   */
  const [activeTab, setActiveTab] = useState('measurements');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Progress Tracking</h2>
          <p className="text-gray-600 mt-1">Track your fitness journey and celebrate your achievements</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Weight</p>
                <p className="text-2xl font-bold">175 lbs</p>
                <p className="text-xs text-green-600">-5 lbs this month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Body Fat %</p>
                <p className="text-2xl font-bold">18.5%</p>
                <p className="text-xs text-green-600">-1.2% this month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-blue-600">1 near completion</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progress Photos</p>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-gray-600">Last: 3 days ago</p>
              </div>
              <Camera className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <ProgressCharts />

      {/* Tabs for different tracking types */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="photos">Progress Photos</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="measurements" className="space-y-4">
          <MeasurementsTab />
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <PhotosTab />
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <GoalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressTracking;