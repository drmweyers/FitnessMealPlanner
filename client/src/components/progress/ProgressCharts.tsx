import React from 'react';
import WeightProgressChart from '@/components/charts/WeightProgressChart';
import BodyMeasurementChart from '@/components/charts/BodyMeasurementChart';

const ProgressCharts: React.FC = () => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <WeightProgressChart className="w-full" />
      <BodyMeasurementChart className="w-full" />
    </div>
  );
};

export default ProgressCharts;