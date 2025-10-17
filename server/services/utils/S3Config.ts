import 'dotenv/config';

// FIXED: Use lazy validation via getters to avoid race condition with Docker env loading
// Previously validated at import time, which could happen before .env file fully loaded
export const s3Config = {
    get accessKeyId() {
        const val = process.env.AWS_ACCESS_KEY_ID;
        if (!val) {
            throw new Error('AWS_ACCESS_KEY_ID environment variable is not set');
        }
        return val;
    },
    get secretAccessKey() {
        const val = process.env.AWS_SECRET_ACCESS_KEY;
        if (!val) {
            throw new Error('AWS_SECRET_ACCESS_KEY environment variable is not set');
        }
        return val;
    },
    get region() {
        const val = process.env.AWS_REGION;
        if (!val) {
            throw new Error('AWS_REGION environment variable is not set');
        }
        return val;
    },
    get bucketName() {
        const val = process.env.S3_BUCKET_NAME;
        if (!val) {
            throw new Error('S3_BUCKET_NAME environment variable is not set');
        }
        return val;
    },
    // Endpoint is optional, for S3-compatible services like MinIO
    get endpoint() {
        return process.env.AWS_ENDPOINT || undefined;
    },
    // Defaults to false if not 'true'. Determines if uploads are public.
    get isPublicBucket() {
        return process.env.AWS_IS_PUBLIC_BUCKET === 'true';
    }
};

// Optional: Export validation function for explicit checks at startup
export function validateS3Config(): void {
    // Access all required getters to trigger validation
    const _ = {
        key: s3Config.accessKeyId,
        secret: s3Config.secretAccessKey,
        region: s3Config.region,
        bucket: s3Config.bucketName
    };
    console.log('✅ S3 configuration validated successfully');
}