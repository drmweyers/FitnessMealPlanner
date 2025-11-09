param(
  [int]$ExpirySeconds = 600
)

$ErrorActionPreference = "Stop"

Write-Host "== DigitalOcean Registry Login (Windows) =="

# Check doctl
$doctl = Get-Command doctl -ErrorAction SilentlyContinue
if (-not $doctl) {
  Write-Host "ERROR: doctl (DigitalOcean CLI) is not installed." -ForegroundColor Red
  Write-Host "Install from: https://docs.digitalocean.com/reference/doctl/how-to/install/" -ForegroundColor Yellow
  exit 1
}

# Validate auth context
try {
  $acct = doctl account get --no-header --format UUID,Email,Status 2>$null
  if (-not $LASTEXITCODE -eq 0) { throw "not authorized" }
  Write-Host "OK: doctl account is authorized ($acct)" -ForegroundColor Green
} catch {
  Write-Host "Your doctl is not authorized or lacks permissions." -ForegroundColor Red
  Write-Host "Run: doctl auth init (use a PAT with registry+apps scope)." -ForegroundColor Yellow
  exit 1
}

# Increase Docker timeouts for this session (helps with slow uploads)
$env:DOCKER_CLIENT_TIMEOUT = "600"
$env:COMPOSE_HTTP_TIMEOUT  = "600"
Write-Host "Set DOCKER_CLIENT_TIMEOUT=600 and COMPOSE_HTTP_TIMEOUT=600" -ForegroundColor Green

# Login docker to DOCR via doctl
Write-Host "Logging in docker to registry.digitalocean.com via doctl..."
& doctl registry login --expiry-seconds $ExpirySeconds
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to login to DOCR" -ForegroundColor Red
  exit 1
}

Write-Host "Success: Docker is logged into registry.digitalocean.com" -ForegroundColor Green
