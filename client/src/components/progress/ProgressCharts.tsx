import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const ProgressCharts: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <TrendingDown className="mr-2 h-4 w-4 text-green-600" />
            Weight Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Chart visualization coming soon</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-blue-600" />
            Body Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Chart visualization coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressCharts;