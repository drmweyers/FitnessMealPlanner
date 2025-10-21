#!/bin/bash

# FitMeal Pro - Comprehensive Deployment Verification Script
# This script checks all critical deployment requirements before deploying to dev or production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FitMeal Pro Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print check result
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    echo -e "  ${RED}Error: $2${NC}"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    echo -e "  ${YELLOW}Warning: $2${NC}"
    ((WARNINGS++))
}

# 1. Check Required Files
echo -e "${BLUE}1. Checking Required Files...${NC}"

if [ -f "$PROJECT_ROOT/package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json missing" "Cannot build without package.json"
fi

if [ -f "$PROJECT_ROOT/drizzle.config.ts" ]; then
    check_pass "drizzle.config.ts exists"
else
    check_fail "drizzle.config.ts missing" "Database migrations will fail"
fi

if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_fail "Dockerfile missing" "Cannot build Docker image"
fi

if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_warn "docker-compose.yml missing" "Local deployment testing may be difficult"
fi

if [ -d "$PROJECT_ROOT/server" ]; then
    check_pass "server directory exists"
else
    check_fail "server directory missing" "Cannot build server"
fi

if [ -d "$PROJECT_ROOT/client" ]; then
    check_pass "client directory exists"
else
    check_fail "client directory missing" "Cannot build client"
fi

if [ -d "$PROJECT_ROOT/shared" ]; then
    check_pass "shared directory exists"
else
    check_fail "shared directory missing" "Shared types/schemas missing"
fi

# Check for public assets
if [ -d "$PROJECT_ROOT/client/public" ]; then
    check_pass "client/public directory exists"
else
    check_warn "client/public directory missing" "Static assets may not be available"
fi

# Check for server views (PDF templates)
if [ -d "$PROJECT_ROOT/server/views" ]; then
    check_pass "server/views directory exists"
else
    check_warn "server/views directory missing" "PDF export may not work"
fi

echo ""

# 2. Check Environment Variables
echo -e "${BLUE}2. Checking Environment Variables...${NC}"

if [ -f "$PROJECT_ROOT/.env" ]; then
    check_pass ".env file exists"

    # Load .env file
    source "$PROJECT_ROOT/.env" 2>/dev/null || true

    # Check required environment variables
    if [ -n "$DATABASE_URL" ]; then
        check_pass "DATABASE_URL is set"
    else
        check_fail "DATABASE_URL missing" "Application cannot connect to database"
    fi

    if [ -n "$OPENAI_API_KEY" ]; then
        check_pass "OPENAI_API_KEY is set"
    else
        check_fail "OPENAI_API_KEY missing" "Recipe generation will fail"
    fi

    if [ -n "$SESSION_SECRET" ]; then
        check_pass "SESSION_SECRET is set"
    else
        check_fail "SESSION_SECRET missing" "Sessions will not work properly"
    fi

    if [ -n "$JWT_SECRET" ]; then
        check_pass "JWT_SECRET is set"
    else
        check_fail "JWT_SECRET missing" "Authentication will fail"
    fi

    # Check optional but recommended variables
    if [ -n "$S3_BUCKET_NAME" ]; then
        check_pass "S3_BUCKET_NAME is set"
    else
        check_warn "S3_BUCKET_NAME missing" "Image uploads may not work"
    fi

    if [ -n "$AWS_REGION" ]; then
        check_pass "AWS_REGION is set"
    else
        check_warn "AWS_REGION missing" "S3 operations may fail"
    fi

else
    check_fail ".env file missing" "Create .env file with required variables"
fi

echo ""

# 3. Check Build Configuration
echo -e "${BLUE}3. Checking Build Configuration...${NC}"

# Check package.json scripts
if command -v jq &> /dev/null; then
    if jq -e '.scripts.build' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
        check_pass "build script exists in package.json"
    else
        check_fail "build script missing" "Cannot build application"
    fi

    if jq -e '.scripts.start' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
        check_pass "start script exists in package.json"
    else
        check_fail "start script missing" "Cannot start production server"
    fi
else
    check_warn "jq not installed" "Cannot verify package.json scripts"
fi

# Check vite config
if [ -f "$PROJECT_ROOT/vite.config.ts" ]; then
    check_pass "vite.config.ts exists"
else
    check_fail "vite.config.ts missing" "Vite build will fail"
fi

# Check tsconfig
if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
    check_pass "tsconfig.json exists"
else
    check_warn "tsconfig.json missing" "TypeScript compilation may fail"
fi

echo ""

# 4. Check Dependencies
echo -e "${BLUE}4. Checking Dependencies...${NC}"

if [ -d "$PROJECT_ROOT/node_modules" ]; then
    check_pass "node_modules directory exists"
else
    check_warn "node_modules missing" "Run 'npm install' before deploying"
fi

if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
    check_pass "package-lock.json exists"
else
    check_warn "package-lock.json missing" "Dependency versions may be inconsistent"
fi

echo ""

# 5. Check Build Outputs
echo -e "${BLUE}5. Checking Build Outputs...${NC}"

if [ -d "$PROJECT_ROOT/client/dist" ]; then
    check_pass "client/dist directory exists"

    if [ -f "$PROJECT_ROOT/client/dist/index.html" ]; then
        check_pass "client build output exists (index.html)"
    else
        check_warn "client/dist/index.html missing" "Run 'npm run build' to build client"
    fi
else
    check_warn "client/dist missing" "Run 'npm run build' to build client"
fi

if [ -d "$PROJECT_ROOT/dist" ]; then
    check_pass "dist directory exists"

    if [ -f "$PROJECT_ROOT/dist/index.js" ]; then
        check_pass "server build output exists (index.js)"
    else
        check_warn "dist/index.js missing" "Run 'npm run build' to build server"
    fi
else
    check_warn "dist directory missing" "Run 'npm run build' to build server"
fi

echo ""

# 6. Check Docker Configuration
echo -e "${BLUE}6. Checking Docker Configuration...${NC}"

if command -v docker &> /dev/null; then
    check_pass "Docker is installed"

    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        check_pass "Docker daemon is running"
    else
        check_fail "Docker daemon not running" "Start Docker Desktop"
    fi
else
    check_fail "Docker not installed" "Install Docker to deploy"
fi

# Verify Dockerfile syntax
if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
    # Check for common Dockerfile issues
    if grep -q "COPY --from=builder" "$PROJECT_ROOT/Dockerfile"; then
        check_pass "Multi-stage build configured"
    else
        check_warn "Single-stage build detected" "Consider using multi-stage builds"
    fi

    if grep -q "drizzle.config.ts" "$PROJECT_ROOT/Dockerfile"; then
        check_pass "Dockerfile copies drizzle.config.ts"
    else
        check_fail "Dockerfile missing drizzle.config.ts copy" "Add COPY for drizzle.config.ts"
    fi

    if grep -q "client/dist" "$PROJECT_ROOT/Dockerfile"; then
        check_pass "Dockerfile copies client build"
    else
        check_fail "Dockerfile missing client/dist copy" "Add COPY for client/dist"
    fi
fi

echo ""

# 7. Check Database Configuration
echo -e "${BLUE}7. Checking Database Configuration...${NC}"

if [ -f "$PROJECT_ROOT/drizzle.config.ts" ]; then
    if grep -q "DATABASE_URL" "$PROJECT_ROOT/drizzle.config.ts"; then
        check_pass "drizzle.config.ts uses DATABASE_URL"
    else
        check_fail "drizzle.config.ts missing DATABASE_URL" "Update configuration"
    fi
fi

# Check for migration files
if [ -d "$PROJECT_ROOT/migrations" ]; then
    migration_count=$(find "$PROJECT_ROOT/migrations" -name "*.sql" 2>/dev/null | wc -l)
    if [ "$migration_count" -gt 0 ]; then
        check_pass "Migration files exist ($migration_count found)"
    else
        check_warn "No migration files found" "Generate migrations with drizzle-kit"
    fi
else
    check_warn "migrations directory missing" "Generate migrations with drizzle-kit"
fi

echo ""

# 8. Check Git Status
echo -e "${BLUE}8. Checking Git Status...${NC}"

if [ -d "$PROJECT_ROOT/.git" ]; then
    check_pass "Git repository exists"

    # Check for uncommitted changes
    if git -C "$PROJECT_ROOT" diff-index --quiet HEAD -- 2>/dev/null; then
        check_pass "No uncommitted changes"
    else
        check_warn "Uncommitted changes detected" "Commit or stash changes before deploying"
    fi

    # Check current branch
    current_branch=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "unknown")
    if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
        check_pass "On main branch"
    else
        check_warn "Not on main branch (current: $current_branch)" "Deploy from main/master for production"
    fi
