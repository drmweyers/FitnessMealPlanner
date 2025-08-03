import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/queryClient';
import PDFExportButton from '../components/PDFExportButton';
import ProfileImageUpload from '../components/ProfileImageUpload';
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
  X,
  FileText,
  Download
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
  profilePicture?: string | null;
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

  // Fetch all meal plans for PDF export (admin has access to all)
  const { data: allMealPlans } = useQuery({
    queryKey: ['adminAllMealPlans'],
    queryFn: async () => {
      try {
        // Get all users first
        const usersRes = await apiRequest('GET', '/api/admin/users');
        const usersData = await usersRes.json();
        const trainers = usersData.filter((u: any) => u.role === 'trainer');
        
        // Get meal plans for each trainer
        const mealPlansPromises = trainers.map(async (trainer: any) => {
          try {
            const res = await apiRequest('GET', `/api/trainer/customers`);
            const customersData = await res.json();
            
            if (customersData.customers) {
              const customerMealPlans = await Promise.all(
                customersData.customers.map(async (customer: any) => {
                  const mealPlansRes = await apiRequest('GET', `/api/trainer/customers/${customer.id}/meal-plans`);
                  const mealPlansData = await mealPlansRes.json();
                  return {
                    customer,
                    trainer,
                    mealPlans: mealPlansData.mealPlans || []
                  };
                })
              );
              return customerMealPlans.filter(c => c.mealPlans.length > 0);
            }
            return [];
          } catch (error) {
            console.error('Error fetching trainer meal plans:', error);
            return [];
          }
        });
        
        const results = await Promise.all(mealPlansPromises);
        return results.flat();
      } catch (error) {
        console.error('Error fetching all meal plans:', error);
        return [];
      }
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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">Admin Profile</h1>
            <p className="text-sm sm:text-base text-slate-600">System administrator dashboard and account settings</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200 text-xs sm:text-sm">
          <Shield className="w-3 h-3 mr-1" />
          Administrator
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Image Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Profile Image</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center space-x-6 p-4 sm:p-6">
              <ProfileImageUpload
                currentImageUrl={profile?.profilePicture}
                userEmail={user?.email || ''}
                size="xl"
                onImageUpdate={(newImageUrl) => {
                  // Update profile data optimistically
                  if (profile) {
                    queryClient.setQueryData(['adminProfile', 'details'], {
                      ...profile,
                      profilePicture: newImageUrl
                    });
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-600 mb-2">
                  Upload a professional profile image that will be displayed in your header and profile.
                </p>
                <p className="text-xs text-slate-500">
                  Recommended: Square image, at least 200x200px. Max file size: 5MB.
                  Supported formats: JPEG, PNG, WebP.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Account Details</span>
              </CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="flex items-center justify-center space-x-2 text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center justify-center space-x-2 text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {!isEditing ? (
                <>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Email Address</Label>
                    <p className="text-sm sm:text-base text-slate-900 font-medium truncate">{user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">User ID</Label>
                    <p className="text-xs sm:text-sm text-slate-900 font-mono break-all">{user?.id}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Role</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
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
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>System Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalRecipes || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Total Recipes</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalUsers || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Total Users</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg col-span-2 sm:col-span-1">
                  <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalMealPlans || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Meal Plans</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Export Section */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>System-wide Recipe Export</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Export all recipe cards from the system to PDF format for administrative purposes and backups.
                </p>
                
                {allMealPlans && allMealPlans.length > 0 ? (
                  <div className="space-y-3">
                    {/* Export All System Button */}
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div>
                        <div className="font-medium text-slate-900">Export All System Meal Plans</div>
                        <div className="text-sm text-slate-600">
                          {allMealPlans.reduce((total, entry) => total + entry.mealPlans.length, 0)} total meal plans across all customers
                        </div>
                      </div>
                      <PDFExportButton
                        mealPlans={allMealPlans.flatMap(entry => entry.mealPlans)}
                        variant="outline"
                        size="sm"
                      >
                        Export All
                      </PDFExportButton>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-lg font-bold text-slate-900">
                          {allMealPlans.length}
                        </div>
                        <div className="text-xs text-slate-600">Active Customers</div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-lg font-bold text-slate-900">
                          {allMealPlans.reduce((total, entry) => total + entry.mealPlans.length, 0)}
                        </div>
                        <div className="text-xs text-slate-600">Total Meal Plans</div>
                      </div>
                    </div>

                    {/* Export by Customer */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-700">Export by Customer:</div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {allMealPlans.map((entry) => (
                          <div key={`${entry.customer.id}-${entry.trainer.id}`} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{entry.customer.email}</div>
                              <div className="text-xs text-slate-600 truncate">
                                Trainer: {entry.trainer.email} • {entry.mealPlans.length} plan{entry.mealPlans.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <PDFExportButton
                              mealPlans={entry.mealPlans}
                              customerName={entry.customer.email}
                              variant="ghost"
                              size="sm"
                            >
                              <Download className="w-3 h-3" />
                            </PDFExportButton>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">No meal plans available for export</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Meal plans will appear here when trainers create and assign them to customers
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-600">Pending Reviews</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                  {statsLoading ? '...' : stats?.pendingRecipes || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-600">Active Trainers</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  {statsLoading ? '...' : stats?.activeTrainers || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-600">Active Customers</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  {statsLoading ? '...' : stats?.activeCustomers || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <Button
                variant="outline"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => window.location.href = '/admin'}
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Admin Dashboard</span>
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