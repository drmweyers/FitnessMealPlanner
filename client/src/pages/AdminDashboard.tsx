/**
 * Admin Dashboard - Advanced Comprehensive System Control
 *
 * Full-featured admin dashboard with advanced data visualization,
 * real-time monitoring, detailed analytics, and comprehensive system control.
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import {
  Users,
  TrendingUp,
  Activity,
  Database,
  Shield,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  BarChart3,
  PieChart,
  Clock,
  DollarSign,
  FileText,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
  TrendingDown,
  Zap,
  Globe,
  Mail,
  MessageSquare,
  Settings,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download as DownloadIcon,
  Upload,
  Filter as FilterIcon,
  X,
  Bug,
  Image as ImageIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";

interface SystemOverview {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  content: {
    totalRecipes: number;
    approvedRecipes: number;
    pendingRecipes: number;
    totalMealPlans: number;
    recipesCreatedToday: number;
  };
  engagement: {
    totalInteractions: number;
    interactionsToday: number;
    activeUsersToday: number;
    averageSessionDuration: number;
  };
  subscriptions: {
    total: number;
    active: number;
    byTier: Record<string, number>;
    revenue: {
      monthly: number;
      total: number;
    };
  };
  system: {
    uptime: number;
    databaseSize: string;
    averageResponseTime: number;
  };
}

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "trainer" | "customer";
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastActive?: Date;
  totalRecipes?: number;
  totalMealPlans?: number;
  totalCustomers?: number;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  totalInteractions?: number;
  accountAge?: number;
}

interface UsageStats {
  totalUsers: number;
  usersByRole: {
    admin: number;
    trainer: number;
    customer: number;
  };
  activeUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  totalRecipes: number;
  approvedRecipes: number;
  pendingRecipes: number;
  totalMealPlans: number;
  totalInteractions: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  revenue: {
    monthly: number;
    total: number;
  };
  usageByFeature: {
    recipeViews: number;
    mealPlanGenerations: number;
    pdfExports: number;
    recipeFavorites: number;
  };
}

interface AccessLog {
  userId?: string;
  email?: string;
  role?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

function MealPlanRow({
  mp,
  dateField,
  color,
  formatDate,
}: {
  mp: any;
  dateField: string;
  color: string;
  formatDate: (d: any) => string;
}) {
  const d = mp.mealPlanData;
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border border-slate-100 bg-white hover:border-${color}-200 hover:shadow-sm transition-all`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-900 truncate">
          {d?.planName || "Unnamed plan"}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
          {d?.fitnessGoal && (
            <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-full">
              {d.fitnessGoal.replace(/_/g, " ")}
            </span>
          )}
          {d?.dailyCalorieTarget && <span>{d.dailyCalorieTarget} kcal</span>}
          {d?.clientName && (
            <span className="text-purple-500">{d.clientName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-center px-2">
          <div className="text-sm font-semibold text-slate-700">
            {d?.days ?? "?"}
          </div>
          <div className="text-[10px] text-slate-400">days</div>
        </div>
        <div className="text-center px-2">
          <div className="text-sm font-semibold text-slate-700">
            {d?.mealsPerDay ?? "?"}
          </div>
          <div className="text-[10px] text-slate-400">meals</div>
        </div>
        <div className="text-xs text-slate-400 w-24 text-right">
          {formatDate(mp[dateField])}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-12 rounded-2xl bg-slate-50">
      <Icon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
      <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d",
  );
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAccessLogs, setShowAccessLogs] = useState(false);

  // Fetch system overview
  const { data: overview, isLoading: overviewLoading } = useQuery<{
    data: SystemOverview;
  }>({
    queryKey: ["admin-dashboard-overview"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/overview", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch overview");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch usage stats with date range
  const { data: usageStats, isLoading: statsLoading } = useQuery<{
    data: UsageStats;
  }>({
    queryKey: ["admin-usage-stats", dateRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setFullYear(2020); // All time
      }

      const response = await fetch(
        `/api/admin/dashboard/usage-stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch usage stats");
      return response.json();
    },
  });

  // Fetch users with advanced filtering
  const { data: usersData, isLoading: usersLoading } = useQuery<{
    data: { users: UserInfo[]; pagination: any };
  }>({
    queryKey: ["admin-users", userSearch, userRoleFilter, sortField, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch) params.append("search", userSearch);
      if (userRoleFilter !== "all") params.append("role", userRoleFilter);
      params.append("sortBy", sortField);
      params.append("sortOrder", sortOrder);
      params.append("limit", "500");

      const response = await fetch(`/api/admin/dashboard/users?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch access logs
  const { data: accessLogsData, isLoading: logsLoading } = useQuery<{
    data: { logs: AccessLog[] };
  }>({
    queryKey: ["admin-access-logs", dateRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const response = await fetch(
        `/api/admin/dashboard/access-logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch access logs");
      return response.json();
    },
    enabled: showAccessLogs,
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(
        `/api/admin/dashboard/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ role }),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-overview"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/dashboard/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-overview"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setShowUserDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/dashboard/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      // #region agent log
      const ud = data.data;
      console.log(
        "[DEBUG-d6138b] handleViewUser response:",
        JSON.stringify({
          hasData: !!ud,
          role: ud?.role,
          createdAt: ud?.createdAt,
          updatedAt: ud?.updatedAt,
          accountAge: ud?.accountAge,
          totalMealPlans: ud?.totalMealPlans,
          totalCustomers: ud?.totalCustomers,
          trainerMealPlansLen: Array.isArray(ud?.trainerMealPlans)
            ? ud.trainerMealPlans.length
            : "NOT_ARRAY",
          trainerAssignedLen: Array.isArray(ud?.trainerAssignedMealPlans)
            ? ud.trainerAssignedMealPlans.length
            : "NOT_ARRAY",
          customerAssignedLen: Array.isArray(ud?.customerAssignedMealPlans)
            ? ud.customerAssignedMealPlans.length
            : "NOT_ARRAY",
        }),
      );
      // #endregion
      setSelectedUser(data.data);
      setShowUserDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (type: "users" | "stats" | "logs") => {
    try {
      let url = "";
      switch (type) {
        case "users":
          url = `/api/admin/dashboard/users?limit=10000`;
          break;
        case "stats":
          url = `/api/admin/dashboard/usage-stats`;
          break;
        case "logs":
          url = `/api/admin/dashboard/access-logs?limit=10000`;
          break;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to export data");
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url_blob = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url_blob;
      a.download = `admin-${type}-${new Date().toISOString()}.json`;
      a.click();

      toast({
        title: "Success",
        description: `${type} exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch REAL time series data from API
  const { data: timeSeriesDataResponse, isLoading: timeSeriesLoading } =
    useQuery<{
      data: Array<{
        date: string;
        users: number;
        interactions: number;
        revenue: number;
      }>;
    }>({
      queryKey: ["admin-time-series", dateRange],
      queryFn: async () => {
        const days =
          dateRange === "7d"
            ? 7
            : dateRange === "30d"
              ? 30
              : dateRange === "90d"
                ? 90
                : 365;
        const response = await fetch(
          `/api/admin/dashboard/time-series?days=${days}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch time series data");
        return response.json();
      },
    });

  // Prepare chart data
  const userRoleData = overview?.data?.users.byRole
    ? Object.entries(overview.data.users.byRole).map(([role, count]) => ({
        name: role.charAt(0).toUpperCase() + role.slice(1),
        value: count,
      }))
    : [];

  const subscriptionTierData = overview?.data?.subscriptions.byTier
    ? Object.entries(overview.data.subscriptions.byTier).map(
        ([tier, count]) => ({
          name: tier.charAt(0).toUpperCase() + tier.slice(1),
          value: count,
        }),
      )
    : [];

  const timeSeriesData = timeSeriesDataResponse?.data || [];

  // Calculate REAL growth percentages from time series data
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calculate user growth: compare today vs yesterday from time series
  const todayUsers =
    timeSeriesData.length > 0
      ? timeSeriesData[timeSeriesData.length - 1]?.users || 0
      : 0;
  const yesterdayUsers =
    timeSeriesData.length > 1
      ? timeSeriesData[timeSeriesData.length - 2]?.users || 0
      : 0;
  const userGrowth = calculateGrowth(todayUsers, yesterdayUsers);

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be an admin to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Complete system control and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={dateRange}
            onValueChange={(value: any) => setDateRange(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["admin-dashboard-overview"],
              });
              queryClient.invalidateQueries({
                queryKey: ["admin-usage-stats"],
              });
              queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            }}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("users")}>
                Export Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("stats")}>
                Export Statistics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("logs")}>
                Export Access Logs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="bugs" className="flex items-center gap-1.5">
            <Bug className="h-4 w-4" />
            Bugs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {overviewLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(overview?.data?.users.total || 0)}
                    </div>
                    <div className="flex items-center text-xs">
                      {userGrowth >= 0 ? (
                        <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span
                        className={
                          userGrowth >= 0 ? "text-green-500" : "text-red-500"
                        }
                      >
                        {Math.abs(userGrowth).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground ml-1">
                        vs yesterday
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      +{overview?.data?.users.newToday || 0} today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Recipes
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(overview?.data?.content.totalRecipes || 0)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default">
                        {overview?.data?.content.approvedRecipes || 0} approved
                      </Badge>
                      <Badge variant="secondary">
                        {overview?.data?.content.pendingRecipes || 0} pending
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {overview?.data?.content.recipesCreatedToday || 0} created
                      today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Subscriptions
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(overview?.data?.subscriptions.active || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(
                        overview?.data?.subscriptions.revenue.monthly || 0,
                      )}
                      /month
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total:{" "}
                      {formatCurrency(
                        overview?.data?.subscriptions.revenue.total || 0,
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Users Today
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(
                        overview?.data?.engagement.activeUsersToday || 0,
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(
                        overview?.data?.engagement.interactionsToday || 0,
                      )}{" "}
                      interactions
                    </p>
                    <Progress
                      value={
                        ((overview?.data?.engagement.activeUsersToday || 0) /
                          (overview?.data?.users.total || 1)) *
                        100
                      }
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth Trend</CardTitle>
                    <CardDescription>New users over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="users"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Metrics</CardTitle>
                    <CardDescription>Interactions and activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="interactions"
                          fill="#8884d8"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#ff7300"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Distribution Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={userRoleData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {userRoleData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscriptions by Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={subscriptionTierData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {subscriptionTierData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Users Tab - Modern Card Design */}
        <TabsContent value="users" className="space-y-6">
          {/* Header with Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  User Management
                </h2>
                <p className="text-slate-600 mt-1">
                  View and manage all system users (
                  {formatNumber(usersData?.data?.pagination?.total || 0)} total)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("users")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["admin-users"],
                    });
                    toast({
                      title: "Users refreshed",
                      description: "User data has been updated",
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <Card className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email, name, or role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={userRoleFilter}
                    onValueChange={setUserRoleFilter}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="trainer">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          Trainer
                        </div>
                      </SelectItem>
                      <SelectItem value="customer">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-3 w-3" />
                          Customer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Recent</SelectItem>
                      <SelectItem value="email">Email A-Z</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="flex-shrink-0"
                  >
                    {sortOrder === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Users Grid */}
          {usersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !usersData?.data?.users?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground mb-4">
                  {userSearch || userRoleFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No users have been registered yet"}
                </p>
                {(userSearch || userRoleFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUserSearch("");
                      setUserRoleFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {usersData.data.users.map((userItem) => (
                <Card
                  key={userItem.id}
                  className="group hover:shadow-md transition-all duration-200 hover:border-primary/20"
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* User Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                                userItem.role === "admin"
                                  ? "bg-red-500"
                                  : userItem.role === "trainer"
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                              }`}
                            >
                              {userItem.role === "admin" ? (
                                <Shield className="h-6 w-6" />
                              ) : userItem.role === "trainer" ? (
                                <Users className="h-6 w-6" />
                              ) : (
                                <UserPlus className="h-6 w-6" />
                              )}
                            </div>
                            {/* Active status indicator */}
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${(() => {
                                if (!userItem.lastActive) return "bg-gray-300";
                                try {
                                  return new Date(
                                    userItem.lastActive,
                                  ).getTime() >
                                    Date.now() - 7 * 24 * 60 * 60 * 1000
                                    ? "bg-green-500"
                                    : "bg-gray-300";
                                } catch {
                                  return "bg-gray-300";
                                }
                              })()}`}
                            ></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {userItem.name || userItem.email.split("@")[0]}
                            </h3>
                            <p className="text-sm text-slate-600 truncate">
                              {userItem.email}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewUser(userItem.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {userItem.role !== "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: userItem.id,
                                      role: "trainer",
                                    })
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Set as Trainer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: userItem.id,
                                      role: "customer",
                                    })
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Set as Customer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    if (
                                      confirm(`Delete user ${userItem.email}?`)
                                    ) {
                                      deleteUserMutation.mutate(userItem.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Role Badge */}
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            userItem.role === "admin"
                              ? "destructive"
                              : userItem.role === "trainer"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {userItem.role}
                        </Badge>
                        {userItem.subscriptionTier && (
                          <Badge variant="outline" className="text-xs">
                            {userItem.subscriptionTier}
                          </Badge>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                          <div className="text-xl font-bold text-slate-900">
                            {userItem.totalInteractions || 0}
                          </div>
                          <div className="text-xs text-slate-600">
                            Interactions
                          </div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                          <div className="text-xl font-bold text-slate-900">
                            {userItem.accountAge || 0}
                          </div>
                          <div className="text-xs text-slate-600">Days old</div>
                        </div>
                        {userItem.role === "trainer" && (
                          <>
                            <div className="text-center p-2 bg-blue-50 rounded-lg">
                              <div className="text-xl font-bold text-blue-900">
                                {userItem.totalCustomers || 0}
                              </div>
                              <div className="text-xs text-blue-600">
                                Customers
                              </div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="text-xl font-bold text-green-900">
                                {userItem.totalMealPlans || 0}
                              </div>
                              <div className="text-xs text-green-600">
                                Meal Plans
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Joined {formatDate(userItem.createdAt)}</span>
                          <span>Active {formatDate(userItem.lastActive)}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleViewUser(userItem.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {usersData?.data?.pagination &&
            usersData.data.pagination.total > 20 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {usersData.data.users.length} of{" "}
                      {formatNumber(usersData.data.pagination.total)} users
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* Statistics Tab - Enhanced */}
        <TabsContent value="statistics" className="space-y-4">
          {statsLoading ? (
            <div className="text-center py-8">Loading statistics...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Total Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageStats?.data?.totalUsers || 0)}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Active (Month)
                        </span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.activeUsers.thisMonth || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Active (Week)
                        </span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.activeUsers.thisWeek || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Active (Today)
                        </span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.activeUsers.today || 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageStats?.data?.totalRecipes || 0)}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Approved</span>
                        <span className="font-medium">
                          {formatNumber(usageStats?.data?.approvedRecipes || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-medium">
                          {formatNumber(usageStats?.data?.pendingRecipes || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Meal Plans
                        </span>
                        <span className="font-medium">
                          {formatNumber(usageStats?.data?.totalMealPlans || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageStats?.data?.totalInteractions || 0)}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Recipe Views
                        </span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.usageByFeature.recipeViews || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Favorites</span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.usageByFeature.recipeFavorites ||
                              0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          PDF Exports
                        </span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.usageByFeature.pdfExports || 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(usageStats?.data?.revenue.monthly || 0)}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly</span>
                        <span className="font-medium">
                          {formatCurrency(
                            usageStats?.data?.revenue.monthly || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">
                          {formatCurrency(usageStats?.data?.revenue.total || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Active Subs
                        </span>
                        <span className="font-medium">
                          {formatNumber(
                            usageStats?.data?.activeSubscriptions || 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={[
                        {
                          name: "Recipe Views",
                          value:
                            usageStats?.data?.usageByFeature.recipeViews || 0,
                        },
                        {
                          name: "Meal Plans",
                          value:
                            usageStats?.data?.usageByFeature
                              .mealPlanGenerations || 0,
                        },
                        {
                          name: "PDF Exports",
                          value:
                            usageStats?.data?.usageByFeature.pdfExports || 0,
                        },
                        {
                          name: "Favorites",
                          value:
                            usageStats?.data?.usageByFeature.recipeFavorites ||
                            0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Activity Tab - New */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Access Logs</CardTitle>
                  <CardDescription>
                    Monitor all system access and user activities
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccessLogs(!showAccessLogs)}
                >
                  {showAccessLogs ? "Hide" : "Show"} Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAccessLogs ? (
                logsLoading ? (
                  <div className="text-center py-8">Loading access logs...</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Response Time</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessLogsData?.data?.logs
                          ?.slice(0, 100)
                          .map((log, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-xs">
                                {formatDate(log.timestamp)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {log.email || "Anonymous"}
                                  </span>
                                  {log.role && (
                                    <Badge variant="outline" className="w-fit">
                                      {log.role}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {log.endpoint}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.method === "GET"
                                      ? "default"
                                      : log.method === "POST"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {log.method}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.statusCode >= 200 &&
                                    log.statusCode < 300
                                      ? "default"
                                      : log.statusCode >= 400
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {log.statusCode}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.responseTime}ms</TableCell>
                              <TableCell className="font-mono text-xs">
                                {log.ipAddress}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Click "Show Logs" to view access logs
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab - Enhanced */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">System Uptime</span>
                    <span className="text-sm font-bold">
                      {overview?.data?.system.uptime
                        ? formatUptime(overview.data.system.uptime)
                        : "N/A"}
                    </span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">
                      Average Response Time
                    </span>
                    <span className="text-sm font-bold">
                      {overview?.data?.system.averageResponseTime
                        ? `${overview.data.system.averageResponseTime}ms`
                        : "N/A"}
                    </span>
                  </div>
                  <Progress
                    value={
                      overview?.data?.system.averageResponseTime
                        ? Math.min(
                            (overview.data.system.averageResponseTime / 1000) *
                              100,
                            100,
                          )
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Database Size</span>
                    <span className="text-sm font-bold">
                      {overview?.data?.system.databaseSize || "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExport("users")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export All Users
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExport("stats")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Statistics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExport("logs")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Access Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    queryClient.invalidateQueries();
                    toast({
                      title: "Success",
                      description: "All data refreshed",
                    });
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh All Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bugs Tab */}
        <TabsContent value="bugs" className="space-y-4">
          <BugReportsTab />
        </TabsContent>
      </Tabs>

      {/* User Details Dialog - Modern Tabbed Modal */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="!max-w-[900px] w-[95vw] !max-h-[85vh] !p-0 overflow-hidden">
          <DialogTitle className="sr-only">User Details</DialogTitle>
          <DialogDescription className="sr-only">
            Detailed user information
          </DialogDescription>
          {selectedUser &&
            (() => {
              const ud = selectedUser as any;
              const trainerPlans = Array.isArray(ud.trainerMealPlans)
                ? ud.trainerMealPlans
                : [];
              const assignedPlans = Array.isArray(ud.trainerAssignedMealPlans)
                ? ud.trainerAssignedMealPlans
                : [];
              const customerPlans = Array.isArray(ud.customerAssignedMealPlans)
                ? ud.customerAssignedMealPlans
                : [];
              const isTrainer = selectedUser.role === "trainer";
              const isCustomer = selectedUser.role === "customer";
              const isAdmin = selectedUser.role === "admin";

              return (
                <div className="flex flex-col max-h-[85vh]">
                  {/* Header */}
                  <div className="px-8 pt-7 pb-5 border-b bg-gradient-to-br from-slate-50 via-white to-slate-50">
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 ${
                          isAdmin
                            ? "bg-gradient-to-br from-red-500 to-red-600"
                            : isTrainer
                              ? "bg-gradient-to-br from-blue-500 to-blue-600"
                              : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                        }`}
                      >
                        {isAdmin ? (
                          <Shield className="h-8 w-8" />
                        ) : isTrainer ? (
                          <Users className="h-8 w-8" />
                        ) : (
                          <UserPlus className="h-8 w-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-2xl font-bold text-slate-900 truncate">
                            {selectedUser.name ||
                              selectedUser.email.split("@")[0]}
                          </h2>
                          <Badge
                            className="text-xs"
                            variant={
                              isAdmin
                                ? "destructive"
                                : isTrainer
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {selectedUser.role}
                          </Badge>
                          {ud.subscriptionTier && (
                            <Badge variant="outline" className="text-xs">
                              {ud.subscriptionTier}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate mt-1">
                          {selectedUser.email}
                        </p>
                        <div className="flex items-center gap-5 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Joined {formatDate(selectedUser.createdAt)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {selectedUser.accountAge != null
                              ? `${selectedUser.accountAge} days`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs
                    defaultValue="overview"
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="px-8 border-b bg-white">
                      <TabsList className="h-12 bg-transparent p-0 gap-6 w-full justify-start">
                        <TabsTrigger
                          value="overview"
                          className="relative px-0 pb-3 pt-3 rounded-none bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary"
                        >
                          Overview
                        </TabsTrigger>
                        <TabsTrigger
                          value="meal-plans"
                          className="relative px-0 pb-3 pt-3 rounded-none bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary"
                        >
                          Meal Plans
                          {trainerPlans.length +
                            assignedPlans.length +
                            customerPlans.length >
                            0 && (
                            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                              {trainerPlans.length +
                                assignedPlans.length +
                                customerPlans.length}
                            </span>
                          )}
                        </TabsTrigger>
                        {isTrainer && (
                          <TabsTrigger
                            value="customers"
                            className="relative px-0 pb-3 pt-3 rounded-none bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary"
                          >
                            Customers
                            {assignedPlans.length > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-purple-100 text-xs font-medium text-purple-700">
                                {assignedPlans.length}
                              </span>
                            )}
                          </TabsTrigger>
                        )}
                        <TabsTrigger
                          value="actions"
                          className="relative px-0 pb-3 pt-3 rounded-none bg-transparent shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium text-slate-500 data-[state=active]:text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary"
                        >
                          Actions
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Scrollable Tab Content */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {/* Overview */}
                      <TabsContent
                        value="overview"
                        className="px-8 py-6 mt-0 space-y-6"
                      >
                        <div
                          className={`grid gap-4 ${isTrainer ? "grid-cols-4" : "grid-cols-2"}`}
                        >
                          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-5">
                            <Activity className="h-5 w-5 text-blue-500 mb-2" />
                            <div className="text-3xl font-bold text-blue-700">
                              {selectedUser.totalInteractions || 0}
                            </div>
                            <div className="text-xs text-blue-500 font-medium mt-1">
                              Interactions
                            </div>
                          </div>
                          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-5">
                            <FileText className="h-5 w-5 text-slate-500 mb-2" />
                            <div className="text-3xl font-bold text-slate-700">
                              {selectedUser.totalMealPlans || 0}
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                              Meal Plans
                            </div>
                          </div>
                          {isTrainer && (
                            <>
                              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5">
                                <Users className="h-5 w-5 text-emerald-500 mb-2" />
                                <div className="text-3xl font-bold text-emerald-700">
                                  {selectedUser.totalCustomers || 0}
                                </div>
                                <div className="text-xs text-emerald-500 font-medium mt-1">
                                  Customers
                                </div>
                              </div>
                              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-5">
                                <Zap className="h-5 w-5 text-purple-500 mb-2" />
                                <div className="text-3xl font-bold text-purple-700">
                                  {assignedPlans.length}
                                </div>
                                <div className="text-xs text-purple-500 font-medium mt-1">
                                  Assigned
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Profile Information
                          </div>
                          <div className="divide-y divide-slate-100">
                            <div className="grid grid-cols-2">
                              <div className="px-5 py-4 border-r border-slate-100">
                                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                  Email
                                </div>
                                <div className="mt-1.5 text-sm font-medium text-slate-900 break-all">
                                  {selectedUser.email}
                                </div>
                              </div>
                              <div className="px-5 py-4">
                                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                  Full Name
                                </div>
                                <div className="mt-1.5 text-sm font-medium text-slate-900">
                                  {selectedUser.name || "Not provided"}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2">
                              <div className="px-5 py-4 border-r border-slate-100">
                                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                  Registered
                                </div>
                                <div className="mt-1.5 text-sm font-medium text-slate-900">
                                  {formatDate(selectedUser.createdAt)}
                                </div>
                              </div>
                              <div className="px-5 py-4">
                                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                  Last Active
                                </div>
                                <div className="mt-1.5 text-sm font-medium text-slate-900">
                                  {formatDate(selectedUser.lastActive)}
                                </div>
                              </div>
                            </div>
                            {ud.subscriptionTier && (
                              <div className="grid grid-cols-2">
                                <div className="px-5 py-4 border-r border-slate-100">
                                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                    Subscription
                                  </div>
                                  <div className="mt-1.5">
                                    <Badge>{ud.subscriptionTier}</Badge>
                                  </div>
                                </div>
                                <div className="px-5 py-4">
                                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                    Status
                                  </div>
                                  <div className="mt-1.5">
                                    <Badge
                                      variant={
                                        ud.subscriptionStatus === "active"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {ud.subscriptionStatus || "Inactive"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Meal Plans */}
                      <TabsContent
                        value="meal-plans"
                        className="px-8 py-6 mt-0 space-y-8"
                      >
                        {isTrainer && (
                          <>
                            {/* Saved / Template Plans */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </div>
                                  Saved Plans
                                </h3>
                                <span className="text-xs text-slate-400 font-medium">
                                  {trainerPlans.length} plans
                                </span>
                              </div>
                              {trainerPlans.length > 0 ? (
                                <div className="space-y-2">
                                  {trainerPlans.map((mp: any) => (
                                    <MealPlanRow
                                      key={mp.id}
                                      mp={mp}
                                      dateField="createdAt"
                                      color="blue"
                                      formatDate={formatDate}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <EmptyState
                                  icon={FileText}
                                  message="No saved plans yet"
                                />
                              )}
                            </div>

                            {/* Plans Assigned to Customers */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-purple-600" />
                                  </div>
                                  Assigned to Customers
                                </h3>
                                <span className="text-xs text-slate-400 font-medium">
                                  {assignedPlans.length} assignments
                                </span>
                              </div>
                              {assignedPlans.length > 0 ? (
                                <div className="space-y-2">
                                  {assignedPlans.map((mp: any) => (
                                    <MealPlanRow
                                      key={mp.id}
                                      mp={mp}
                                      dateField="assignedAt"
                                      color="purple"
                                      formatDate={formatDate}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <EmptyState
                                  icon={Users}
                                  message="No plans assigned to customers yet"
                                />
                              )}
                            </div>
                          </>
                        )}

                        {isCustomer && (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-emerald-600" />
                                </div>
                                My Assigned Plans
                              </h3>
                              <span className="text-xs text-slate-400 font-medium">
                                {customerPlans.length} plans
                              </span>
                            </div>
                            {customerPlans.length > 0 ? (
                              <div className="space-y-2">
                                {customerPlans.map((mp: any) => (
                                  <MealPlanRow
                                    key={mp.id}
                                    mp={mp}
                                    dateField="assignedAt"
                                    color="emerald"
                                    formatDate={formatDate}
                                  />
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon={FileText}
                                message="No meal plans assigned to this customer"
                              />
                            )}
                          </div>
                        )}

                        {isAdmin && (
                          <EmptyState
                            icon={Shield}
                            message="Admin accounts don't have meal plans"
                          />
                        )}
                      </TabsContent>

                      {/* Customers (Trainers only) */}
                      {isTrainer && (
                        <TabsContent
                          value="customers"
                          className="px-8 py-6 mt-0 space-y-6"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                              Customer Assignments
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">
                              {assignedPlans.length} total
                            </span>
                          </div>
                          {assignedPlans.length > 0 ? (
                            <div className="space-y-2">
                              {assignedPlans.map((mp: any) => (
                                <div
                                  key={mp.id}
                                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-slate-100 bg-white hover:border-purple-200 hover:shadow-sm transition-all"
                                >
                                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <UserPlus className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-900 truncate">
                                      {mp.mealPlanData?.planName ||
                                        "Unnamed plan"}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                      {mp.mealPlanData?.clientName && (
                                        <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                                          {mp.mealPlanData.clientName}
                                        </span>
                                      )}
                                      {mp.mealPlanData?.fitnessGoal && (
                                        <span className="capitalize">
                                          {mp.mealPlanData.fitnessGoal.replace(
                                            /_/g,
                                            " ",
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-center px-2">
                                      <div className="text-sm font-semibold text-slate-700">
                                        {mp.mealPlanData?.days ?? "?"}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        days
                                      </div>
                                    </div>
                                    <div className="text-xs text-slate-400 w-20 text-right">
                                      {formatDate(mp.assignedAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 rounded-2xl bg-slate-50">
                              <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                              <p className="text-sm text-slate-400 font-medium">
                                No customer assignments yet
                              </p>
                            </div>
                          )}
                        </TabsContent>
                      )}

                      {/* Actions */}
                      <TabsContent
                        value="actions"
                        className="px-8 py-6 mt-0 space-y-5"
                      >
                        {selectedUser.role !== "admin" ? (
                          <>
                            <div className="rounded-2xl border border-slate-200 p-5">
                              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                                Change Role
                              </h4>
                              <p className="text-xs text-slate-500 mb-4">
                                Update this user's role in the system
                              </p>
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  variant={
                                    selectedUser.role === "trainer"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: selectedUser.id,
                                      role: "trainer",
                                    })
                                  }
                                  disabled={selectedUser.role === "trainer"}
                                >
                                  <Users className="h-3.5 w-3.5 mr-1.5" />
                                  Trainer
                                </Button>
                                <Button
                                  size="sm"
                                  variant={
                                    selectedUser.role === "customer"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: selectedUser.id,
                                      role: "customer",
                                    })
                                  }
                                  disabled={selectedUser.role === "customer"}
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                  Customer
                                </Button>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-red-200 bg-red-50/30 p-5">
                              <h4 className="text-sm font-semibold text-red-800 mb-1">
                                Danger Zone
                              </h4>
                              <p className="text-xs text-red-500 mb-4">
                                Permanently delete this user and all associated
                                data
                              </p>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Are you sure you want to delete user ${selectedUser.email}? This cannot be undone.`,
                                    )
                                  ) {
                                    deleteUserMutation.mutate(selectedUser.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Delete User
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12 rounded-2xl bg-slate-50">
                            <Shield className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-medium">
                              Admin accounts cannot be modified
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Bug Reports Tab Component
function BugReportsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [screenshotDialog, setScreenshotDialog] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bugsData, isLoading } = useQuery<{
    data: Array<{
      id: string;
      category: string;
      priority: string;
      status: string;
      title: string;
      description: string;
      screenshotBase64: string | null;
      context: {
        url: string;
        browser: string;
        userAgent: string;
        userRole: string;
        userId: string;
      } | null;
      githubIssueUrl: string | null;
      githubIssueNumber: number | null;
      assignedToHal: boolean;
      adminNotes: string | null;
      createdAt: string;
      reporterId: string | null;
    }>;
    total: number;
  }>({
    queryKey: ["admin-bugs", statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      const res = await fetch(`/api/bugs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch bugs");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNotes,
    }: {
      id: string;
      status: string;
      adminNotes?: string;
    }) => {
      const res = await fetch(`/api/bugs/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bugs"] });
      toast({ title: "Status updated" });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const res = await fetch(`/api/bugs/${id}/priority`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error("Failed to update priority");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bugs"] });
      toast({ title: "Priority updated" });
    },
  });

  const bugs = bugsData?.data ?? [];
  const openCount = bugs.filter((b) => b.status === "open").length;

  const categoryBadgeColor: Record<string, string> = {
    bug: "bg-red-100 text-red-700",
    feature: "bg-blue-100 text-blue-700",
    feedback: "bg-gray-100 text-gray-700",
  };

  const priorityBadgeColor: Record<string, string> = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  const statusBadgeColor: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    triaged: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bug Reports</h2>
          <p className="text-sm text-muted-foreground">
            {bugsData?.total ?? 0} total reports
            {openCount > 0 && ` · ${openCount} open`}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="triaged">Triaged</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="feature">Features</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bugs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bug className="h-10 w-10 mb-2 opacity-40" />
              <p>No bug reports found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Priority</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-20">GitHub</TableHead>
                  <TableHead className="w-16">Img</TableHead>
                  <TableHead className="w-28">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bugs.map((bug) => (
                  <TableRow key={bug.id}>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadgeColor[bug.category] ?? ""}`}
                      >
                        {bug.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <p className="font-medium text-sm truncate">
                          {bug.title}
                        </p>
                        {bug.context?.url && (
                          <p className="text-xs text-muted-foreground truncate">
                            {bug.context.url}
                          </p>
                        )}
                        {bug.assignedToHal && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium mt-1">
                            Assigned to Hal
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={bug.priority}
                        onValueChange={(val) =>
                          updatePriorityMutation.mutate({
                            id: bug.id,
                            priority: val,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${priorityBadgeColor[bug.priority] ?? ""}`}
                          >
                            {bug.priority}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={bug.status}
                        onValueChange={(val) =>
                          updateStatusMutation.mutate({
                            id: bug.id,
                            status: val,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${statusBadgeColor[bug.status] ?? ""}`}
                          >
                            {bug.status.replace("_", " ")}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="triaged">Triaged</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {bug.githubIssueUrl ? (
                        <a
                          href={bug.githubIssueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-xs"
                        >
                          #{bug.githubIssueNumber}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bug.screenshotBase64 ? (
                        <button
                          onClick={() =>
                            setScreenshotDialog(bug.screenshotBase64)
                          }
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Preview Dialog */}
      <Dialog
        open={!!screenshotDialog}
        onOpenChange={() => setScreenshotDialog(null)}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogTitle>Screenshot</DialogTitle>
          <DialogDescription className="sr-only">
            Bug report screenshot preview
          </DialogDescription>
          {screenshotDialog && (
            <img
              src={screenshotDialog}
              alt="Bug screenshot"
              className="w-full rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
