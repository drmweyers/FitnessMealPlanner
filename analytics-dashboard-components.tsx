/**
 * 🎨 ANALYTICS DASHBOARD COMPONENTS
 * FitnessMealPlanner 3-Tier Analytics System
 *
 * Tier-aware dashboard components with automatic access control
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Alert, AlertDescription,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Progress, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui';
import {
  TrendingUp, TrendingDown, Users, DollarSign, Target,
  AlertTriangle, Star, BarChart3, PieChart as PieChartIcon,
  Settings, Lock, Crown, Zap
} from 'lucide-react';

// =====================================
// TYPE DEFINITIONS
// =====================================

interface SubscriptionTier {
  tier: 'tier1_basic' | 'tier2_analytics' | 'tier3_advanced';
  features: string[];
  isActive: boolean;
}

interface DashboardProps {
  userTier: SubscriptionTier;
  trainerId: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  tier: 'tier2_analytics' | 'tier3_advanced';
  requiredTier: string;
}

interface ClientMetric {
  id: string;
  name: string;
  email: string;
  engagementScore: number;
  lastActive: Date;
  progressTrend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
}

// =====================================
// TIER ACCESS CONTROL COMPONENTS
// =====================================

const TierGate: React.FC<{
  requiredTier: string;
  userTier: SubscriptionTier;
  feature: string;
  children: React.ReactNode;
}> = ({ requiredTier, userTier, feature, children }) => {
  const hasAccess = userTier.tier !== 'tier1_basic' &&
    (requiredTier === 'tier2_analytics' || userTier.tier === 'tier3_advanced');

  if (!hasAccess) {
    return <AnalyticsUpsell requiredTier={requiredTier} feature={feature} />;
  }

  return <>{children}</>;
};

const AnalyticsUpsell: React.FC<{
  requiredTier: string;
  feature: string;
}> = ({ requiredTier, feature }) => {
  const tierInfo = {
    tier2_analytics: {
      name: 'Analytics Pro',
      price: '$299/month',
      icon: <BarChart3 className="h-6 w-6" />,
      benefits: [
        'Client engagement tracking',
        'Basic business reports',
        'Performance dashboards',
        'Export capabilities'
      ]
    },
    tier3_advanced: {
      name: 'Analytics Enterprise',
      price: '$399/month',
      icon: <Crown className="h-6 w-6" />,
      benefits: [
        'AI-powered predictions',
        'Custom dashboards',
        'Competitive intelligence',
        'Advanced segmentation'
      ]
    }
  };

  const info = tierInfo[requiredTier as keyof typeof tierInfo];

  return (
    <Card className="border-dashed border-2 border-primary/20">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 p-3 bg-primary/10 rounded-full">
          {info.icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Unlock {feature} with {info.name}
        </h3>
        <p className="text-muted-foreground mb-4">
          Get advanced analytics and insights to grow your business
        </p>
        <div className="mb-4">
          <ul className="text-sm space-y-1">
            {info.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center">
                <Star className="h-4 w-4 text-primary mr-2" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <Button className="w-full">
          Upgrade to {info.name} - {info.price}
        </Button>
      </CardContent>
    </Card>
  );
};

// =====================================
// TIER 2 ANALYTICS COMPONENTS
// =====================================

const Tier2Dashboard: React.FC<DashboardProps> = ({ userTier, trainerId }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/analytics/dashboard/overview');
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [trainerId]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clients"
          value={dashboardData?.totalClients || 0}
          change={dashboardData?.clientGrowth}
          trend="up"
          icon={<Users className="h-5 w-5" />}
          tier="tier2_analytics"
          requiredTier="tier2_analytics"
        />
        <MetricCard
          title="Active Clients"
          value={dashboardData?.activeClients || 0}
          change={dashboardData?.activeGrowth}
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
          tier="tier2_analytics"
          requiredTier="tier2_analytics"
        />
        <MetricCard
          title="Meal Plans Created"
          value={dashboardData?.totalMealPlans || 0}
          icon={<Target className="h-5 w-5" />}
          tier="tier2_analytics"
          requiredTier="tier2_analytics"
        />
        <MetricCard
          title="Avg Engagement"
          value={`${dashboardData?.avgEngagement || 0}%`}
          trend={dashboardData?.engagementTrend}
          icon={<Star className="h-5 w-5" />}
          tier="tier2_analytics"
          requiredTier="tier2_analytics"
        />
      </div>

      {/* Client Engagement Chart */}
      <TierGate requiredTier="tier2_analytics" userTier={userTier} feature="Client Engagement Tracking">
        <ClientEngagementChart data={dashboardData?.engagementData} />
      </TierGate>

      {/* Client Performance Table */}
      <TierGate requiredTier="tier2_analytics" userTier={userTier} feature="Client Performance Metrics">
        <ClientPerformanceTable trainerId={trainerId} />
      </TierGate>

      {/* Basic Reports */}
      <TierGate requiredTier="tier2_analytics" userTier={userTier} feature="Business Reports">
        <BasicReportsSection trainerId={trainerId} />
      </TierGate>
    </div>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({
  title, value, change, trend, icon, tier, requiredTier
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {tier === 'tier3_advanced' ? 'PRO' : 'ANALYTICS'}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">{value}</div>
          {change !== undefined && (
            <div className={`flex items-center mt-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm ml-1">
                {change > 0 ? '+' : ''}{change}% from last month
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ClientEngagementChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Client Engagement Trends
          <Badge variant="outline">Last 30 Days</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const ClientPerformanceTable: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const [clients, setClients] = useState<ClientMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/analytics/clients/metrics');
        const data = await response.json();
        setClients(data);
      } catch (error) {
        console.error('Failed to fetch client metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [trainerId]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div>
                  <h4 className="font-medium">{client.name}</h4>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-sm font-medium">{client.engagementScore}%</div>
                  <div className="text-xs text-muted-foreground">Engagement</div>
                </div>
                <Badge
                  variant={client.progressTrend === 'improving' ? 'default' :
                          client.progressTrend === 'declining' ? 'destructive' : 'secondary'}
                >
                  {client.progressTrend}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const BasicReportsSection: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = async (reportType: string) => {
    setGenerating(reportType);
    try {
      const response = await fetch(`/api/analytics/reports/basic/${reportType}`, {
        method: 'GET',
      });
      const report = await response.json();
      setReports(prev => [...prev, report]);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Business Reports
          <Badge variant="outline">10/month limit</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => generateReport('weekly_summary')}
            disabled={generating === 'weekly_summary'}
          >
            {generating === 'weekly_summary' ? 'Generating...' : 'Weekly Summary'}
          </Button>
          <Button
            onClick={() => generateReport('client_progress')}
            disabled={generating === 'client_progress'}
          >
            {generating === 'client_progress' ? 'Generating...' : 'Client Progress'}
          </Button>
          <Button
            onClick={() => generateReport('recipe_analytics')}
            disabled={generating === 'recipe_analytics'}
          >
            {generating === 'recipe_analytics' ? 'Generating...' : 'Recipe Analytics'}
          </Button>
        </div>

        {reports.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Recent Reports</h4>
            <div className="space-y-2">
              {reports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{report.reportType}</div>
                    <div className="text-sm text-muted-foreground">
                      Generated {new Date(report.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =====================================
// TIER 3 ADVANCED ANALYTICS COMPONENTS
// =====================================

const Tier3Dashboard: React.FC<DashboardProps> = ({ userTier, trainerId }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Enhanced Overview with Predictions */}
      <TierGate requiredTier="tier3_advanced" userTier={userTier} feature="Advanced Analytics">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Tier2Dashboard userTier={userTier} trainerId={trainerId} />
            <AdvancedMetricsGrid trainerId={trainerId} />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <PredictiveAnalytics trainerId={trainerId} />
          </TabsContent>

          <TabsContent value="segmentation" className="space-y-6">
            <CustomerSegmentation trainerId={trainerId} />
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <CompetitiveIntelligence trainerId={trainerId} />
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <CustomDashboardBuilder trainerId={trainerId} />
          </TabsContent>
        </Tabs>
      </TierGate>
    </div>
  );
};

const PredictiveAnalytics: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const [churnPredictions, setChurnPredictions] = useState<any[]>([]);
  const [revenueForecast, setRevenueForecast] = useState<any>(null);

  useEffect(() => {
    // Fetch prediction data
    const fetchPredictions = async () => {
      const [churnRes, revenueRes] = await Promise.all([
        fetch('/api/analytics/predictions/churn-risk'),
        fetch('/api/analytics/predictions/revenue-forecast')
      ]);

      setChurnPredictions(await churnRes.json());
      setRevenueForecast(await revenueRes.json());
    };

    fetchPredictions();
  }, [trainerId]);

  return (
    <div className="space-y-6">
      {/* Churn Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Churn Risk Analysis
            <Badge variant="outline" className="ml-2">AI-Powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['high', 'medium', 'low'].map((risk) => (
              <div key={risk} className={`p-4 rounded-lg border ${
                risk === 'high' ? 'border-red-200 bg-red-50' :
                risk === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }`}>
                <div className="font-medium capitalize">{risk} Risk</div>
                <div className="text-2xl font-bold">
                  {churnPredictions.filter(p => p.riskLevel === risk).length}
                </div>
                <div className="text-sm text-muted-foreground">clients</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-3">High-Risk Clients</h4>
            <div className="space-y-2">
              {churnPredictions
                .filter(p => p.riskLevel === 'high')
                .slice(0, 5)
                .map((prediction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium">{prediction.clientName}</div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round(prediction.churnProbability * 100)}% churn probability
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Actions</Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Revenue Forecast
            <Badge variant="outline" className="ml-2">ML-Powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueForecast && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueForecast.predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="predictedRevenue" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="confidenceLower" stroke="#82ca9d" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="confidenceUpper" stroke="#82ca9d" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CustomerSegmentation: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    const fetchSegments = async () => {
      const response = await fetch('/api/analytics/segmentation/clusters');
      setSegments(await response.json());
    };

    fetchSegments();
  }, [trainerId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2" />
            Customer Segments
            <Badge variant="outline" className="ml-2">AI-Generated</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment, index) => (
              <Card key={segment.segmentId} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{segment.segmentName}</h4>
                  <Badge variant="outline">{segment.clientCount} clients</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{segment.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Avg LTV:</span>
                    <span className="font-medium">${segment.averageValue.ltv}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Engagement:</span>
                    <span className="font-medium">{segment.averageValue.engagementScore}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Retention:</span>
                    <span className="font-medium">{segment.averageValue.retentionRate}%</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-3" size="sm">
                  View Segment Details
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CompetitiveIntelligence: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      const response = await fetch('/api/analytics/bi/competitive-analysis');
      setAnalysis(await response.json());
    };

    fetchAnalysis();
  }, [trainerId]);

  if (!analysis) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Market Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">#{analysis.marketPosition.ranking}</div>
              <div className="text-sm text-muted-foreground">Market Ranking</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{analysis.marketPosition.marketShare}%</div>
              <div className="text-sm text-muted-foreground">Market Share</div>
            </div>
            <div className="text-center">
              <Badge variant={analysis.marketPosition.trend === 'improving' ? 'default' : 'secondary'}>
                {analysis.marketPosition.trend}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Trend</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.benchmarks.map((benchmark: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{benchmark.metric}</h4>
                  <Badge variant={
                    benchmark.performanceRating === 'above_average' ? 'default' :
                    benchmark.performanceRating === 'below_average' ? 'destructive' : 'secondary'
                  }>
                    {benchmark.performanceRating.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Your Value</div>
                    <div className="font-medium">{benchmark.yourValue}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Industry Avg</div>
                    <div className="font-medium">{benchmark.industryAverage}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Top Quartile</div>
                    <div className="font-medium">{benchmark.topQuartile}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CustomDashboardBuilder: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Custom Dashboards
            <Button onClick={() => setIsCreating(true)}>
              Create Dashboard
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="p-4">
                <h4 className="font-medium mb-2">{dashboard.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{dashboard.description}</p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </Card>
            ))}

            {dashboards.length < 5 && (
              <Card className="p-4 border-dashed border-2 border-primary/20">
                <div className="text-center">
                  <div className="text-muted-foreground mb-2">Create new dashboard</div>
                  <Button variant="outline" onClick={() => setIsCreating(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    New Dashboard
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dashboard Name</label>
              <input className="w-full mt-1 p-2 border rounded-md" placeholder="My Custom Dashboard" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea className="w-full mt-1 p-2 border rounded-md" placeholder="Dashboard description" rows={3} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button>Create Dashboard</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// =====================================
// UTILITY COMPONENTS
// =====================================

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const AdvancedMetricsGrid: React.FC<{ trainerId: string }> = ({ trainerId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Client LTV"
        value="$1,240"
        change={15.3}
        trend="up"
        icon={<DollarSign className="h-5 w-5" />}
        tier="tier3_advanced"
        requiredTier="tier3_advanced"
      />
      <MetricCard
        title="Retention Rate"
        value="92%"
        change={5.2}
        trend="up"
        icon={<Target className="h-5 w-5" />}
        tier="tier3_advanced"
        requiredTier="tier3_advanced"
      />
      <MetricCard
        title="Prediction Accuracy"
        value="87%"
        icon={<Zap className="h-5 w-5" />}
        tier="tier3_advanced"
        requiredTier="tier3_advanced"
      />
    </div>
  );
};

// =====================================
// MAIN DASHBOARD COMPONENT
// =====================================

const AnalyticsDashboard: React.FC<DashboardProps> = ({ userTier, trainerId }) => {
  // Tier 1: Show upgrade prompt
  if (userTier.tier === 'tier1_basic') {
    return (
      <div className="flex items-center justify-center min-h-96">
        <AnalyticsUpsell requiredTier="tier2_analytics" feature="Analytics Dashboard" />
      </div>
    );
  }

  // Tier 2: Basic analytics
  if (userTier.tier === 'tier2_analytics') {
    return <Tier2Dashboard userTier={userTier} trainerId={trainerId} />;
  }

  // Tier 3: Advanced analytics
  return <Tier3Dashboard userTier={userTier} trainerId={trainerId} />;
};

export default AnalyticsDashboard;
export {
  TierGate,
  AnalyticsUpsell,
  MetricCard,
  ClientEngagementChart,
  PredictiveAnalytics,
  CustomerSegmentation,
  CompetitiveIntelligence,
  CustomDashboardBuilder
};