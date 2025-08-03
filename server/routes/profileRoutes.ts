import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { upload, uploadProfileImage, uploadProfileImageLocal, deleteProfileImage, validateImageFile } from '../services/s3Upload';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const profileRouter = Router();

/**
 * Upload profile image
 * POST /api/profile/upload-image
 */
profileRouter.post('/upload-image', requireAuth, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.error,
        code: 'INVALID_FILE'
      });
    }

    // Get current user to check for existing profile image
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Delete old profile image if it exists
    if (currentUser.profilePicture) {
      try {
        await deleteProfileImage(currentUser.profilePicture);
      } catch (error) {
        console.warn('Failed to delete old profile image:', error);
      }
    }

    // Upload new image
    let imageUrl: string;
    
    // Use local storage in development, S3 in production
    if (process.env.NODE_ENV === 'development' || !process.env.AWS_ACCESS_KEY_ID) {
      imageUrl = await uploadProfileImageLocal(file, userId);
    } else {
      imageUrl = await uploadProfileImage(file, userId);
    }

    // Update user profile with new image URL
    const [updatedUser] = await db
      .update(users)
      .set({ 
        profilePicture: imageUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      status: 'success',
      message: 'Profile image uploaded successfully',
      data: {
        profileImageUrl: imageUrl,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          profilePicture: updatedUser.profilePicture
        }
      }
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload profile image',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * Delete profile image
 * DELETE /api/profile/delete-image
 */
profileRouter.delete('/delete-image', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!currentUser.profilePicture) {
      return res.status(400).json({
        status: 'error',
        message: 'No profile image to delete',
        code: 'NO_IMAGE'
      });
    }

    // Delete image from storage
    try {
      if (currentUser.profilePicture.startsWith('/uploads/')) {
        // Local file deletion
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', currentUser.profilePicture);
        await fs.unlink(filePath);
      } else {
        // S3 deletion
        await deleteProfileImage(currentUser.profilePicture);
      }
    } catch (error) {
      console.warn('Failed to delete profile image file:', error);
    }

    // Update user profile to remove image URL
    const [updatedUser] = await db
      .update(users)
      .set({ 
        profilePicture: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      status: 'success',
      message: 'Profile image deleted successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          profilePicture: updatedUser.profilePicture
        }
      }
    });

  } catch (error) {
    console.error('Profile image deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete profile image',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * Get current user profile
 * GET /api/profile
 */
profileRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: user
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      code: 'FETCH_ERROR'
    });
  }
});

export default profileRouter;