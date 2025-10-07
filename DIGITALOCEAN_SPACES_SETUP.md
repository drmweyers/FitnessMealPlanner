# DigitalOcean Spaces Setup for Image Storage

## Quick Setup (5 minutes)

### Step 1: Get Your DigitalOcean Spaces Credentials

1. **Login to DigitalOcean**: https://cloud.digitalocean.com/
2. **Navigate to API section**: Click on "API" in the left sidebar
3. **Go to Spaces Keys tab**: Click on "Spaces Keys" tab
4. **Generate New Key**:
   - Click "Generate New Key"
   - Name it: "FitnessMealPlanner-Dev"
   - Copy the **Access Key** and **Secret Key** immediately (you won't see the secret again!)

### Step 2: Update Your .env File

Replace the placeholder values in your `.env` file:

```bash
# DigitalOcean Spaces Configuration (S3-compatible)
AWS_ACCESS_KEY_ID=YOUR_SPACES_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_SPACES_SECRET_KEY_HERE
AWS_REGION=tor1
AWS_ENDPOINT=https://tor1.digitaloceanspaces.com
S3_BUCKET_NAME=healthtech
```

### Step 3: Verify the Space Exists

1. Go to **Spaces** in DigitalOcean dashboard
2. Check if `healthtech` space exists in Toronto (tor1) region
3. If not, create it:
   - Click "Create Space"
   - Choose Toronto (tor1) datacenter
   - Name it: `healthtech`
   - Enable CDN (optional but recommended)
   - File Listing: Restrict (for security)
   - Click "Create Space"

### Step 4: Set CORS Policy (Important!)

1. Click on your `healthtech` space
2. Go to "Settings" tab
3. Click on "CORS Configuration"
4. Add this configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>http://localhost:4000</AllowedOrigin>
    <AllowedOrigin>https://evofitmeals.com</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

5. Click "Save"

### Step 5: Restart Your Development Server

```bash
# Stop the current server
docker-compose --profile dev down

# Start with new environment variables
docker-compose --profile dev up -d

# Check logs
docker logs fitnessmealplanner-dev --tail 50
```

## Testing Image Upload

Once configured, test the image functionality:

1. Login as admin: `admin@fitmeal.pro` / `AdminPass123`
2. Go to Admin → Recipes
3. Create a new recipe or edit existing one
4. The DALL-E image generation should now work
5. Profile image uploads should also work

## Troubleshooting

### "Missing required AWS S3 environment variables" Error
- Make sure all environment variables are set in .env
- Restart Docker containers after changing .env

### "Access Denied" Error
- Verify your Spaces access keys are correct
- Check that the bucket name matches exactly
- Ensure CORS is configured

### Images Not Displaying
- Check browser console for CORS errors
- Verify the Space is set to public read access for images
- Check that AWS_ENDPOINT includes https://

## Cost Information

- **DigitalOcean Spaces**: $5/month flat rate
- Includes 250 GB storage
- Includes 1 TB bandwidth
- No per-request charges
- Much cheaper than AWS S3 for small-medium applications

## Production Note

The production environment at https://evofitmeals.com is already configured with DigitalOcean Spaces. This setup mirrors the production configuration for consistency.

---

**Next Steps**: 
1. Get your Spaces credentials from DigitalOcean
2. Update the .env file
3. Restart the Docker containers
4. Test image generation with a recipe