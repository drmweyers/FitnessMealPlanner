import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/queryClient';
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
    enabled: !!user
  });

  // Update form when profile data changes
  useEffect(() => {
    if (profile) {
      setEditForm(prev => ({
        ...prev,
        bio: profile.bio || '',
        fitnessGoals: profile.fitnessGoals?.join(', ') || '',
        dietaryRestrictions: profile.dietaryRestrictions?.join(', ') || '',
        preferredCuisines: profile.preferredCuisines?.join(', ') || '',
        activityLevel: profile.activityLevel || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        age: profile.age?.toString() || ''
      }));
    }
  }, [profile]);

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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">My Profile</h1>
            <p className="text-sm sm:text-base text-slate-600">Manage your fitness journey and preferences</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs sm:text-sm">
          <Heart className="w-3 h-3 mr-1" />
          Fitness Enthusiast
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Personal Details Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Personal Details</span>
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
            <CardContent className="space-y-4 p-4 sm:p-6">
              {!isEditing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <Label className="text-xs sm:text-sm font-medium text-slate-600">Email Address</Label>
                      <p className="text-sm sm:text-base text-slate-900 font-medium truncate">{user?.email}</p>
                    </div>
                    <div className="min-w-0">
                      <Label className="text-xs sm:text-sm font-medium text-slate-600">Activity Level</Label>
                      <p className="text-sm sm:text-base text-slate-900 truncate">
                        {profile?.activityLevel ? 
                          activityLevels.find(level => level.value === profile.activityLevel)?.label.split('(')[0].trim() ||
                          profile.activityLevel : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-slate-600">Age</Label>
                      <p className="text-sm sm:text-base text-slate-900">{profile?.age || 'Not specified'} years</p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-slate-600">Weight</Label>
                      <p className="text-sm sm:text-base text-slate-900">{profile?.weight || 'Not specified'} kg</p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-slate-600">Height</Label>
                      <p className="text-sm sm:text-base text-slate-900">{profile?.height || 'Not specified'} cm</p>
                    </div>
                  </div>

                  {calculateBMI() && (
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-slate-600">BMI</Label>
                      <p className="text-sm sm:text-base text-slate-900 font-medium">{calculateBMI()}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Bio</Label>
                    <p className="text-sm sm:text-base text-slate-900 leading-relaxed">{profile?.bio || 'No bio provided'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Fitness Goals</Label>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 sm:mt-2">
                      {profile?.fitnessGoals && profile.fitnessGoals.length > 0 ? (
                        profile.fitnessGoals.map((goal, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                            <Target className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                            {goal}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-xs sm:text-sm">No fitness goals set</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Dietary Restrictions</Label>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 sm:mt-2">
                      {profile?.dietaryRestrictions && profile.dietaryRestrictions.length > 0 ? (
                        profile.dietaryRestrictions.map((restriction, index) => (
                          <Badge key={index} variant="outline" className="bg-red-50 text-red-700 text-xs">
                            {restriction}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-xs sm:text-sm">No dietary restrictions</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Preferred Cuisines</Label>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 sm:mt-2">
                      {profile?.preferredCuisines && profile.preferredCuisines.length > 0 ? (
                        profile.preferredCuisines.map((cuisine, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700 text-xs">
                            <ChefHat className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                            {cuisine}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-xs sm:text-sm">No cuisine preferences</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="email" className="text-xs sm:text-sm">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="mt-1 h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activityLevel" className="text-xs sm:text-sm">Activity Level</Label>
                      <Select 
                        value={editForm.activityLevel} 
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, activityLevel: value }))}
                      >
                        <SelectTrigger className="mt-1 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value} className="text-sm">
                              <span className="truncate">{level.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="age" className="text-xs sm:text-sm">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={editForm.age}
                        onChange={(e) => setEditForm(prev => ({ ...prev, age: e.target.value }))}
                        className="mt-1 h-9 sm:h-10 text-sm"
                        min="13"
                        max="120"
                        placeholder="Age"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight" className="text-xs sm:text-sm">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={editForm.weight}
                        onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                        className="mt-1 h-9 sm:h-10 text-sm"
                        min="30"
                        max="300"
                        step="0.1"
                        placeholder="Weight"
                      />
                    </div>
                    <div>
                      <Label htmlFor="height" className="text-xs sm:text-sm">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={editForm.height}
                        onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                        className="mt-1 h-9 sm:h-10 text-sm"
                        min="100"
                        max="250"
                        placeholder="Height"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bio" className="text-xs sm:text-sm">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="mt-1 text-sm"
                      placeholder="Tell us about your fitness journey..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fitnessGoals" className="text-xs sm:text-sm">Fitness Goals (comma-separated)</Label>
                    <Input
                      id="fitnessGoals"
                      value={editForm.fitnessGoals}
                      onChange={(e) => setEditForm(prev => ({ ...prev, fitnessGoals: e.target.value }))}
                      className="mt-1 h-9 sm:h-10 text-sm"
                      placeholder="Weight Loss, Muscle Gain..."
                    />
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Suggestions: {commonFitnessGoals.slice(0, 5).join(', ')}...
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="dietaryRestrictions" className="text-xs sm:text-sm">Dietary Restrictions (comma-separated)</Label>
                    <Input
                      id="dietaryRestrictions"
                      value={editForm.dietaryRestrictions}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dietaryRestrictions: e.target.value }))}
                      className="mt-1 h-9 sm:h-10 text-sm"
                      placeholder="Vegetarian, Gluten-Free..."
                    />
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Suggestions: {commonDietaryRestrictions.slice(0, 5).join(', ')}...
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="preferredCuisines" className="text-xs sm:text-sm">Preferred Cuisines (comma-separated)</Label>
                    <Input
                      id="preferredCuisines"
                      value={editForm.preferredCuisines}
                      onChange={(e) => setEditForm(prev => ({ ...prev, preferredCuisines: e.target.value }))}
                      className="mt-1 h-9 sm:h-10 text-sm"
                      placeholder="Italian, Mexican, Asian..."
                    />
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Suggestions: {commonCuisines.slice(0, 5).join(', ')}...
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
        <div className="space-y-4 sm:space-y-6">
          {/* Progress Stats */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Progress Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {statsLoading ? '...' : stats?.totalMealPlans || 0}
                </div>
                <div className="text-xs sm:text-sm text-slate-600">Meal Plans</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-base sm:text-lg font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.completedDays || 0}
                  </div>
                  <div className="text-xs text-slate-600">Days Done</div>
                </div>
                
                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600 mx-auto mb-1" />
                  <div className="text-base sm:text-lg font-bold text-slate-900">
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
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Health Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                {calculateBMI() && (
                  <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <Scale className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{calculateBMI()}</div>
                    <div className="text-xs sm:text-sm text-slate-600">BMI</div>
                  </div>
                )}
                
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
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

          {/* Meal Plan Summary */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>My Meal Plans</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {stats ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-blue-600">
                        {stats.totalMealPlans}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700">Active Plans</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg sm:text-xl font-bold text-green-600">
                        {stats.completedDays}
                      </div>
                      <div className="text-xs sm:text-sm text-green-700">Days Completed</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <Button
                      variant="outline"
                      className="w-full justify-center text-xs sm:text-sm"
                      onClick={() => window.location.href = '/customer'}
                    >
                      <ChefHat className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      View All Plans
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-slate-500">
                  <ChefHat className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs sm:text-sm">No meal plans assigned yet</p>
                  <p className="text-xs text-slate-400">Your trainer will assign plans soon!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <Button
                variant="outline"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => {
                  toast({
                    title: "Progress Tracking",
                    description: "Progress tracking feature would be implemented here.",
                  });
                }}
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">View Progress</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => {
                  toast({
                    title: "Meal Plan Feedback",
                    description: "Meal plan feedback feature would be implemented here.",
                  });
                }}
              >
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Rate Meal Plans</span>
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={logout}
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Sign Out</span>
              </Button>
            </CardContent>
          </Card>

          {/* Session Info */}
          {profile && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Account Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm p-4 sm:p-6">
                <div>
                  <span className="text-slate-600">Member Since:</span>
                  <div className="font-medium text-slate-900 break-words">
                    {formatDate(profile.createdAt)}
                  </div>
                </div>
                {profile.lastLoginAt && (
                  <div>
                    <span className="text-slate-600">Last Visit:</span>
                    <div className="font-medium text-slate-900 break-words">
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