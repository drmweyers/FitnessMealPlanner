/**
 * Branding Settings Component (Story 2.12)
 *
 * Professional+ tier branding customization
 * - Logo upload (Professional+)
 * - Color customization (Professional+)
 * - White-label mode (Enterprise)
 * - Custom domain (Enterprise)
 */

<<<<<<< HEAD
import { useState } from 'react';
=======
import { useState, useEffect } from 'react';
>>>>>>> 7b06368c452285bf41ed3cfc2bcfdcb1c0a61ff7
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { useToast } from '../hooks/use-toast';
import { useTier } from '../hooks/useTier';
import { Upload, Image, Palette, Eye, EyeOff, Lock, Check, X, AlertCircle, Globe } from 'lucide-react';

interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  whiteLabelEnabled: boolean;
  customDomain?: string;
  domainVerified: boolean;
}

export default function BrandingSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tier, canAccess, isLoading: tierLoading } = useTier();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('');
  const [secondaryColor, setSecondaryColor] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');

  // Fetch branding settings
<<<<<<< HEAD
  const { data: settings, isLoading } = useQuery({
=======
  const { data: settings, isLoading } = useQuery<BrandingSettings>({
>>>>>>> 7b06368c452285bf41ed3cfc2bcfdcb1c0a61ff7
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const response = await fetch('/api/branding', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch branding settings');
      const data = await response.json();
      return data.data as BrandingSettings;
    },
<<<<<<< HEAD
    onSuccess: (data) => {
      setPrimaryColor(data.primaryColor || '');
      setSecondaryColor(data.secondaryColor || '');
      setAccentColor(data.accentColor || '');
      setCustomDomain(data.customDomain || '');
    },
  });

=======
  });

  // Update local state when settings are loaded (replaces onSuccess from React Query v4)
  useEffect(() => {
    if (settings) {
      setPrimaryColor(settings.primaryColor || '');
      setSecondaryColor(settings.secondaryColor || '');
      setAccentColor(settings.accentColor || '');
      setCustomDomain(settings.customDomain || '');
    }
  }, [settings]);

