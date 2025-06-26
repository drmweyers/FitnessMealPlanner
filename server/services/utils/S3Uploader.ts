import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { s3Config } from './S3Config'; // Import the new centralized config

// Configure the AWS SDK using our centralized config
AWS.config.update({
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    region: s3Config.region,
});

const s3 = new AWS.S3({
    // Use custom endpoint if provided
    endpoint: s3Config.endpoint,
    // This style is often needed for local S3-compatible services
    s3ForcePathStyle: !!s3Config.endpoint,
});

/**
 * Downloads an image from a URL and uploads it to an S3 bucket.
 * @param imageUrl The temporary URL of the image to download.
 * @param recipeName A descriptive name for the recipe to create a friendly filename.
 * @returns The permanent public URL of the image in S3.
 */
export async function uploadImageToS3(imageUrl: string, recipeName: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
        }

        const imageBuffer = await response.buffer();
        const sanitizedName = recipeName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
        const uniqueId = uuidv4().split('-')[0];
        const key = `recipes/${sanitizedName}_${uniqueId}.png`;

        const params: AWS.S3.PutObjectRequest = {
            Bucket: s3Config.bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/png',
        };

        // Conditionally set the ACL based on the configuration from env
        if (s3Config.isPublicBucket) {
            params.ACL = 'public-read';
        }

        const { Location } = await s3.upload(params).promise();
        
        console.log(`Successfully uploaded image to S3: ${Location}`);
        return Location;

    } catch (error) {
        console.error(`Error uploading image to S3 for "${recipeName}":`, error);
        throw new Error('Failed to upload recipe image to S3.');
    }
}