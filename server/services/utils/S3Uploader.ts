import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { s3Config } from './S3Config'; // Import the new centralized config

// Create a single, reusable S3 client instance
const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
    },
    endpoint: s3Config.endpoint,
    forcePathStyle: !!s3Config.endpoint, // Necessary for S3-compatible services like MinIO
});

/**
 * Downloads an image from a URL and uploads it to S3 using AWS SDK v3.
 * @param imageUrl The temporary URL of the image to download.
 * @param recipeName A descriptive name for the recipe to create a friendly filename.
 * @returns The permanent public URL of the image in S3.
 */
export async function uploadImageToS3(imageUrl: string, recipeName: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok || !response.body) {
            throw new Error(`Failed to fetch image stream from URL: ${response.statusText}`);
        }

        const sanitizedName = recipeName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
        const uniqueId = uuidv4().split('-')[0];
        const key = `recipes/${sanitizedName}_${uniqueId}.png`;

        // Convert the fetch response body to a buffer for compatibility
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Use the high-level Upload utility for efficient streaming
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: s3Config.bucketName,
                Key: key,
                Body: buffer,
                ContentType: 'image/png',
                ACL: s3Config.isPublicBucket ? 'public-read' : undefined,
            },
        });

        const result = await upload.done();

        // The result.Location is the public URL of the uploaded file
        if (result.Location) {
            console.log(`Successfully uploaded image to S3: ${result.Location}`);
            return result.Location;
        }

        // Fallback for S3-compatible services that don't return a Location
        const location = `${s3Config.endpoint || `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com`}/${key}`;
        console.log(`Upload successful. Manually constructed location: ${location}`);
        return location;

    } catch (error) {
        console.error(`[S3Upload] Error uploading image to S3 for "${recipeName}":`, error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('fetch')) {
                throw new Error(`Failed to download image from OpenAI: ${error.message}`);
            } else if (error.message.includes('credentials')) {
                throw new Error('S3 credentials are invalid or expired');
            } else if (error.message.includes('bucket')) {
                throw new Error(`S3 bucket '${s3Config.bucketName}' not found or not accessible`);
            }
        }

        throw new Error(`Failed to upload recipe image to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}