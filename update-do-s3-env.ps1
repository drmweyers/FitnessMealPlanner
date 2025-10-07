# PowerShell script to update DigitalOcean App Platform S3 environment variables
# Run this after generating new Spaces Access Keys

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DigitalOcean S3 Environment Update Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for new credentials
$accessKey = Read-Host "Enter your NEW AWS_ACCESS_KEY_ID (from Spaces Keys)"
$secretKey = Read-Host "Enter your NEW AWS_SECRET_ACCESS_KEY (from Spaces Keys)" -AsSecureString
$secretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretKey))

# Ask which bucket to use
Write-Host ""
Write-Host "Which S3 bucket should production use?" -ForegroundColor Yellow
Write-Host "1. pti (same as development)" -ForegroundColor Green
Write-Host "2. healthtech (current production setting)" -ForegroundColor Blue
$bucketChoice = Read-Host "Enter choice (1 or 2)"

if ($bucketChoice -eq "1") {
    $bucketName = "pti"
} else {
    $bucketName = "healthtech"
}

Write-Host ""
Write-Host "Updating production environment variables..." -ForegroundColor Yellow

# Update each environment variable
$appId = "600abc04-b784-426c-8799-0c09f8b9a958"

# Create a temporary JSON file with the updated spec
$tempFile = "temp-app-spec.json"

Write-Host "Getting current app configuration..." -ForegroundColor Gray
doctl apps get $appId --output json > $tempFile

# Read and update the JSON
$appConfig = Get-Content $tempFile | ConvertFrom-Json
$spec = $appConfig[0].spec

# Update or add AWS environment variables
$awsVars = @(
    @{key="AWS_ACCESS_KEY_ID"; value=$accessKey; scope="RUN_AND_BUILD_TIME"},
    @{key="AWS_SECRET_ACCESS_KEY"; value=$secretKeyPlain; scope="RUN_AND_BUILD_TIME"},
    @{key="AWS_REGION"; value="tor1"; scope="RUN_AND_BUILD_TIME"},
    @{key="AWS_ENDPOINT"; value="https://tor1.digitaloceanspaces.com"; scope="RUN_AND_BUILD_TIME"},
    @{key="S3_BUCKET_NAME"; value=$bucketName; scope="RUN_AND_BUILD_TIME"},
    @{key="AWS_IS_PUBLIC_BUCKET"; value="true"; scope="RUN_AND_BUILD_TIME"}
)

# Filter out old AWS variables and add new ones
$newEnvs = @()
foreach ($env in $spec.envs) {
    if ($env.key -notlike "AWS*" -and $env.key -ne "S3_BUCKET_NAME") {
        $newEnvs += $env
    }
}

# Add new AWS variables
foreach ($awsVar in $awsVars) {
    $newEnvs += $awsVar
}

$spec.envs = $newEnvs

# Save updated spec
$spec | ConvertTo-Json -Depth 10 > "updated-spec.json"

Write-Host "Applying updated configuration to production..." -ForegroundColor Yellow
doctl apps update $appId --spec updated-spec.json

Write-Host ""
Write-Host "✅ Production environment variables updated!" -ForegroundColor Green
Write-Host ""
Write-Host "The app will automatically redeploy with new settings." -ForegroundColor Cyan
Write-Host "Monitor deployment at: https://cloud.digitalocean.com/apps/$appId" -ForegroundColor Cyan

# Clean up temp files
Remove-Item $tempFile -ErrorAction SilentlyContinue
Remove-Item "updated-spec.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your local .env file with the same credentials" -ForegroundColor White
Write-Host "2. Restart Docker: docker-compose --profile dev restart" -ForegroundColor White
Write-Host "3. Test recipe generation to verify images work" -ForegroundColor White