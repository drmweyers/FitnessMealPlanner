import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Heart, 
  Target, 
  TrendingUp,
  Calendar,
  Edit2,
  Save,
  X,
  Scale,
  ChefHat,
  Activity,
  Clock
} from 'lucide-react';

interface CustomerStats {
  totalMealPlans: number;
  completedDays: number;
  favoriteRecipes: number;
  avgCaloriesPerDay: number;
  currentStreak: number;
}

interface CustomerProfile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  fitnessGoals?: string[];
  dietaryRestrictions?: string[];
  preferredCuisines?: string[];
  activityLevel?: string;
  weight?: number;
  height?: number;
  age?: number;
  bio?: string;
}

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'lightly_active', label: 'Lightly Active (light exercise 1-3 days/week)' },
  { value: 'moderately_active', label: 'Moderately Active (moderate exercise 3-5 days/week)' },
  { value: 'very_active', label: 'Very Active (hard exercise 6-7 days/week)' },
  { value: 'extremely_active', label: 'Extremely Active (very hard exercise, physical job)' }
];

const commonFitnessGoals = [
  'Weight Loss', 'Muscle Gain', 'Maintenance', 'Athletic Performance', 
  'General Health', 'Cutting', 'Bulking', 'Endurance'
];

const commonDietaryRestrictions = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 
  'Paleo', 'Low-Carb', 'Low-Fat', 'Nut-Free', 'Soy-Free'
];

