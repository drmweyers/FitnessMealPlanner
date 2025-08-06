# TrainerProfile ProfileImageUpload Restoration Guide

## 📋 Overview

This guide provides the exact steps to restore ProfileImageUpload functionality to the TrainerProfile component after it was removed. Use this when you want to add profile image functionality back to trainer accounts.

---

## 🔄 Restoration Steps

### **Step 1: Add Import Statement**

Add the ProfileImageUpload import to the imports section of TrainerProfile.tsx:

**Location**: Around line 14 (after other component imports)

```typescript
import ProfileImageUpload from '../components/ProfileImageUpload';
```

### **Step 2: Add Profile Image Card Section**

Add the complete Profile Image card section to the main content area of TrainerProfile.tsx.

**Location**: Insert between Account Details Card and Performance Overview Card (around line 378)

```jsx
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
          queryClient.setQueryData(['trainerProfile', 'details'], {
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
```

### **Step 3: Verify Interface Definition**

Ensure the TrainerProfile interface includes the profilePicture property:

**Location**: Around line 54 in the interface definition

```typescript
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
  profilePicture?: string | null;  // This line should exist
}
```

---

## 🎯 Complete Restoration Code

### **Full Import Section (Top of File):**
```typescript
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/queryClient';
import PDFExportButton from '../components/PDFExportButton';
import ProfileImageUpload from '../components/ProfileImageUpload';  // ADD THIS LINE
import { 
  User, 
  Dumbbell, 
  Users, 
  ChefHat, 
  // ... other icons
} from 'lucide-react';
```

### **Placement in JSX Structure:**
```jsx
<div className="lg:col-span-2 space-y-6">
  
  {/* Profile Image Card - INSERT HERE */}
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
            queryClient.setQueryData(['trainerProfile', 'details'], {
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
    {/* ... existing Account Details content ... */}
  </Card>

  {/* Other existing cards ... */}
</div>
```

---

## 🧪 Testing After Restoration

### **1. Run Tests to Verify Addition**
```bash
# This test should now FAIL (which means restoration worked)
npm test -- test/unit/ProfileImageFinalVerification.test.tsx

# The failure indicates profile image content is back
```

### **2. Manual Browser Testing**
1. Restart development server: `docker-compose --profile dev restart`
2. Clear browser cache (Ctrl+Shift+R)
3. Navigate to trainer profile page
4. Verify profile image upload section is visible
5. Test image upload functionality

### **3. Create New Positive Tests**
After restoration, create tests that verify profile image functionality works:

```typescript
// New test file: ProfileImageRestoration.test.tsx
describe('ProfileImageUpload Restoration Verification', () => {
  it('should import ProfileImageUpload', () => {
    expect(trainerProfileContent).toContain('import ProfileImageUpload');
  });

  it('should contain ProfileImageUpload JSX usage', () => {
    expect(trainerProfileContent).toContain('<ProfileImageUpload');
  });

  it('should contain Profile Image card header', () => {
    expect(trainerProfileContent).toContain('Profile Image</span>');
  });

  it('should contain profile image upload instructions', () => {
    expect(trainerProfileContent).toContain('Upload a professional profile image');
    expect(trainerProfileContent).toContain('Recommended: Square image');
  });
});
```

---

## 📍 Key Restoration Points

### **1. Exact Placement Location**
The Profile Image card should be placed as the **FIRST card** in the main content area, before Account Details.

### **2. Component Integration**
The ProfileImageUpload component integrates with:
- React Query for caching (`queryClient.setQueryData`)
- Auth context for user email
- Profile data for current image URL

### **3. Styling Consistency**
The card follows the same design pattern as other cards:
- Same Card/CardHeader/CardTitle/CardContent structure
- Same icon and spacing classes
- Consistent text styling and colors

---

## ⚠️ Things to Watch For

### **1. Import Order**
Place the ProfileImageUpload import with other component imports, not at the end.

### **2. Props Accuracy**
Ensure all props match the ProfileImageUpload component interface:
- `currentImageUrl`: Profile picture URL from data
- `userEmail`: User email for fallback avatar
- `size`: Set to "xl" for trainer profiles
- `onImageUpdate`: Query cache update handler

### **3. TypeScript Interface**
Verify the `profilePicture?: string | null` property exists in the interface.

---

## 🔄 Alternative Approaches

### **Option 1: Conditional Rendering**
If you want to make it optional based on settings:

```jsx
{someCondition && (
  <Card>
    {/* Profile Image Card content */}
  </Card>
)}
```

### **Option 2: Feature Flag**
Use a feature flag to control availability:

```jsx
{process.env.REACT_APP_ENABLE_TRAINER_PROFILE_IMAGES === 'true' && (
  <Card>
    {/* Profile Image Card content */}
  </Card>
)}
```

---

## 📁 Files to Modify for Restoration

### **Required:**
- `client/src/pages/TrainerProfile.tsx` - Add import and JSX content

### **Optional Testing:**
- Create new test file to verify restoration worked
- Update existing tests if needed

### **Documentation:**
- Update this file with any customizations made during restoration

---

## 🎯 Success Criteria After Restoration

- ✅ ProfileImageUpload import present
- ✅ Profile Image card renders before Account Details
- ✅ Image upload functionality works
- ✅ Upload instructions display correctly
- ✅ Profile pictures show in header after upload
- ✅ No console errors or TypeScript issues

---

*Use this guide to cleanly restore ProfileImageUpload functionality when needed, ensuring consistency with AdminProfile and CustomerProfile implementations.*