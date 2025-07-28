import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Dumbbell, 
  Users, 
  ChefHat, 
  Target,
  TrendingUp,
  Calendar,
  Edit2,
  Save,
  X,
  Award,
  Clock,
  Heart,
  Mail,
  Plus,
  Copy
} from 'lucide-react';

interface TrainerStats {
  totalClients: number;
  totalMealPlansCreated: number;
  totalRecipesAssigned: number;
  activeMealPlans: number;
  clientSatisfactionRate: number;
}

interface TrainerProfile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  specializations?: string[];
  bio?: string;
  certifications?: string[];
  yearsExperience?: number;
}

interface Invitation {
  id: string;
  customerEmail: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export default function TrainerProfile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: user?.email || '',
    bio: '',
    specializations: '',
    certifications: '',
    yearsExperience: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");

  // Fetch trainer statistics
  const { data: stats, isLoading: statsLoading } = useQuery<TrainerStats>({
    queryKey: ['trainerProfile', 'stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/trainer/profile/stats');
      return res.json();
    },
    enabled: !!user
  });

  // Fetch trainer profile details
  const { data: profile, isLoading: profileLoading } = useQuery<TrainerProfile>({
    queryKey: ['trainerProfile', 'details'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/profile');
      return res.json();
    },
    enabled: !!user
  });

  // Update form when profile data is loaded
  React.useEffect(() => {
    if (profile) {
      setEditForm(prev => ({
        ...prev,
        bio: profile.bio || '',
        specializations: profile.specializations?.join(', ') || '',
        certifications: profile.certifications?.join(', ') || '',
        yearsExperience: profile.yearsExperience?.toString() || ''
      }));
    }
  }, [profile]);

  // Fetch invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      
      const data = await response.json();
      return data.data.invitations;
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async (data: { customerEmail: string; message?: string }) => {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${customerEmail} successfully.`,
      });
      setCustomerEmail("");
      setInvitationMessage("");
      setShowInvitationForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      
      // In development, show the invitation link
      if (process.env.NODE_ENV === 'development' && data.data.invitation.invitationLink) {
        console.log('Invitation Link:', data.data.invitation.invitationLink);
        toast({
          title: "Development Mode",
          description: `Invitation link: ${data.data.invitation.invitationLink}`,
          duration: 10000,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
    
    if (editForm.specializations !== (profile?.specializations?.join(', ') || '')) {
      updateData.specializations = editForm.specializations.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (editForm.certifications !== (profile?.certifications?.join(', ') || '')) {
      updateData.certifications = editForm.certifications.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (editForm.yearsExperience !== (profile?.yearsExperience?.toString() || '')) {
      updateData.yearsExperience = parseInt(editForm.yearsExperience) || 0;
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
      specializations: profile?.specializations?.join(', ') || '',
      certifications: profile?.certifications?.join(', ') || '',
      yearsExperience: profile?.yearsExperience?.toString() || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditing(false);
  };

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a customer email address.",
        variant: "destructive",
      });
      return;
    }

    sendInvitationMutation.mutate({
      customerEmail: customerEmail.trim(),
      message: invitationMessage.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Dumbbell className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">Trainer Profile</h1>
            <p className="text-sm sm:text-base text-slate-600">Professional fitness trainer dashboard and settings</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs sm:text-sm">
          <Dumbbell className="w-3 h-3 mr-1" />
          Personal Trainer
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
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
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Bio</Label>
                    <p className="text-sm sm:text-base text-slate-900 leading-relaxed">{profile?.bio || 'No bio provided'}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-slate-600">Specializations</Label>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1 sm:mt-2">
                      {profile?.specializations && profile.specializations.length > 0 ? (
                        profile.specializations.map((spec, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                            {spec}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No specializations listed</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Certifications</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile?.certifications && profile.certifications.length > 0 ? (
                        profile.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                            <Award className="w-3 h-3 mr-1" />
                            {cert}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No certifications listed</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Years of Experience</Label>
                    <p className="text-slate-900">{profile?.yearsExperience || 0} years</p>
                  </div>
                  {profile && (
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Member Since</Label>
                      <p className="text-slate-900">{formatDate(profile.createdAt)}</p>
                    </div>
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
                  
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="mt-1"
                      placeholder="Tell clients about yourself..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="specializations">Specializations (comma-separated)</Label>
                    <Input
                      id="specializations"
                      value={editForm.specializations}
                      onChange={(e) => setEditForm(prev => ({ ...prev, specializations: e.target.value }))}
                      className="mt-1"
                      placeholder="Weight Loss, Muscle Building, Athletic Performance..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                    <Input
                      id="certifications"
                      value={editForm.certifications}
                      onChange={(e) => setEditForm(prev => ({ ...prev, certifications: e.target.value }))}
                      className="mt-1"
                      placeholder="NASM-CPT, ACSM, ACE..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="yearsExperience">Years of Experience</Label>
                    <Input
                      id="yearsExperience"
                      type="number"
                      value={editForm.yearsExperience}
                      onChange={(e) => setEditForm(prev => ({ ...prev, yearsExperience: e.target.value }))}
                      className="mt-1"
                      min="0"
                      max="50"
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

          {/* Performance Overview */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Performance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalClients || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Total Clients</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.totalMealPlansCreated || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Meal Plans</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : stats?.activeMealPlans || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Active Plans</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-slate-900">
                    {statsLoading ? '...' : `${stats?.clientSatisfactionRate || 0}%`}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600">Satisfaction</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-4 sm:space-y-6">
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
                onClick={() => window.location.href = '/trainer'}
              >
                <ChefHat className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Browse Recipes</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => window.location.href = '/meal-plan-generator'}
              >
                <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Create Meal Plan</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => setShowInvitationForm(!showInvitationForm)}
              >
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Send Customer Invitation</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => {
                  toast({
                    title: "Client Management",
                    description: "Client management feature would be implemented here.",
                  });
                }}
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Manage Clients</span>
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

          {/* Achievement Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Recipes Assigned</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {statsLoading ? '...' : stats?.totalRecipesAssigned || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Experience Level</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  {profile?.yearsExperience || 0} years
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Client Satisfaction</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {statsLoading ? '...' : `${stats?.clientSatisfactionRate || 0}%`}
                </Badge>
              </div>
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
                  <span className="text-slate-600">Member Since:</span>
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

      {/* Invitation Form Modal */}
      {showInvitationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Send Customer Invitation</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInvitationForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <Label htmlFor="customerEmail">Customer Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message to your invitation..."
                    value={invitationMessage}
                    onChange={(e) => setInvitationMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={sendInvitationMutation.isPending}
                    className="flex-1"
                  >
                    {sendInvitationMutation.isPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInvitationForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invitations List */}
      {invitations && invitations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>Recent Invitations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.slice(0, 5).map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {invitation.customerEmail}
                      </span>
                      {getStatusBadge(invitation.status)}
                    </div>
                    <div className="text-sm text-slate-600">
                      Sent: {formatDate(invitation.createdAt)}
                    </div>
                  </div>

                  {invitation.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = `${window.location.origin}/register?invitation=${invitation.token}`;
                        navigator.clipboard.writeText(link);
                        toast({
                          title: "Link Copied",
                          description: "Invitation link copied to clipboard.",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Link
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}