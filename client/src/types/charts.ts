// Chart data types for progress tracking visualizations

export interface Measurement {
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

export interface WeightDataPoint {
  date: string;
  weight: number;
  formattedDate: string;
  displayDate: string;
}

export interface BodyMeasurementDataPoint {
  date: string;
  formattedDate: string;
  displayDate: string;
  waist?: number;
  chest?: number;
  hips?: number;
  neck?: number;
  shoulders?: number;
  bicepLeft?: number;
  bicepRight?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface ChartConfig {
  colors: {
    weight: string;
    waist: string;
    chest: string;
    hips: string;
    neck: string;
    shoulders: string;
    bicepLeft: string;
    bicepRight: string;
    thighLeft: string;
    thighRight: string;
    calfLeft: string;
    calfRight: string;
    bodyFat: string;
    muscleMass: string;
  };
}

export interface WeightUnit {
  value: 'lbs' | 'kg';
  label: string;
}

export interface BodyMeasurementType {
  key: keyof BodyMeasurementDataPoint;
  label: string;
  color: string;
  unit: string;
  enabled: boolean;
}

export interface ChartTimeRange {
  value: '7d' | '30d' | '90d' | '6m' | '1y' | 'all';
  label: string;
}

export interface ChartLoadingState {
  isLoading: boolean;
  error?: string;
}

export interface TrendData {
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  direction: 1 | -1 | 0;
}

export interface WeightTrendAnalysis {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: TrendData;
  period: string;
}