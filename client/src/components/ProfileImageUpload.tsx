import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  userEmail: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onImageUpdate?: (imageUrl: string | null) => void;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6'
};

export default function ProfileImageUpload({
  currentImageUrl,
  userEmail,
  size = 'lg',
  className,
  onImageUpdate
}: ProfileImageUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Debug logging to track prop changes (development only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ProfileImageUpload: currentImageUrl prop changed:', currentImageUrl);
    }
  }, [currentImageUrl]);

  // Get user initials for fallback
  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await apiRequest('POST', '/api/profile/upload-image', formData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('ProfileImageUpload: Upload success response:', data);
      }
      
      toast({
        title: 'Profile Image Updated',
        description: 'Your profile image has been successfully updated.',
      });
      
      const newImageUrl = data.data.profileImageUrl;
      const updatedUserFromServer = data.data.user;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('ProfileImageUpload: New image URL:', newImageUrl);
        console.log('ProfileImageUpload: Updated user from server:', updatedUserFromServer);
      }
      
      // Update the image URL in parent component
      onImageUpdate?.(newImageUrl);
      
      // Update the AuthContext user data with the full user data from server
      queryClient.setQueryData(['/api/auth/me'], updatedUserFromServer);
      
      // Update specific profile query caches with the new image URL
      // For trainer profile, we need to update the specific query key used
      const trainerProfileData = queryClient.getQueryData(['trainerProfile', 'details']) as any;
      if (trainerProfileData) {
        queryClient.setQueryData(['trainerProfile', 'details'], {
          ...trainerProfileData,
          profilePicture: newImageUrl
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('ProfileImageUpload: Updated trainer profile cache with new image');
        }
      } else {
        // If no cached data exists, invalidate the query to force a refetch
        queryClient.invalidateQueries({ queryKey: ['trainerProfile', 'details'] });
        if (process.env.NODE_ENV === 'development') {
          console.log('ProfileImageUpload: No cached trainer profile data, invalidating query');
        }
      }
      
      // Update other profile queries if they exist
      const profileData = queryClient.getQueryData(['profile']);
      if (profileData) {
        queryClient.setQueryData(['profile'], {
          ...profileData,
          profilePicture: newImageUrl
        });
      }
      
      // Don't invalidate immediately - let the cache updates propagate first
      // Invalidate after a short delay to ensure any background fetches get fresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
        queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
        // Don't invalidate trainerProfile as we've already updated it directly
      }, 100);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('ProfileImageUpload: All updates completed');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/profile/delete-image');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete image');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile Image Removed',
        description: 'Your profile image has been removed.',
      });
      
      // Update the image URL in parent component
      onImageUpdate?.(null);
      
      // Update the AuthContext user data to remove profile picture
      if (user) {
        const updatedUser = { ...user, profilePicture: null };
        queryClient.setQueryData(['/api/auth/me'], updatedUser);
      }
      
      // Update specific profile query caches to remove the image
      // For trainer profile, we need to update the specific query key used
      const trainerProfileData = queryClient.getQueryData(['trainerProfile', 'details']) as any;
      if (trainerProfileData) {
        queryClient.setQueryData(['trainerProfile', 'details'], {
          ...trainerProfileData,
          profilePicture: null
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('ProfileImageUpload: Updated trainer profile cache to remove image');
        }
      } else {
        // If no cached data exists, invalidate the query to force a refetch
        queryClient.invalidateQueries({ queryKey: ['trainerProfile', 'details'] });
        if (process.env.NODE_ENV === 'development') {
          console.log('ProfileImageUpload: No cached trainer profile data, invalidating query');
        }
      }
      
      // Update other profile queries if they exist
      const profileData = queryClient.getQueryData(['profile']);
      if (profileData) {
        queryClient.setQueryData(['profile'], {
          ...profileData,
          profilePicture: null
        });
      }
      
      // Don't invalidate immediately - let the cache updates propagate first
      // Invalidate after a short delay to ensure any background fetches get fresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
        queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
        // Don't invalidate trainerProfile as we've already updated it directly
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteClick = () => {
    if (currentImageUrl) {
      deleteMutation.mutate();
    }
  };

  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className={cn('relative group', className)}>
      
      <div
        className={cn(
          'relative overflow-hidden rounded-full border-2 border-gray-200 bg-gray-50 transition-all duration-200',
          sizeClasses[size],
          isHovering && !isLoading && 'border-primary/50 shadow-md'
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Avatar className={cn('w-full h-full', sizeClasses[size])}>
          <AvatarImage 
            src={currentImageUrl || undefined} 
            alt="Profile"
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(userEmail)}
          </AvatarFallback>
        </Avatar>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className={cn('text-white animate-spin', iconSizes[size])} />
          </div>
        )}

        {/* Hover overlay */}
        {isHovering && !isLoading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Camera className={cn('text-white', iconSizes[size])} />
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="absolute -bottom-2 -right-2 flex gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-white shadow-md hover:bg-gray-50"
          onClick={handleUploadClick}
          disabled={isLoading}
          title="Upload new image"
        >
          <Upload className="w-3 h-3" />
        </Button>

        {currentImageUrl && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-white shadow-md hover:bg-red-50 hover:text-red-600"
            onClick={handleDeleteClick}
            disabled={isLoading}
            title="Remove image"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />
    </div>
  );
}

// Simplified version for display-only use (like in header)
interface ProfileAvatarProps {
  imageUrl?: string | null;
  userEmail: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ProfileAvatar({ imageUrl, userEmail, size = 'md', className }: ProfileAvatarProps) {
  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={imageUrl || undefined} 
        alt="Profile"
        className="object-cover"
      />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials(userEmail)}
      </AvatarFallback>
    </Avatar>
  );
}