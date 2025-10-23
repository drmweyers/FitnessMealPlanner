import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, _Object } from '@aws-sdk/client-s3';

// S3 Configuration (reuse from s3Upload.ts)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'fitnessmealplanner-uploads';

/**
 * List all objects in S3 with a given prefix
 * @param prefix - S3 object prefix (e.g., 'profile-images/123/')
 * @returns Array of S3 objects
 */
export async function listS3Objects(prefix: string): Promise<_Object[]> {
  const objects: _Object[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(listCommand);

      if (response.Contents) {
        objects.push(...response.Contents);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`Found ${objects.length} objects with prefix "${prefix}"`);
    return objects;

  } catch (error) {
    console.error(`Error listing S3 objects with prefix "${prefix}":`, error);
    throw new Error(`Failed to list S3 objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a single S3 object by key
 * @param key - S3 object key
 */
export async function deleteS3Object(key: string): Promise<void> {
  try {
    const deleteObjects = await deleteS3Objects([key]);
    console.log(`Deleted S3 object: ${key}`);
  } catch (error) {
    console.error(`Error deleting S3 object "${key}":`, error);
    throw new Error(`Failed to delete S3 object: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete multiple S3 objects by key (batch delete)
 * @param keys - Array of S3 object keys
 * @returns Number of objects deleted
 */
export async function deleteS3Objects(keys: string[]): Promise<number> {
  if (keys.length === 0) {
    return 0;
  }

  try {
    // S3 allows deleting up to 1000 objects per request
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: batch.map(key => ({ Key: key })),
          Quiet: true, // Don't return deleted objects in response
        },
      });

      const response = await s3Client.send(deleteCommand);

      // Count successful deletions
      const deleted = batch.length - (response.Errors?.length || 0);
      totalDeleted += deleted;

      // Log errors if any
      if (response.Errors && response.Errors.length > 0) {
        console.error(`Failed to delete ${response.Errors.length} objects:`, response.Errors);
      }
    }

    console.log(`Successfully deleted ${totalDeleted} S3 objects`);
    return totalDeleted;

  } catch (error) {
    console.error('Error deleting S3 objects:', error);
    throw new Error(`Failed to delete S3 objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete all objects with a given prefix
 * @param prefix - S3 object prefix (e.g., 'profile-images/123/')
 * @returns Number of objects deleted
 */
export async function deleteS3ObjectsByPrefix(prefix: string): Promise<number> {
  try {
    // List all objects with prefix
    const objects = await listS3Objects(prefix);

    if (objects.length === 0) {
      console.log(`No objects found with prefix "${prefix}"`);
      return 0;
    }

    // Extract keys
    const keys = objects
      .filter(obj => obj.Key)
      .map(obj => obj.Key!);

    // Delete all objects
    const deletedCount = await deleteS3Objects(keys);

    console.log(`Deleted ${deletedCount} objects with prefix "${prefix}"`);
    return deletedCount;

  } catch (error) {
    console.error(`Error deleting S3 objects with prefix "${prefix}":`, error);
    throw new Error(`Failed to delete S3 objects by prefix: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up all user-related S3 objects (profile images and progress photos)
 * @param userId - User ID
 * @returns Object with deletion counts
 */
export async function cleanupUserS3Objects(userId: number): Promise<{ profileImages: number; progressPhotos: number; total: number }> {
  try {
    console.log(`Starting S3 cleanup for user ${userId}...`);

    // Delete profile images
    const profileImagesPrefix = `profile-images/${userId}/`;
    const profileImagesDeleted = await deleteS3ObjectsByPrefix(profileImagesPrefix);

    // Delete progress photos
    const progressPhotosPrefix = `progress-photos/${userId}/`;
    const progressPhotosDeleted = await deleteS3ObjectsByPrefix(progressPhotosPrefix);

    const total = profileImagesDeleted + progressPhotosDeleted;

    console.log(`S3 cleanup complete for user ${userId}:`, {
      profileImages: profileImagesDeleted,
      progressPhotos: progressPhotosDeleted,
      total,
    });

    return {
      profileImages: profileImagesDeleted,
      progressPhotos: progressPhotosDeleted,
      total,
    };

  } catch (error) {
    console.error(`Error cleaning up S3 objects for user ${userId}:`, error);
    throw new Error(`Failed to clean up user S3 objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
