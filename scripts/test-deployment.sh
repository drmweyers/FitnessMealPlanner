#!/bin/bash

# FitMeal Pro - Automated Deployment Test Script
# This script simulates a full deployment to catch issues before they happen

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEST_FAILED=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FitMeal Pro Deployment Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    echo -e "  ${RED}Error: $2${NC}"
    TEST_FAILED=1
}

test_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Change to project root
cd "$PROJECT_ROOT"

# 1. Clean Build Test
echo -e "${BLUE}1. Testing Clean Build...${NC}"
test_info "Removing existing builds"
rm -rf dist client/dist 2>/dev/null || true

test_info "Running npm install"
if npm install --silent; then
    test_pass "Dependencies installed"
else
    test_fail "npm install failed" "Check package.json and npm logs"
    exit 1
fi

test_info "Building application"
if npm run build; then
    test_pass "Build completed successfully"
else
    test_fail "Build failed" "Check TypeScript errors and build logs"
    exit 1
fi

# Verify build outputs
if [ -f "dist/index.js" ]; then
    test_pass "Server build output exists (dist/index.js)"
else
    test_fail "Server build missing" "dist/index.js not found"
    exit 1
fi

if [ -f "client/dist/index.html" ]; then
    test_pass "Client build output exists (client/dist/index.html)"
else
    test_fail "Client build missing" "client/dist/index.html not found"
    exit 1
fi

# Check build size
server_size=$(wc -c < "dist/index.js")
if [ "$server_size" -gt 1000 ]; then
    test_pass "Server build size looks reasonable ($(numfmt --to=iec-i --suffix=B $server_size))"
else
    test_fail "Server build too small" "Build may be incomplete"
fi

echo ""

# 2. Docker Build Test
echo -e "${BLUE}2. Testing Docker Build...${NC}"

if ! command -v docker &> /dev/null; then
    test_fail "Docker not installed" "Install Docker to continue"
    exit 1
fi

if ! docker info &> /dev/null; then
    test_fail "Docker daemon not running" "Start Docker Desktop"
    exit 1
fi

test_info "Building Docker image (production target)"
if docker build --target prod -t fitmeal-deployment-test:latest . --progress=plain 2>&1 | tee /tmp/docker-build.log; then
    test_pass "Docker build succeeded"
else
    test_fail "Docker build failed" "Check Docker logs above"
    echo ""
    echo -e "${YELLOW}Common Docker build issues:${NC}"
    echo "  - drizzle.config.ts not copied"
    echo "  - client/dist not copied"
    echo "  - server/views not copied"
    echo "  - Dependencies not installing"
    exit 1
fi

echo ""

# 3. Container Verification Test
echo -e "${BLUE}3. Testing Container Integrity...${NC}"

test_info "Verifying files inside container"

# Check drizzle.config.ts
if docker run --rm fitmeal-deployment-test:latest ls drizzle.config.ts &> /dev/null; then
    test_pass "drizzle.config.ts exists in container"
else
    test_fail "drizzle.config.ts missing in container" "Update Dockerfile to copy it"
fi

# Check server build
if docker run --rm fitmeal-deployment-test:latest ls dist/index.js &> /dev/null; then
    test_pass "dist/index.js exists in container"
else
    test_fail "dist/index.js missing in container" "Server build not copied"
fi

# Check client build
if docker run --rm fitmeal-deployment-test:latest ls client/dist/index.html &> /dev/null; then
    test_pass "client/dist/index.html exists in container"
else
    test_fail "client/dist/index.html missing in container" "Client build not copied"
fi

# Check shared directory
if docker run --rm fitmeal-deployment-test:latest ls shared/schema.ts &> /dev/null; then
    test_pass "shared/schema.ts exists in container"
else
    test_fail "shared directory missing in container" "Shared types not copied"
fi

# Check node_modules
if docker run --rm fitmeal-deployment-test:latest ls node_modules/express &> /dev/null; then
    test_pass "Production dependencies installed in container"
else
    test_fail "node_modules missing in container" "Dependencies not installed"
fi

echo ""

# 4. Environment Variable Test
echo -e "${BLUE}4. Testing Environment Variables...${NC}"