else
    check_warn "Not a git repository" "Version control is recommended"
fi

echo ""

# 9. Security Checks
echo -e "${BLUE}9. Running Security Checks...${NC}"

# Check for exposed secrets in code
if grep -r "sk-proj-" "$PROJECT_ROOT/client" "$PROJECT_ROOT/server" 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "scripts/verify-deployment.sh" &> /dev/null; then
    check_fail "API keys found in code" "Move API keys to environment variables"
else
    check_pass "No hardcoded API keys in code"
fi

# Check .gitignore
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
    if grep -q ".env" "$PROJECT_ROOT/.gitignore"; then
        check_pass ".env is in .gitignore"
    else
        check_fail ".env not in .gitignore" "Add .env to .gitignore"
    fi
else
    check_fail ".gitignore missing" "Create .gitignore file"
fi

# Check for production secrets in .env
if [ -f "$PROJECT_ROOT/.env" ] && [ "$DATABASE_URL" = "postgresql://postgres:postgres@localhost:5432/fitmeal" ]; then
    check_warn "Using local database URL" "Update DATABASE_URL for production deployment"
fi

echo ""

# 10. Port Availability
echo -e "${BLUE}10. Checking Port Availability...${NC}"

# Check if port 5001 is available
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_warn "Port 5001 is in use" "Stop running servers or change port"
else
    check_pass "Port 5001 is available"
fi

# Check if port 5432 is available (PostgreSQL)
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_pass "Port 5432 is in use (PostgreSQL running)"
else
    check_warn "Port 5432 is not in use" "Start PostgreSQL or verify DATABASE_URL"
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}❌ Deployment verification FAILED${NC}"
    echo -e "${RED}Fix the errors above before deploying${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Deployment verification PASSED with warnings${NC}"
    echo -e "${YELLOW}Review the warnings above before deploying${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Deployment verification PASSED${NC}"
    echo -e "${GREEN}Ready to deploy!${NC}"
    exit 0
fi
