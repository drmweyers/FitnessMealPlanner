import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Shield, 
  Settings, 
  Database, 
  Users, 
  ChefHat, 
  Target,
  TrendingUp,
  Calendar,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalRecipes: number;
  pendingRecipes: number;
  totalMealPlans: number;
  activeTrainers: number;
  activeCustomers: number;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['adminProfile', 'stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/profile/stats');
      return res.json();
    },
    enabled: !!user
  });

  // Fetch user profile details
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['adminProfile', 'details'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/profile');
      return res.json();
    },
    enabled: !!user
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; currentPassword?: string; newPassword?: string }) => {
      const res = await apiRequest('PUT', '/api/auth/profile', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      setEditForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const handleSaveProfile = () => {
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {};
    
    if (editForm.email !== user?.email) {
      updateData.email = editForm.email;
    }
    
    if (editForm.newPassword) {
      if (!editForm.currentPassword) {
        toast({
          title: "Current Password Required",
          description: "Please enter your current password to change it.",
          variant: "destructive",
        });
        return;
      }
      updateData.currentPassword = editForm.currentPassword;
      updateData.newPassword = editForm.newPassword;
    }

    if (Object.keys(updateData).length === 0) {
      setIsEditing(false);
      return;
    }

    updateProfileMutation.mutate(updateData);
  };

  const handleCancelEdit = () => {
    setEditForm({
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Profile</h1>
            <p className="text-slate-600">System administrator dashboard and account settings</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
          <Shield className="w-3 h-3 mr-1" />
          Administrator
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Account Details</span>
              </CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Email Address</Label>
                    <p className="text-slate-900 font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">User ID</Label>
                    <p className="text-slate-900 font-mono text-sm">{user?.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Role</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Administrator
                      </Badge>
                    </div>
                  </div>
                  {profile && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Account Created</Label>
                        <p className="text-slate-900">{formatDate(profile.createdAt)}</p>
                      </div>
                      {profile.lastLoginAt && (
                        <div>
                          <Label className="text-sm font-medium text-slate-600">Last Login</Label>
                          <p className="text-slate-900">{formatDate(profile.lastLoginAt)}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-3">Change Password</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={editForm.currentPassword}
                          onChange={(e) => setEditForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={editForm.newPassword}
                          onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={editForm.confirmPassword}
                          onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="mt-1"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Database className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalRecipes || 0}
                  </div>
                  <div className="text-sm text-slate-600">Total Recipes</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalUsers || 0}
                  </div>
                  <div className="text-sm text-slate-600">Total Users</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <ChefHat className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalMealPlans || 0}
                  </div>
                  <div className="text-sm text-slate-600">Meal Plans</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending Reviews</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {statsLoading ? '...' : stats?.pendingRecipes || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Trainers</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {statsLoading ? '...' : stats?.activeTrainers || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Customers</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {statsLoading ? '...' : stats?.activeCustomers || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/admin'}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // Trigger password reset via email
                  toast({
                    title: "Password Reset",
                    description: "Password reset functionality would be implemented here.",
                  });
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Security Settings
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={logout}
              >
                <User className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Session Info */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Session Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-600">Account Created:</span>
                  <div className="font-medium text-slate-900">
                    {formatDate(profile.createdAt)}
                  </div>
                </div>
                {profile.lastLoginAt && (
                  <div>
                    <span className="text-slate-600">Last Login:</span>
                    <div className="font-medium text-slate-900">
                      {formatDate(profile.lastLoginAt)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}