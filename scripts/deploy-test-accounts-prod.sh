#!/bin/bash

# Deploy Test Accounts to Production Script
# This script ensures test accounts are deployed to production environment
# with proper relationships between customer and trainer

echo "🚀 Deploying Test Accounts to Production Environment"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production database URL (will be set from environment or passed as argument)
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./deploy-test-accounts-prod.sh <PRODUCTION_DATABASE_URL>${NC}"
    echo -e "${YELLOW}Or set DATABASE_URL environment variable${NC}"
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}Error: No database URL provided${NC}"
        exit 1
    fi
    PROD_DB_URL=$DATABASE_URL
else
    PROD_DB_URL=$1
fi

echo -e "${GREEN}✓ Using production database${NC}"
echo ""

# Export the database URL for the TypeScript script
export DATABASE_URL=$PROD_DB_URL

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if TypeScript is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx is not available${NC}"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

echo "📦 Installing dependencies if needed..."
npm install --silent

echo ""
echo "🔧 Compiling TypeScript setup script..."
npx tsc scripts/setup-test-accounts.ts --outDir dist/scripts --module commonjs --target es2020 --esModuleInterop --skipLibCheck

echo ""
echo "🚀 Running test account setup..."
echo "================================"
node dist/scripts/setup-test-accounts.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS: Test accounts deployed to production!${NC}"
    echo ""
    echo "📋 Quick Reference:"
    echo "==================="
    echo "Admin:    admin@fitmeal.pro / AdminPass123"
    echo "Trainer:  trainer.test@evofitmeals.com / TestTrainer123!"
    echo "Customer: customer.test@evofitmeals.com / TestCustomer123!"
    echo ""
    echo -e "${GREEN}✓ Customer is linked to Trainer${NC}"
else
    echo ""
    echo -e "${RED}❌ ERROR: Failed to deploy test accounts${NC}"
    exit 1
fi