#!/bin/bash

# 🧪 Business Logic Test Runner Script
# Quick script to run all business logic tests

echo "🚀 FitnessMealPlanner Business Logic Test Suite"
echo "=============================================="
echo

# Check if Docker is running
echo "🔍 Checking prerequisites..."
if ! docker ps | grep -q "fitnessmealplanner-dev"; then
    echo "❌ Development server not running!"
    echo "Please start it first: docker-compose --profile dev up -d"
    exit 1
fi
echo "✅ Development server is running"
echo

# Run API tests
echo "🧪 Running API-based business logic tests..."
echo "--------------------------------------------"
node test/e2e/business-logic-simple.test.js
echo

# Run Playwright visual tests  
echo "🎭 Running Playwright visual tests..."
echo "------------------------------------"
npm run test:business-logic:simple

echo
echo "🎉 Business logic test execution complete!"
echo "Check the output above for detailed results."