if [ -f ".env" ]; then
    test_pass ".env file exists"

    # Source .env
    export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true

    # Check required variables
    required_vars=("DATABASE_URL" "OPENAI_API_KEY" "SESSION_SECRET" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            test_pass "$var is set"
        else
            test_fail "$var missing" "Set in .env file"
        fi
    done
else
    test_fail ".env file missing" "Create .env with required variables"
fi

echo ""

# 5. Container Runtime Test
echo -e "${BLUE}5. Testing Container Runtime...${NC}"

test_info "Starting container with test environment"

# Create a test container
CONTAINER_ID=$(docker run -d \
    -p 5099:5001 \
    -e DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/test}" \
    -e OPENAI_API_KEY="${OPENAI_API_KEY:-test-key}" \
    -e SESSION_SECRET="test-session-secret" \
    -e JWT_SECRET="test-jwt-secret-that-is-long-enough-for-validation" \
    -e NODE_ENV="production" \
    fitmeal-deployment-test:latest 2>&1)

if [ -n "$CONTAINER_ID" ]; then
    test_pass "Container started (ID: ${CONTAINER_ID:0:12})"
else
    test_fail "Container failed to start" "Check Docker logs"
    exit 1
fi

# Wait for container to initialize
test_info "Waiting for container to initialize (10 seconds)"
sleep 10

# Check if container is still running
if docker ps | grep -q "$CONTAINER_ID"; then
    test_pass "Container is still running"
else
    test_fail "Container crashed during startup" "Check container logs below"
    echo ""
    docker logs "$CONTAINER_ID"
    docker rm -f "$CONTAINER_ID" 2>/dev/null || true
    exit 1
fi

# Check container logs for errors
test_info "Checking container logs for errors"
CONTAINER_LOGS=$(docker logs "$CONTAINER_ID" 2>&1)

if echo "$CONTAINER_LOGS" | grep -i "error" | grep -v "stderr" | grep -q ""; then
    test_fail "Errors detected in container logs" "See logs below"
    echo "$CONTAINER_LOGS" | grep -i "error" | head -10
else
    test_pass "No critical errors in container logs"
fi

# Test health endpoint
test_info "Testing health endpoint"
sleep 5  # Give server more time to start

MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_CHECK_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:5099/health &> /dev/null; then
        HEALTH_CHECK_PASSED=true
        break
    fi
    ((RETRY_COUNT++))
    test_info "Health check attempt $RETRY_COUNT/$MAX_RETRIES"
    sleep 3
done

if [ "$HEALTH_CHECK_PASSED" = true ]; then
    test_pass "Health check endpoint responding"
else
    test_fail "Health check endpoint not responding" "Server may not have started properly"
    echo ""
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs "$CONTAINER_ID"
fi

# Cleanup container
test_info "Cleaning up test container"
docker stop "$CONTAINER_ID" &> /dev/null
docker rm "$CONTAINER_ID" &> /dev/null
test_pass "Test container cleaned up"

echo ""

# 6. Database Migration Test (if DATABASE_URL is available)
echo -e "${BLUE}6. Testing Database Migrations...${NC}"

if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" != *"localhost"* ]] && [[ "$DATABASE_URL" != *"test"* ]]; then
    test_info "Skipping migration test (production database detected)"
    test_info "Run migrations manually: npm run db:push"
elif [ -n "$DATABASE_URL" ]; then
    test_info "Testing migration with drizzle-kit"
    if npx drizzle-kit push --config=./drizzle.config.ts &> /tmp/migration-test.log; then
        test_pass "Database migrations can be applied"
    else
        test_fail "Migration test failed" "Check drizzle configuration"
        cat /tmp/migration-test.log
    fi
else
    test_info "Skipping migration test (no DATABASE_URL)"
fi

echo ""

# 7. TypeScript Check
echo -e "${BLUE}7. Running TypeScript Check...${NC}"

test_info "Checking for TypeScript errors"
if npm run check 2>&1 | tee /tmp/tsc-check.log; then
    test_pass "No TypeScript errors"
else
    test_fail "TypeScript errors found" "Fix type errors before deploying"
    echo ""
    cat /tmp/tsc-check.log | tail -20
fi

echo ""

# 8. Security Checks
echo -e "${BLUE}8. Running Security Checks...${NC}"

# Check for secrets in code
test_info "Checking for hardcoded secrets"
if grep -r "sk-proj-" client/ server/ --exclude-dir=node_modules 2>/dev/null | grep -v "test-deployment.sh" | grep -q ""; then
    test_fail "API keys found in code" "Move secrets to environment variables"
else
    test_pass "No hardcoded API keys found"
fi

# Check .gitignore
if grep -q ".env" .gitignore; then
    test_pass ".env is in .gitignore"
else
    test_fail ".env not in .gitignore" "Add to prevent committing secrets"
fi

# Check for large files
test_info "Checking for large files"
LARGE_FILES=$(find . -type f -size +5M ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null)
if [ -n "$LARGE_FILES" ]; then
    test_fail "Large files detected" "Consider using .dockerignore"
    echo "$LARGE_FILES"
else
    test_pass "No large files detected"
fi

echo ""

# Cleanup
echo -e "${BLUE}9. Cleanup...${NC}"
test_info "Removing test Docker image"
docker rmi fitmeal-deployment-test:latest &> /dev/null || true
test_pass "Test image removed"

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $TEST_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All deployment tests PASSED${NC}"
    echo ""
    echo -e "${GREEN}Your application is ready for deployment!${NC}"
    echo ""
    echo -e "Next steps:"
    echo "  1. Review DEPLOYMENT_CHECKLIST.md"
    echo "  2. Deploy to dev server first"
    echo "  3. Verify dev deployment"
    echo "  4. Deploy to production"
    exit 0
else
    echo -e "${RED}❌ Deployment tests FAILED${NC}"
    echo ""
    echo -e "${RED}Fix the issues above before deploying${NC}"
    echo ""
    echo -e "Common fixes:"
    echo "  - Update Dockerfile to copy missing files"
    echo "  - Fix TypeScript errors"
    echo "  - Set required environment variables"
    echo "  - Resolve build issues"
    exit 1
fi
