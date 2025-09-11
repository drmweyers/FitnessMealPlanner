import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Activity } from 'lucide-react';
import MeasurementsTab from '@/components/progress/MeasurementsTab';
import ProgressCharts from '@/components/progress/ProgressCharts';

/**
 * ProgressTracking Component
 * 
 * Main dashboard for customer progress tracking functionality. This component serves
 * as the central hub for customers to monitor their fitness journey through:
 * - Body measurements tracking
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
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Progress Tracking</h2>
          <p className="text-gray-600 mt-1">Track your fitness journey and celebrate your achievements</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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


      </div>

      {/* Progress Charts */}
      <ProgressCharts />

      {/* Tabs for different tracking types */}
      {/* Measurements Section */}
      <div className="space-y-4">
        <MeasurementsTab />
      </div>
    </div>
  );
};

export default ProgressTracking;