import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadLandingImages() {
    console.log('🚀 Uploading landing page images to DigitalOcean Spaces...\n');

    // Create S3 client
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        endpoint: process.env.AWS_ENDPOINT,
        forcePathStyle: !!process.env.AWS_ENDPOINT,
    });

    // Path to landing images
    const imagesDir = path.join(__dirname, '../../public/landing/images/screenshots');

    try {
        // Read all image files
        const files = fs.readdirSync(imagesDir);
        const imageFiles = files.filter(file =>
            file.endsWith('.png') ||
            file.endsWith('.jpg') ||
            file.endsWith('.jpeg') ||
            file.endsWith('.gif')
        );

        console.log(`Found ${imageFiles.length} images to upload:\n`);

        // Upload each image
        for (const file of imageFiles) {
            const filePath = path.join(imagesDir, file);
            const fileContent = fs.readFileSync(filePath);

            // Determine content type
            let contentType = 'image/png';
            if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                contentType = 'image/jpeg';
            } else if (file.endsWith('.gif')) {
                contentType = 'image/gif';
            }

            // Upload to S3
            const key = `landing/images/screenshots/${file}`;
            const putCommand = new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: key,
                Body: fileContent,
                ContentType: contentType,
                ACL: 'public-read', // Make publicly accessible
                CacheControl: 'public, max-age=31536000', // Cache for 1 year
            });

            try {
                await s3Client.send(putCommand);
                const publicUrl = `https://${process.env.S3_BUCKET_NAME}.${process.env.AWS_ENDPOINT?.replace('https://', '')}/${key}`;
                console.log(`✅ Uploaded: ${file}`);
                console.log(`   URL: ${publicUrl}`);
            } catch (error: any) {
                console.error(`❌ Failed to upload ${file}:`, error.message);
            }
        }

        console.log('\n✅ Upload complete!');
        console.log('\nBase URL for images:');
        console.log(`https://${process.env.S3_BUCKET_NAME}.${process.env.AWS_ENDPOINT?.replace('https://', '')}/landing/images/screenshots/`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the upload
uploadLandingImages().catch(console.error);