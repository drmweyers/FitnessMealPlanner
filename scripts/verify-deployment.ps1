# FitMeal Pro - Deployment Verification Script (PowerShell, Windows-safe)
# This version avoids special Unicode symbols and balances all braces/quotes.

$ErrorActionPreference = "Continue"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot

# Counters
$CHECKS_PASSED = 0
$CHECKS_FAILED = 0
$WARNINGS = 0

Write-Host "========================================" -ForegroundColor Blue
Write-Host "FitMeal Pro Deployment Verification" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

function Check-Pass {
    param([string]$message)
    Write-Host "OK  $message" -ForegroundColor Green
    $script:CHECKS_PASSED++
}

function Check-Fail {
    param([string]$message, [string]$error)
    Write-Host "ERR $message" -ForegroundColor Red
    if ($error) { Write-Host "  Error: $error" -ForegroundColor Red }
    $script:CHECKS_FAILED++
}

function Check-Warn {
    param([string]$message, [string]$warning)
    Write-Host "WARN $message" -ForegroundColor Yellow
    if ($warning) { Write-Host "  Warning: $warning" -ForegroundColor Yellow }
    $script:WARNINGS++
}

# 1. Check Required Files
Write-Host "1. Checking Required Files..." -ForegroundColor Blue

$requiredFiles = @{
    "package.json" = "Cannot build without package.json";
    "drizzle.config.ts" = "Database migrations will fail";
    "Dockerfile" = "Cannot build Docker image (root Dockerfile)";
    "vite.config.ts" = "Vite build will fail"
}

foreach ($file in $requiredFiles.Keys) {
    $path = Join-Path $PROJECT_ROOT $file
    if (Test-Path -LiteralPath $path) {
        Check-Pass "$file exists"
    } else {
        Check-Fail "$file missing" $requiredFiles[$file]
    }
}

$requiredDirs = @{
    "server" = "Cannot build server";
    "client" = "Cannot build client";
    "shared" = "Shared types/schemas missing"
}

foreach ($dir in $requiredDirs.Keys) {
    $path = Join-Path $PROJECT_ROOT $dir
    if (Test-Path $path -PathType Container) {
        Check-Pass "$dir directory exists"
    } else {
        Check-Fail "$dir directory missing" $requiredDirs[$dir]
    }
}

Write-Host ""

# 2. Check Environment Variables file
Write-Host "2. Checking Environment Variables..." -ForegroundColor Blue

$envFile = Join-Path $PROJECT_ROOT ".env"
if (Test-Path -LiteralPath $envFile) {
    Check-Pass ".env file exists"

    $envVars = Get-Content $envFile | Where-Object { $_ -match '^[^#\s]' } | ForEach-Object {
        if ($_ -match '^(?<key>[^=]+)=(?<val>.*)$') {
            @{ Key = $Matches['key']; Value = $Matches['val'] }
        }
    }

    $required = @("DATABASE_URL", "OPENAI_API_KEY", "SESSION_SECRET", "JWT_SECRET")
    foreach ($var in $required) {
        $found = $envVars | Where-Object { $_.Key -eq $var }
        if ($found -and $found.Value) {
            Check-Pass "$var is set"
        } else {
            Check-Warn "$var missing" "Application requires this variable in production"
        }
    }
} else {
    Check-Warn ".env file missing" "Create .env file or ensure platform provides env vars"
}

Write-Host ""

# 3. Check Build Outputs
Write-Host "3. Checking Build Outputs..." -ForegroundColor Blue

$clientDist = Join-Path $PROJECT_ROOT "client\dist\index.html"
if (Test-Path -LiteralPath $clientDist) {
    Check-Pass "client build output exists"
} else {
    Check-Warn "client build missing" "Run 'npm run build' to build client"
}

$serverDist = Join-Path $PROJECT_ROOT "dist\index.js"
if (Test-Path -LiteralPath $serverDist) {
    Check-Pass "server build output exists"
} else {
    Check-Warn "server build missing" "Run 'npm run build' to build server"
}

Write-Host ""

# 4. Check Docker
Write-Host "4. Checking Docker..." -ForegroundColor Blue

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Check-Pass "Docker is installed"
    try {
        docker info | Out-Null
        Check-Pass "Docker daemon is running"
    } catch {
        Check-Fail "Docker daemon not running" "Start Docker Desktop"
    }
} else {
    Check-Fail "Docker not installed" "Install Docker to deploy"
}

Write-Host ""

# 5. Check Git Status
Write-Host "5. Checking Git Status..." -ForegroundColor Blue

$gitDir = Join-Path $PROJECT_ROOT ".git"
if (Test-Path -LiteralPath $gitDir) {
    Check-Pass "Git repository exists"

    Push-Location $PROJECT_ROOT
    $status = git status --porcelain
    if ($status) {
        Check-Warn "Uncommitted changes detected" "Commit or stash changes before deploying"
    } else {
        Check-Pass "No uncommitted changes"
    }

    $branch = git branch --show-current
    if ($branch -eq "main" -or $branch -eq "master") {
        Check-Pass "On main branch"
    } else {
        Check-Warn "Not on main branch (current: $branch)" "Deploy from main/master for production"
    }
    Pop-Location
} else {
    Check-Warn "Not a git repository" "Version control is recommended"
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Deployment Verification Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ("Passed:   {0}" -f $CHECKS_PASSED) -ForegroundColor Green
Write-Host ("Failed:   {0}" -f $CHECKS_FAILED) -ForegroundColor Red
Write-Host ("Warnings: {0}" -f $WARNINGS) -ForegroundColor Yellow
Write-Host ""

if ($CHECKS_FAILED -gt 0) {
    Write-Host "Deployment verification FAILED" -ForegroundColor Red
    Write-Host "Fix the errors above before deploying" -ForegroundColor Red
    exit 1
} elseif ($WARNINGS -gt 0) {
    Write-Host "Deployment verification PASSED with warnings" -ForegroundColor Yellow
    Write-Host "Review the warnings above before deploying" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "Deployment verification PASSED" -ForegroundColor Green
    Write-Host "Ready to deploy" -ForegroundColor Green
    exit 0
}
