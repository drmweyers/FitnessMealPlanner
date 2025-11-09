param(
  [string]$Tag = "registry.digitalocean.com/bci/fitnessmealplanner:prod",
  [string]$Dockerfile = "server/Dockerfile",
  [string]$Platform = "linux/amd64",
  [switch]$NoCache
)

$ErrorActionPreference = "Stop"

Write-Host "== Build & Push to DigitalOcean Container Registry (Windows) =="

# Ensure we are in repo root by checking for package.json
if (-not (Test-Path -LiteralPath "package.json")) {
  Write-Host "ERROR: Run this script from the project root (package.json not found)." -ForegroundColor Red
  exit 1
}

# Verify required files
$required = @(
  @{Path="drizzle.config.ts"; Msg="drizzle.config.ts missing"},
  @{Path=$Dockerfile; Msg="Dockerfile not found: $Dockerfile"},
  @{Path="shared"; Msg="shared directory missing"}
)
foreach ($item in $required) {
  if (-not (Test-Path -LiteralPath $item.Path)) {
    Write-Host "ERROR: $($item.Msg)" -ForegroundColor Red
    exit 1
  }
}

# Login (sets timeouts too)
$loginScript = Join-Path $PSScriptRoot 'docker-login-docr.ps1'
if (-not (Test-Path -LiteralPath $loginScript)) {
  Write-Host "ERROR: $loginScript not found" -ForegroundColor Red
  exit 1
}
. $loginScript

# Build arguments
$buildArgs = @('build','--target','final','--platform', $Platform,'-f', $Dockerfile,'-t', $Tag,'.')
if ($NoCache) { $buildArgs = @('build','--no-cache') + $buildArgs[1..($buildArgs.Length-1)] }

Write-Host "Building image with: docker $($buildArgs -join ' ')" -ForegroundColor Yellow
& docker @buildArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: docker build failed" -ForegroundColor Red
  exit 1
}

Write-Host "Image built. Listing image: $Tag" -ForegroundColor Green
& docker images $Tag

Write-Host "Pushing image to DOCR: $Tag" -ForegroundColor Yellow
& docker push $Tag
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: docker push failed" -ForegroundColor Red
  exit 1
}

Write-Host "SUCCESS: Image pushed to $Tag" -ForegroundColor Green