>>>>>>> 7b06368c452285bf41ed3cfc2bcfdcb1c0a61ff7
  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/branding/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      setLogoFile(null);
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/branding/logo', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete logo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({
        title: 'Success',
        description: 'Logo deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update colors mutation
  const updateColorsMutation = useMutation({
    mutationFn: async (colors: { primaryColor?: string; secondaryColor?: string; accentColor?: string }) => {
      const response = await fetch('/api/branding', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colors),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update colors');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({
        title: 'Success',
        description: 'Colors updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle white-label mutation
  const toggleWhiteLabelMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/branding/white-label', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle white-label');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({
        title: 'Success',
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set custom domain mutation
  const setCustomDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await fetch('/api/branding/custom-domain', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: domain }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set custom domain');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({
        title: 'Success',
        description: data.message,
        duration: 10000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/branding/verify-domain', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify domain');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({
        title: data.verified ? 'Success' : 'Verification Failed',
        description: data.message,
        variant: data.verified ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Logo file must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleColorUpdate = () => {
    updateColorsMutation.mutate({
      primaryColor: primaryColor || undefined,
      secondaryColor: secondaryColor || undefined,
      accentColor: accentColor || undefined,
    });
  };

  const handleWhiteLabelToggle = (enabled: boolean) => {
    toggleWhiteLabelMutation.mutate(enabled);
  };

  const handleCustomDomainSet = () => {
    if (customDomain.trim()) {
      setCustomDomainMutation.mutate(customDomain.trim());
    }
  };

  if (tierLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading branding settings...</p>
        </div>
      </div>
    );
  }

  // Check tier access
  const hasProfessionalAccess = canAccess('professional');
  const hasEnterpriseAccess = canAccess('enterprise');

  return (
    <div className="space-y-6">
      {/* Tier Access Alert */}
      {!hasProfessionalAccess && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <strong>Upgrade Required:</strong> Branding customization is available for Professional and Enterprise tiers.
            <Button variant="link" className="ml-2 p-0 h-auto">
              Upgrade Now →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Logo Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo Upload
              </CardTitle>
              <CardDescription>
                Upload your custom logo (PNG, JPG, SVG - max 2MB)
              </CardDescription>
            </div>
            <Badge variant={hasProfessionalAccess ? 'default' : 'secondary'}>
              {hasProfessionalAccess ? 'Professional+' : 'Locked'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
<<<<<<< HEAD
          {settings?.logoUrl && (
=======
          {settings && settings.logoUrl && (
>>>>>>> 7b06368c452285bf41ed3cfc2bcfdcb1c0a61ff7
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
              <img
                src={settings.logoUrl}
                alt="Current logo"
                className="h-16 w-16 object-contain rounded border bg-white p-2"
              />
              <div className="flex-1">
                <p className="font-medium">Current Logo</p>
                <p className="text-sm text-slate-600">Uploaded and active</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteLogoMutation.mutate()}
                disabled={!hasProfessionalAccess || deleteLogoMutation.isPending}
              >
                {deleteLogoMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="logo-upload">Select Logo File</Label>
            <div className="flex gap-3">
              <Input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoSelect}
                disabled={!hasProfessionalAccess}
                className="flex-1"
              />
              <Button
                onClick={handleLogoUpload}
                disabled={!logoFile || !hasProfessionalAccess || uploadLogoMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadLogoMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            {logoFile && (
              <p className="text-sm text-slate-600">
                Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(0)}KB)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Color Customization Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Customization
              </CardTitle>
              <CardDescription>
                Customize your brand colors (Professional+)
              </CardDescription>
            </div>
            <Badge variant={hasProfessionalAccess ? 'default' : 'secondary'}>
              {hasProfessionalAccess ? 'Professional+' : 'Locked'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor || '#3b82f6'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!hasProfessionalAccess}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor || ''}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                  disabled={!hasProfessionalAccess}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={secondaryColor || '#8b5cf6'}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={!hasProfessionalAccess}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={secondaryColor || ''}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#8b5cf6"
                  disabled={!hasProfessionalAccess}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor || '#10b981'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!hasProfessionalAccess}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={accentColor || ''}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#10b981"
                  disabled={!hasProfessionalAccess}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleColorUpdate}
            disabled={!hasProfessionalAccess || updateColorsMutation.isPending}
            className="w-full"
          >
            {updateColorsMutation.isPending ? 'Updating...' : 'Update Colors'}
          </Button>
        </CardContent>
      </Card>

      {/* White-Label Mode Section (Enterprise) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {settings?.whiteLabelEnabled ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                White-Label Mode
              </CardTitle>
              <CardDescription>
                Remove EvoFit branding from customer-facing pages (Enterprise only)
              </CardDescription>
            </div>
            <Badge variant={hasEnterpriseAccess ? 'default' : 'secondary'}>
              {hasEnterpriseAccess ? 'Enterprise' : 'Locked'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">White-Label Status</p>
              <p className="text-sm text-slate-600">
                {settings?.whiteLabelEnabled
                  ? 'EvoFit branding is hidden on customer pages'
                  : 'EvoFit branding is visible on customer pages'}
              </p>
            </div>
            <Switch
              checked={settings?.whiteLabelEnabled || false}
              onCheckedChange={handleWhiteLabelToggle}
              disabled={!hasEnterpriseAccess || toggleWhiteLabelMutation.isPending}
            />
          </div>

          {!hasEnterpriseAccess && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upgrade to Enterprise tier to enable white-label mode and custom domain.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Section (Enterprise) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domain
              </CardTitle>
              <CardDescription>
                Use your own domain for customer-facing pages (Enterprise only)
              </CardDescription>
            </div>
            <Badge variant={hasEnterpriseAccess ? 'default' : 'secondary'}>
              {hasEnterpriseAccess ? 'Enterprise' : 'Locked'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
<<<<<<< HEAD
          {settings?.customDomain && (
=======
          {settings && settings.customDomain && (
>>>>>>> 7b06368c452285bf41ed3cfc2bcfdcb1c0a61ff7
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
              <Globe className="h-5 w-5 text-slate-600" />
              <div className="flex-1">
                <p className="font-medium">{settings.customDomain}</p>
                <div className="flex items-center gap-2 mt-1">
                  {settings.domainVerified ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Verified</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-600">Pending Verification</span>
                    </>
                  )}
                </div>
              </div>
              {!settings.domainVerified && (
                <Button
                  size="sm"
                  onClick={() => verifyDomainMutation.mutate()}
                  disabled={!hasEnterpriseAccess || verifyDomainMutation.isPending}
                >
                  {verifyDomainMutation.isPending ? 'Verifying...' : 'Verify Now'}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="custom-domain">Domain Name</Label>
            <div className="flex gap-3">
              <Input
                id="custom-domain"
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="meals.yourdomain.com"
                disabled={!hasEnterpriseAccess}
                className="flex-1"
              />
              <Button
                onClick={handleCustomDomainSet}
                disabled={!customDomain.trim() || !hasEnterpriseAccess || setCustomDomainMutation.isPending}
              >
                {setCustomDomainMutation.isPending ? 'Setting...' : 'Set Domain'}
              </Button>
            </div>
            <p className="text-sm text-slate-600">
              You'll need to add DNS records after setting your domain.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
