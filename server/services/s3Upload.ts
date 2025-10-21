import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import sharp from 'sharp';
import { nanoid } from 'nanoid';

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'fitnessmealplanner-uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Multer configuration for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

/**
 * Upload profile image to S3
 * @param file - Multer file object
 * @param userId - User ID for folder organization
 * @returns Promise<string> - S3 URL of uploaded image
 */
export async function uploadProfileImage(file: Express.Multer.File, userId: string): Promise<string> {
  try {
    // Process image with sharp - auto-rotate based on EXIF orientation
    const processedImage = await sharp(file.buffer)
      .rotate() // Auto-rotates based on EXIF orientation metadata
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate unique filename
    const fileExtension = 'jpg'; // Always convert to JPEG for consistency
    const fileName = `profile-images/${userId}/${nanoid()}.${fileExtension}`;

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: processedImage,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000', // 1 year cache
      ACL: 'public-read', // Make images publicly accessible
    });

    await s3Client.send(uploadCommand);

    // Return public URL
    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    return imageUrl;

  } catch (error) {
    console.error('Error uploading profile image to S3:', error);
    throw new Error('Failed to upload profile image');
  }
}

/**
 * Delete profile image from S3
 * @param imageUrl - Full S3 URL of the image to delete
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    // Extract key from URL
    const urlParts = imageUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes(BUCKET_NAME));
    if (bucketIndex === -1) return;

    const key = urlParts.slice(bucketIndex + 1).join('/');

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(deleteCommand);
  } catch (error) {
    console.error('Error deleting profile image from S3:', error);
    // Don't throw error for deletion failures to avoid blocking user operations
  }
}

/**
 * Validate image file
 * @param file - Multer file object
 * @returns boolean - Whether file is valid
 */
export function validateImageFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }

  return { valid: true };
}

// Alternative: Use local file storage for development
export async function uploadProfileImageLocal(file: Express.Multer.File, userId: string): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profile-images');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Process image - auto-rotate based on EXIF orientation
    const processedImage = await sharp(file.buffer)
      .rotate() // Auto-rotates based on EXIF orientation metadata
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate unique filename
    const fileName = `${userId}-${nanoid()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    await fs.writeFile(filePath, processedImage);

    // Return public URL
    return `/uploads/profile-images/${fileName}`;

  } catch (error) {
    console.error('Error uploading profile image locally:', error);
    throw new Error('Failed to upload profile image');
  }
}