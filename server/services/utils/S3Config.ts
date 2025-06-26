import 'dotenv/config';

// Validate that all required environment variables are set.
if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("Missing required AWS S3 environment variables (S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).");
}

export const s3Config = Object.freeze({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.S3_BUCKET_NAME,
    // Endpoint is optional, for S3-compatible services like MinIO
    endpoint: process.env.AWS_ENDPOINT || undefined,
    // Defaults to false if not 'true'. Determines if uploads are public.
    isPublicBucket: process.env.AWS_IS_PUBLIC_BUCKET === 'true',
});