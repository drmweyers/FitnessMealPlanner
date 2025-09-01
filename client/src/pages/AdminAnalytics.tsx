/**
 * Admin Analytics Dashboard
 * Story 1.9: Advanced Analytics Dashboard
 * 
 * Comprehensive analytics and monitoring interface for admin users
 * with real-time metrics, charts, and system health monitoring
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Shield,
  Server
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface SystemMetrics {
  users: {
    total: number;
    byRole: Record<string, number>;
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    newThisWeek: number;
    growthRate: number;
  };
  content: {
    totalRecipes: number;
    approvedRecipes: number;
    pendingRecipes: number;
    totalMealPlans: number;
    activeMealPlans: number;
    avgRecipesPerPlan: number;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionDuration: number;
    totalSessions: number;
    bounceRate: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
    databaseSize: string;
    cacheHitRate: number;
  };
  business: {
    totalCustomers: number;
    activeSubscriptions: number;
    churnRate: number;
    avgCustomersPerTrainer: number;
    conversionRate: number;
    revenue: {
      monthly: number;
      annual: number;
      growth: number;
    };
  };
}

const AdminAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [contentMetrics, setContentMetrics] = useState<any>(null);
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Fetch all metrics on mount
  useEffect(() => {
    fetchAllMetrics();
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(fetchAllMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllMetrics = async () => {
    try {
      setLoading(true);
      
      const [metricsRes, activityRes, contentRes, securityRes, healthRes] = await Promise.all([
        fetch('/api/analytics/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/analytics/users?limit=10', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/analytics/content', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/analytics/security', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/analytics/health', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.data);
      }
      
      if (activityRes.ok) {
        const data = await activityRes.json();
        setUserActivity(data.data);
      }
      
      if (contentRes.ok) {
        const data = await contentRes.json();
        setContentMetrics(data.data);
      }
      
      if (securityRes.ok) {
        const data = await securityRes.json();
        setSecurityMetrics(data.data);
      }
      
      if (healthRes.ok) {
        const data = await healthRes.json();
        setSystemHealth(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllMetrics();
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/analytics/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export.${format}`;
        a.click();
        
        toast({
          title: 'Success',
          description: `Analytics exported as ${format.toUpperCase()}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export analytics',
        variant: 'destructive'
      });
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/analytics/cache/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Analytics cache cleared'
        });
        fetchAllMetrics();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear cache',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl" data-testid="metrics-loaded">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">System metrics and monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="touch-target"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              className="touch-target"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCache}
              className="touch-target"
            >
              Clear Cache
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics?.users.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.users.newThisWeek || 0} new this week
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            {metrics?.users.growthRate !== undefined && (
              <div className="mt-3">
                <div className={cn(
                  "inline-flex items-center text-xs font-medium",
                  metrics.users.growthRate >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metrics.users.growthRate >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(metrics.users.growthRate).toFixed(1)}% growth
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics?.engagement.dailyActiveUsers || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Daily active
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Weekly</span>
                <span className="font-medium">{metrics?.engagement.weeklyActiveUsers || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Monthly</span>
                <span className="font-medium">{metrics?.engagement.monthlyActiveUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  ${metrics?.business.revenue.monthly.toLocaleString() || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.business.activeSubscriptions || 0} active subs
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            {metrics?.business.revenue.growth !== undefined && (
              <div className="mt-3">
                <div className={cn(
                  "inline-flex items-center text-xs font-medium",
                  metrics.business.revenue.growth >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metrics.business.revenue.growth >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(metrics.business.revenue.growth).toFixed(1)}% MoM
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics?.performance.uptime || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Uptime
                </p>
              </div>
              <Server className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Response</span>
                <span className="font-medium">{metrics?.performance.avgResponseTime || 0}ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Error Rate</span>
                <span className="font-medium">{metrics?.performance.errorRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <TabsTrigger value="overview" className="touch-target">Overview</TabsTrigger>
          <TabsTrigger value="users" className="touch-target">Users</TabsTrigger>
          <TabsTrigger value="content" className="touch-target">Content</TabsTrigger>
          <TabsTrigger value="performance" className="touch-target">Performance</TabsTrigger>
          <TabsTrigger value="security" className="touch-target">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
              <CardDescription>Breakdown by role and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {metrics?.users.byRole && Object.entries(metrics.users.byRole).map(([role, count]) => (
                    <div key={role} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">{role}s</span>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                      <Progress 
                        value={(count / metrics.users.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
                {metrics?.users.byRole && (
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={Object.entries(metrics.users.byRole).map(([role, count]) => ({
                          name: role.charAt(0).toUpperCase() + role.slice(1),
                          value: count
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(metrics.users.byRole).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Content Metrics</CardTitle>
              <CardDescription>Recipes and meal plans overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Recipes</p>
                  <p className="text-2xl font-bold">{metrics?.content.totalRecipes || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics?.content.approvedRecipes || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {metrics?.content.pendingRecipes || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Meal Plans</p>
                  <p className="text-2xl font-bold">{metrics?.content.totalMealPlans || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold">{metrics?.content.activeMealPlans || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Recipes/Plan</p>
                  <p className="text-2xl font-bold">{metrics?.content.avgRecipesPerPlan || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Business Metrics</CardTitle>
              <CardDescription>Key business indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{metrics?.business.totalCustomers || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Churn Rate</p>
                  <p className="text-2xl font-bold">{metrics?.business.churnRate || 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Conversion</p>
                  <p className="text-2xl font-bold">{metrics?.business.conversionRate || 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg per Trainer</p>
                  <p className="text-2xl font-bold">{metrics?.business.avgCustomersPerTrainer || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
              <CardDescription>Last active users and their actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivity.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.role} • {user.sessionCount} sessions • {user.totalDuration}min total
                      </p>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>User engagement statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Session</p>
                  <p className="text-2xl font-bold">
                    {metrics?.engagement.avgSessionDuration || 0} min
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{metrics?.engagement.totalSessions || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Bounce Rate</p>
                  <p className="text-2xl font-bold">{metrics?.engagement.bounceRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          {contentMetrics && (
            <>
              {/* Recipe Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Recipe Creation Trends</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={contentMetrics.recipeTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="created" 
                        stroke="#8884d8" 
                        name="Created"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="approved" 
                        stroke="#82ca9d" 
                        name="Approved"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Popular Recipes */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Recipes</CardTitle>
                  <CardDescription>Most viewed and used recipes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contentMetrics.popularRecipes?.map((recipe: any) => (
                      <div key={recipe.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{recipe.name}</span>
                        <div className="flex gap-4">
                          <Badge variant="outline">
                            {recipe.views} views
                          </Badge>
                          <Badge variant="outline">
                            {recipe.uses} uses
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>Real-time performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="text-sm font-bold">
                        {metrics?.performance.avgResponseTime || 0}ms
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((metrics?.performance.avgResponseTime || 0) / 500 * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-sm font-bold">
                        {metrics?.performance.errorRate || 0}%
                      </span>
                    </div>
                    <Progress 
                      value={metrics?.performance.errorRate || 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Cache Hit Rate</span>
                      <span className="text-sm font-bold">
                        {metrics?.performance.cacheHitRate || 0}%
                      </span>
                    </div>
                    <Progress 
                      value={metrics?.performance.cacheHitRate || 0} 
                      className="h-2"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Database</p>
                    <p className="text-2xl font-bold">{metrics?.performance.databaseSize}</p>
                  </div>
                  
                  {systemHealth && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Memory Usage</p>
                      <p className="text-2xl font-bold">
                        {systemHealth.memory.used} / {systemHealth.memory.total} MB
                      </p>
                      <Progress 
                        value={(systemHealth.memory.used / systemHealth.memory.total) * 100} 
                        className="h-2 mt-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Status */}
          {systemHealth && (
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Component status and uptime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(systemHealth.components).map(([component, status]) => (
                    <div key={component} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{component}</span>
                      <Badge 
                        variant={status === 'healthy' ? 'success' : status === 'not configured' ? 'secondary' : 'destructive'}
                      >
                        {status as string}
                      </Badge>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">System Uptime</span>
                      <span className="text-sm font-bold">
                        {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {securityMetrics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Security Overview</CardTitle>
                  <CardDescription>Security metrics and alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Security Score</p>
                      <p className="text-2xl font-bold">{securityMetrics.securityScore}/100</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Failed Logins</p>
                      <p className="text-2xl font-bold">{securityMetrics.failedLogins}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Blocked IPs</p>
                      <p className="text-2xl font-bold">{securityMetrics.blockedIPs?.length || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Alerts</p>
                      <p className="text-2xl font-bold">
                        {securityMetrics.suspiciousActivities?.length || 0}
                      </p>
                    </div>
                  </div>
                  
                  {securityMetrics.suspiciousActivities?.length > 0 && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {securityMetrics.suspiciousActivities.length} suspicious activities detected
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Recent Security Events</h4>
                    {securityMetrics.suspiciousActivities?.map((activity: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.ip} • {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="warning">Alert</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;