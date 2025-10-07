#!/usr/bin/env pwsh
# Script to update DigitalOcean production app with new S3 credentials

Write-Host "🔄 Updating Production S3 Environment Variables..." -ForegroundColor Cyan
Write-Host ""

# App ID
$APP_ID = "600abc04-b784-426c-8799-0c09f8b9a958"

# New S3 credentials (matching development)
$envVars = @(
    "AWS_ACCESS_KEY_ID=DO00Q343F2BG3ZGALNDE",
    "AWS_SECRET_ACCESS_KEY=hReHovlWpBMT9OJCemgeACLSVcBoDp056kT3eToHc3g",
    "S3_BUCKET_NAME=pti"
)

Write-Host "📋 Current Production S3 Configuration:" -ForegroundColor Yellow
Write-Host "  - AWS_ACCESS_KEY_ID: ECYCCCUHLER27NMNI5OE (OLD)" -ForegroundColor Red
Write-Host "  - S3_BUCKET_NAME: healthtech (OLD)" -ForegroundColor Red
Write-Host ""

Write-Host "✅ New S3 Configuration to Apply:" -ForegroundColor Green
Write-Host "  - AWS_ACCESS_KEY_ID: DO00Q343F2BG3ZGALNDE" -ForegroundColor Green
Write-Host "  - S3_BUCKET_NAME: pti" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
$confirm = Read-Host "Do you want to update production environment variables? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Update cancelled" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚙️ Updating environment variables..." -ForegroundColor Cyan

# Update each environment variable
foreach ($env in $envVars) {
    $parts = $env -split '=', 2
    $key = $parts[0]
    $value = $parts[1]
    
    Write-Host "  Setting $key..." -ForegroundColor Gray
    
    # Use doctl to update the environment variable
    $cmd = "doctl apps update $APP_ID --spec `"- key: $key`n  scope: RUN_AND_BUILD_TIME`n  value: $value`""
    
    # For actual update, we'll use the spec file approach
}

Write-Host ""
Write-Host "📝 Creating updated app spec file..." -ForegroundColor Cyan

# Get current spec
doctl apps spec get $APP_ID > app-spec-current.yaml

Write-Host "✅ Current spec saved to app-spec-current.yaml" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ MANUAL STEPS REQUIRED:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Edit app-spec-current.yaml and update these values:" -ForegroundColor White
Write-Host "   - AWS_ACCESS_KEY_ID: change to DO00Q343F2BG3ZGALNDE" -ForegroundColor Cyan
Write-Host "   - AWS_SECRET_ACCESS_KEY: change to hReHovlWpBMT9OJCemgeACLSVcBoDp056kT3eToHc3g" -ForegroundColor Cyan
Write-Host "   - S3_BUCKET_NAME: change to pti" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Apply the updated spec:" -ForegroundColor White
Write-Host "   doctl apps update $APP_ID --spec app-spec-current.yaml" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Monitor deployment:" -ForegroundColor White
Write-Host "   doctl apps list-deployments $APP_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Verify production is working:" -ForegroundColor White
Write-Host "   Visit https://evofitmeals.com and test recipe generation" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Alternative: Use DigitalOcean Dashboard" -ForegroundColor Yellow
Write-Host "1. Go to https://cloud.digitalocean.com/apps/$APP_ID/settings" -ForegroundColor White
Write-Host "2. Click on 'Environment Variables' section" -ForegroundColor White
Write-Host "3. Update the three S3-related variables" -ForegroundColor White
Write-Host "4. Click 'Save' to trigger redeployment" -ForegroundColor White
Write-Host ""