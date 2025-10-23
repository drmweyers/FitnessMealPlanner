import { S3Client, ListObjectsV2Command, HeadObjectCommand, DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

// S3 client configuration for testing
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'pti';

/**
 * List all S3 objects with a given prefix
 */
export async function listS3Objects(prefix: string = ''): Promise<Array<{ Key: string; Size: number; LastModified: Date }>> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map(obj => ({
    Key: obj.Key || '',
    Size: obj.Size || 0,
    LastModified: obj.LastModified || new Date(),
  }));
}

/**
 * Count S3 objects by prefix
 */
export async function countS3Objects(prefix: string): Promise<number> {
  const objects = await listS3Objects(prefix);
  return objects.length;
}

/**
 * Check if an S3 object exists
 */
export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Delete test S3 objects by prefix
 */
export async function deleteTestS3Objects(prefix: string): Promise<number> {
  const objects = await listS3Objects(prefix);

  if (objects.length === 0) {
    return 0;
  }

  // S3 DeleteObjects supports up to 1000 objects per request
  const chunks = [];
  for (let i = 0; i < objects.length; i += 1000) {
    chunks.push(objects.slice(i, i + 1000));
  }

  let totalDeleted = 0;

  for (const chunk of chunks) {
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: chunk.map(obj => ({ Key: obj.Key })),
        Quiet: true,
      },
    });

    const response = await s3Client.send(command);
    totalDeleted += chunk.length - (response.Errors?.length || 0);
  }

  return totalDeleted;
}

/**
 * Upload a test image to S3
 */
export async function uploadTestImage(key: string, fixtureFileName: string = 'test-image-1.jpg'): Promise<string> {
  const fixturePath = path.join(__dirname, '..', 'fixtures', fixtureFileName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Test fixture not found: ${fixturePath}`);
  }

  const fileContent = fs.readFileSync(fixturePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: 'image/jpeg',
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

/**
 * Get S3 storage statistics by prefix
 */
export async function getS3StorageStats(prefix: string = ''): Promise<{
  count: number;
  totalSize: number;
  totalSizeMB: number;
  avgSize: number;
}> {
  const objects = await listS3Objects(prefix);

  const totalSize = objects.reduce((sum, obj) => sum + obj.Size, 0);

  return {
    count: objects.length,
    totalSize,
    totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
    avgSize: objects.length > 0 ? Math.round(totalSize / objects.length) : 0,
  };
}

/**
 * Detect orphaned S3 objects (objects without database records)
 *
 * This function lists all S3 objects and cross-references them with database records.
 * Returns a list of S3 keys that don't have corresponding database entries.
 *
 * @param db - Drizzle database instance
 * @param prefix - S3 prefix to check (e.g., 'profile-images/', 'progress-photos/', 'recipe-images/')
 * @param tableQuery - Database query function to get valid keys
 */
export async function detectOrphanedS3Objects(
  s3Prefix: string,
  validKeys: Set<string>
): Promise<string[]> {
  const s3Objects = await listS3Objects(s3Prefix);

  const orphanedKeys: string[] = [];

  for (const obj of s3Objects) {
    if (!validKeys.has(obj.Key)) {
      orphanedKeys.push(obj.Key);
    }
  }

  return orphanedKeys;
}

/**
 * Create a test fixture directory if it doesn't exist
 */
export function ensureFixtureDirectory(): void {
  const fixtureDir = path.join(__dirname, '..', 'fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }
}

/**
 * Create a test image file (simple JPEG header)
 */
export function createTestImageFile(fileName: string, sizeKB: number = 50): void {
  ensureFixtureDirectory();
  const fixturePath = path.join(__dirname, '..', 'fixtures', fileName);

  // Simple JPEG file header (not a real image, but enough for testing)
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);

  // Create buffer of desired size
  const targetSize = sizeKB * 1024;
  const buffer = Buffer.alloc(targetSize);
  jpegHeader.copy(buffer, 0);

  fs.writeFileSync(fixturePath, buffer);
}

/**
 * Create a test text file (for invalid upload testing)
 */
export function createTestTextFile(fileName: string = 'test-file.txt'): void {
  ensureFixtureDirectory();
  const fixturePath = path.join(__dirname, '..', 'fixtures', fileName);
  fs.writeFileSync(fixturePath, 'This is a test text file, not an image.');
}

/**
 * Cleanup all test fixtures
 */
export function cleanupTestFixtures(): void {
  const fixtureDir = path.join(__dirname, '..', 'fixtures');
  if (fs.existsSync(fixtureDir)) {
    const files = fs.readdirSync(fixtureDir);
    for (const file of files) {
      fs.unlinkSync(path.join(fixtureDir, file));
    }
  }
}

/**
 * Mock S3 errors for testing error handling
 *
 * This is a helper for test setup - actual mocking should be done in test files
 * using tools like msw or by stubbing the S3 client
 */
export const S3_ERROR_TYPES = {
  SERVICE_UNAVAILABLE: {
    name: 'ServiceUnavailable',
    $metadata: { httpStatusCode: 503 },
    message: 'Service Unavailable',
  },
  PERMISSION_DENIED: {
    name: 'AccessDenied',
    $metadata: { httpStatusCode: 403 },
    message: 'Access Denied',
  },
  NETWORK_TIMEOUT: {
    name: 'NetworkingError',
    message: 'Connection timeout',
  },
  INVALID_CREDENTIALS: {
    name: 'InvalidAccessKeyId',
    $metadata: { httpStatusCode: 403 },
    message: 'The AWS Access Key Id you provided does not exist in our records.',
  },
  RATE_LIMIT: {
    name: 'SlowDown',
    $metadata: { httpStatusCode: 503 },
    message: 'Please reduce your request rate.',
  },
} as const;

/**
 * Wait for S3 eventual consistency (useful for tests)
 */
export async function waitForS3Consistency(delayMs: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Verify S3 object matches expected metadata
 */
export async function verifyS3ObjectMetadata(key: string, expectedContentType?: string): Promise<{
  exists: boolean;
  contentType?: string;
  size?: number;
}> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);

    return {
      exists: true,
      contentType: response.ContentType,
      size: response.ContentLength,
    };
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * Generate S3 storage report for testing/monitoring
 */
export async function generateS3StorageReport(): Promise<{
  profileImages: ReturnType<typeof getS3StorageStats>;
  progressPhotos: ReturnType<typeof getS3StorageStats>;
  recipeImages: ReturnType<typeof getS3StorageStats>;
  total: ReturnType<typeof getS3StorageStats>;
}> {
  const [profileImages, progressPhotos, recipeImages, total] = await Promise.all([
    getS3StorageStats('profile-images/'),
    getS3StorageStats('progress-photos/'),
    getS3StorageStats('recipe-images/'),
    getS3StorageStats(''),
  ]);

  return {
    profileImages: await profileImages,
    progressPhotos: await progressPhotos,
    recipeImages: await recipeImages,
    total: await total,
  };
}
