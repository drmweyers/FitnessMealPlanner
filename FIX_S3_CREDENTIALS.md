# Fixing S3/DigitalOcean Spaces Credentials

## Current Issue
The DigitalOcean Spaces credentials in your `.env` file are invalid or expired. Recipe images are currently using a placeholder image as a fallback.

## Solution: Update Your DigitalOcean Spaces Credentials

### Step 1: Log into DigitalOcean
1. Go to https://cloud.digitalocean.com
2. Log in with your account

### Step 2: Generate New Access Keys
1. Click on **API** in the left sidebar
2. Go to the **Tokens/Keys** tab
3. Scroll down to **Spaces access keys**
4. If you have existing keys that might be expired:
   - Click on the key name to view details
   - Check if it's still active
5. To create new keys:
   - Click **Generate New Key**
   - Give it a name like `fitnessmealplanner-s3`
   - Click **Generate Key**
   - **IMPORTANT**: Copy both the Access Key and Secret immediately (you won't see the secret again!)

### Step 3: Update Your .env File
Replace the following lines in your `.env` file with your new credentials:

```env
# DigitalOcean Spaces Configuration (S3-compatible)
AWS_ACCESS_KEY_ID=YOUR_NEW_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_NEW_SECRET_KEY_HERE
AWS_REGION=tor1
AWS_ENDPOINT=https://tor1.digitaloceanspaces.com
S3_BUCKET_NAME=pti
AWS_IS_PUBLIC_BUCKET=true
```

### Step 4: Verify Your Spaces Configuration
1. Go to **Spaces** in DigitalOcean
2. Check that you have a Space named `pti` in the `tor1` region
3. If not, create one:
   - Click **Create Space**
   - Choose Toronto (tor1) datacenter
   - Name it `pti`
   - Select **Public** for File Listing (if you want images publicly accessible)

### Step 5: Test the Connection
After updating your `.env` file, run:
```bash
npx tsx server/scripts/test-s3-connection.ts
```

If successful, you'll see:
```
✅ Successfully connected to S3!
✅ Successfully uploaded test file!
✨ All tests passed! S3 connection is working.
```

### Step 6: Restart the Development Server
```bash
docker-compose --profile dev restart
```

## Alternative: Use Local Storage (Development Only)

If you don't want to use DigitalOcean Spaces for development, you can:

1. Comment out the S3 configuration in `.env`:
```env
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# etc.
```

2. The system will automatically use placeholder images from Unsplash

## Alternative: Use MinIO (Local S3)

For a completely local S3-compatible storage:

1. Start MinIO:
```bash
docker-compose -f docker-compose.minio.yml up -d
```

2. Update `.env`:
```env
S3_BUCKET_NAME=fitnessmealplanner-recipes
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
AWS_ENDPOINT=http://localhost:9000
AWS_IS_PUBLIC_BUCKET=true
```

3. Access MinIO Console at http://localhost:9001
   - Username: minioadmin
   - Password: minioadmin123

## What's Fixed
✅ Recipe generation now automatically approves recipes (they appear immediately)
✅ Recipe count updates correctly after generation
✅ Image generation falls back to placeholder when S3 fails
✅ Better error logging for debugging S3 issues