const commonCuisines = [
  'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 
  'Indian', 'Thai', 'French', 'Japanese', 'Greek'
];

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: user?.email || '',
    bio: '',
    fitnessGoals: '',
    dietaryRestrictions: '',
    preferredCuisines: '',
    activityLevel: '',
    weight: '',
    height: '',
    age: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch customer statistics
  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ['customerProfile', 'stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/customer/profile/stats');
      return res.json();
    },
    enabled: !!user
  });

  // Fetch customer profile details
  const { data: profile, isLoading: profileLoading } = useQuery<CustomerProfile>({
    queryKey: ['customerProfile', 'details'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/profile');
      return res.json();
    },
    enabled: !!user,
    onSuccess: (data) => {
      setEditForm(prev => ({
        ...prev,
        bio: data.bio || '',
        fitnessGoals: data.fitnessGoals?.join(', ') || '',
        dietaryRestrictions: data.dietaryRestrictions?.join(', ') || '',
        preferredCuisines: data.preferredCuisines?.join(', ') || '',
        activityLevel: data.activityLevel || '',
        weight: data.weight?.toString() || '',
        height: data.height?.toString() || '',
        age: data.age?.toString() || ''
      }));
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
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
    
    if (editForm.bio !== (profile?.bio || '')) {
      updateData.bio = editForm.bio;
    }
    
    if (editForm.fitnessGoals !== (profile?.fitnessGoals?.join(', ') || '')) {
      updateData.fitnessGoals = editForm.fitnessGoals.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (editForm.dietaryRestrictions !== (profile?.dietaryRestrictions?.join(', ') || '')) {
      updateData.dietaryRestrictions = editForm.dietaryRestrictions.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (editForm.preferredCuisines !== (profile?.preferredCuisines?.join(', ') || '')) {
      updateData.preferredCuisines = editForm.preferredCuisines.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (editForm.activityLevel !== (profile?.activityLevel || '')) {
      updateData.activityLevel = editForm.activityLevel;
    }
    
    if (editForm.weight !== (profile?.weight?.toString() || '')) {
      updateData.weight = parseFloat(editForm.weight) || null;
    }
    
    if (editForm.height !== (profile?.height?.toString() || '')) {
      updateData.height = parseFloat(editForm.height) || null;
    }
    
    if (editForm.age !== (profile?.age?.toString() || '')) {
      updateData.age = parseInt(editForm.age) || null;
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
      bio: profile?.bio || '',
      fitnessGoals: profile?.fitnessGoals?.join(', ') || '',
      dietaryRestrictions: profile?.dietaryRestrictions?.join(', ') || '',
      preferredCuisines: profile?.preferredCuisines?.join(', ') || '',
      activityLevel: profile?.activityLevel || '',
      weight: profile?.weight?.toString() || '',
      height: profile?.height?.toString() || '',
      age: profile?.age?.toString() || '',
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

  const calculateBMI = () => {
    if (profile?.weight && profile?.height) {
      const heightInMeters = profile.height / 100; // Convert cm to meters
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
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
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-600">Manage your fitness journey and preferences</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
          <Heart className="w-3 h-3 mr-1" />
          Fitness Enthusiast
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Details</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Email Address</Label>
                      <p className="text-slate-900 font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Activity Level</Label>
                      <p className="text-slate-900">
                        {profile?.activityLevel ? 
                          activityLevels.find(level => level.value === profile.activityLevel)?.label.split('(')[0].trim() ||
                          profile.activityLevel : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Age</Label>
                      <p className="text-slate-900">{profile?.age || 'Not specified'} years</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Weight</Label>
                      <p className="text-slate-900">{profile?.weight || 'Not specified'} kg</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Height</Label>
                      <p className="text-slate-900">{profile?.height || 'Not specified'} cm</p>
                    </div>
                  </div>

                  {calculateBMI() && (
                    <div>
                      <Label className="text-sm font-medium text-slate-600">BMI</Label>
                      <p className="text-slate-900 font-medium">{calculateBMI()}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Bio</Label>
                    <p className="text-slate-900">{profile?.bio || 'No bio provided'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Fitness Goals</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile?.fitnessGoals && profile.fitnessGoals.length > 0 ? (
                        profile.fitnessGoals.map((goal, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                            <Target className="w-3 h-3 mr-1" />
                            {goal}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No fitness goals set</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Dietary Restrictions</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile?.dietaryRestrictions && profile.dietaryRestrictions.length > 0 ? (
                        profile.dietaryRestrictions.map((restriction, index) => (
                          <Badge key={index} variant="outline" className="bg-red-50 text-red-700">
                            {restriction}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No dietary restrictions</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Preferred Cuisines</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile?.preferredCuisines && profile.preferredCuisines.length > 0 ? (
                        profile.preferredCuisines.map((cuisine, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                            <ChefHat className="w-3 h-3 mr-1" />
                            {cuisine}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No cuisine preferences</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <Label htmlFor="activityLevel">Activity Level</Label>
                      <Select 
                        value={editForm.activityLevel} 
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, activityLevel: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={editForm.age}
                        onChange={(e) => setEditForm(prev => ({ ...prev, age: e.target.value }))}
                        className="mt-1"
                        min="13"
                        max="120"
                        placeholder="Enter age"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={editForm.weight}
                        onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                        className="mt-1"
                        min="30"
                        max="300"
                        step="0.1"
                        placeholder="Enter weight"
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={editForm.height}
                        onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                        className="mt-1"
                        min="100"
                        max="250"
                        placeholder="Enter height"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="mt-1"
                      placeholder="Tell us about your fitness journey..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fitnessGoals">Fitness Goals (comma-separated)</Label>
                    <Input
                      id="fitnessGoals"
                      value={editForm.fitnessGoals}
                      onChange={(e) => setEditForm(prev => ({ ...prev, fitnessGoals: e.target.value }))}
                      className="mt-1"
                      placeholder="Weight Loss, Muscle Gain, Athletic Performance..."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suggestions: {commonFitnessGoals.join(', ')}
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="dietaryRestrictions">Dietary Restrictions (comma-separated)</Label>
                    <Input
                      id="dietaryRestrictions"
                      value={editForm.dietaryRestrictions}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dietaryRestrictions: e.target.value }))}
                      className="mt-1"
                      placeholder="Vegetarian, Gluten-Free, Dairy-Free..."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suggestions: {commonDietaryRestrictions.join(', ')}
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="preferredCuisines">Preferred Cuisines (comma-separated)</Label>
                    <Input
                      id="preferredCuisines"
                      value={editForm.preferredCuisines}
                      onChange={(e) => setEditForm(prev => ({ ...prev, preferredCuisines: e.target.value }))}
                      className="mt-1"
                      placeholder="Italian, Mexican, Asian..."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suggestions: {commonCuisines.join(', ')}
                    </p>
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
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Progress Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Progress Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <ChefHat className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">
                  {statsLoading ? '...' : stats?.totalMealPlans || 0}
                </div>
                <div className="text-sm text-slate-600">Meal Plans</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.completedDays || 0}
                  </div>
                  <div className="text-xs text-slate-600">Days Done</div>
                </div>
                
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.currentStreak || 0}
                  </div>
                  <div className="text-xs text-slate-600">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Metrics */}
          {(profile?.weight || profile?.height) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="w-5 h-5" />
                  <span>Health Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculateBMI() && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Scale className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{calculateBMI()}</div>
                    <div className="text-sm text-slate-600">BMI</div>
                  </div>
                )}
                
                <div className="space-y-3 text-sm">
                  {profile?.weight && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Weight:</span>
                      <span className="font-medium text-slate-900">{profile.weight} kg</span>
                    </div>
                  )}
                  {profile?.height && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Height:</span>
                      <span className="font-medium text-slate-900">{profile.height} cm</span>
                    </div>
                  )}
                  {stats && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Avg Calories:</span>
                      <span className="font-medium text-slate-900">{stats.avgCaloriesPerDay}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = '/my-meal-plans'}
              >
                <ChefHat className="w-4 h-4 mr-2" />
                My Meal Plans
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: "Progress Tracking",
                    description: "Progress tracking feature would be implemented here.",
                  });
                }}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Progress
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
                  <Clock className="w-5 h-5" />
                  <span>Account Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-600">Member Since:</span>
                  <div className="font-medium text-slate-900">
                    {formatDate(profile.createdAt)}
                  </div>
                </div>
                {profile.lastLoginAt && (
                  <div>
                    <span className="text-slate-600">Last Visit:</span>
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