# PowerShell script to create and configure DigitalOcean Spaces access keys

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "DigitalOcean Spaces Key Generator" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create new Spaces access key
Write-Host "Creating new Spaces access key..." -ForegroundColor Yellow

$keyName = "fitnessmealplanner-$(Get-Date -Format 'yyyyMMdd')"
$bucket = Read-Host "Which bucket should have access? (pti/healthtech/both)"

if ($bucket -eq "both" -or $bucket -eq "") {
    # Full access to all buckets
    $grants = "bucket=;permission=fullaccess"
    Write-Host "Creating key with full access to all buckets..." -ForegroundColor Green
} elseif ($bucket -eq "pti") {
    $grants = "bucket=pti;permission=readwrite"
    Write-Host "Creating key with read/write access to 'pti' bucket..." -ForegroundColor Green
} else {
    $grants = "bucket=healthtech;permission=readwrite"
    Write-Host "Creating key with read/write access to 'healthtech' bucket..." -ForegroundColor Green
}

# Create the key and capture output
$keyOutput = doctl spaces keys create $keyName --grants $grants --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    $keyData = $keyOutput | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "✅ Spaces key created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT - Save these credentials immediately:" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host "Access Key ID: $($keyData.access_key)" -ForegroundColor Cyan
    Write-Host "Secret Key: $($keyData.secret_key)" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Step 2: Update local .env file
    $updateLocal = Read-Host "Update local .env file with these credentials? (y/n)"
    if ($updateLocal -eq "y") {
        $envPath = ".env"
        if (Test-Path $envPath) {
            $envContent = Get-Content $envPath
            $envContent = $envContent -replace "AWS_ACCESS_KEY_ID=.*", "AWS_ACCESS_KEY_ID=$($keyData.access_key)"
            $envContent = $envContent -replace "AWS_SECRET_ACCESS_KEY=.*", "AWS_SECRET_ACCESS_KEY=$($keyData.secret_key)"
            Set-Content -Path $envPath -Value $envContent
            Write-Host "✅ Local .env file updated!" -ForegroundColor Green
        }
    }
    
    # Step 3: Update production
    $updateProd = Read-Host "Update production environment variables? (y/n)"
    if ($updateProd -eq "y") {
        Write-Host "Updating production app environment variables..." -ForegroundColor Yellow
        
        $appId = "600abc04-b784-426c-8799-0c09f8b9a958"
        
        # Get current spec
        $appSpec = doctl apps get $appId --output json | ConvertFrom-Json
        $spec = $appSpec[0].spec
        
        # Update AWS environment variables
        $envVars = @(
            @{key="AWS_ACCESS_KEY_ID"; value=$($keyData.access_key); scope="RUN_AND_BUILD_TIME"},
            @{key="AWS_SECRET_ACCESS_KEY"; value=$($keyData.secret_key); scope="RUN_AND_BUILD_TIME"},
            @{key="AWS_REGION"; value="tor1"; scope="RUN_AND_BUILD_TIME"},
            @{key="AWS_ENDPOINT"; value="https://tor1.digitaloceanspaces.com"; scope="RUN_AND_BUILD_TIME"},
            @{key="S3_BUCKET_NAME"; value=$(if ($bucket -eq "healthtech") {"healthtech"} else {"pti"}); scope="RUN_AND_BUILD_TIME"},
            @{key="AWS_IS_PUBLIC_BUCKET"; value="true"; scope="RUN_AND_BUILD_TIME"}
        )
        
        # Filter out old AWS variables and add new ones
        $newEnvs = @()
        foreach ($env in $spec.envs) {
            if ($env.key -notlike "AWS*" -and $env.key -ne "S3_BUCKET_NAME") {
                $newEnvs += $env
            }
        }
        
        foreach ($awsVar in $envVars) {
            $newEnvs += $awsVar
        }
        
        $spec.envs = $newEnvs
        
        # Save and update
        $spec | ConvertTo-Json -Depth 10 > "temp-spec.json"
        doctl apps update $appId --spec temp-spec.json
        
        Remove-Item "temp-spec.json" -ErrorAction SilentlyContinue
        
        Write-Host "✅ Production environment variables updated!" -ForegroundColor Green
        Write-Host "The app will automatically redeploy." -ForegroundColor Cyan
    }
    
} else {
    Write-Host "❌ Failed to create Spaces key" -ForegroundColor Red
    Write-Host $keyOutput
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Docker: docker-compose --profile dev restart" -ForegroundColor White
Write-Host "2. Test S3 connection: npx tsx server/scripts/test-s3-connection.ts" -ForegroundColor White
Write-Host "3. Generate a recipe batch to verify images work" -ForegroundColor White