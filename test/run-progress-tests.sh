#!/bin/bash

# Recipe Generation Progress Tests Runner
# Quick script to run the new progress bar and auto-refresh E2E tests

echo "🚀 Recipe Generation Progress Tests Runner"
echo "=========================================="

# Check if Docker is running
echo "📋 Checking Docker status..."
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if development server is running
echo "📋 Checking if development server is running..."
if ! docker ps | grep -q "fitnessmealplanner-dev"; then
    echo "🔧 Starting development server..."
    docker-compose --profile dev up -d
    echo "⏳ Waiting for server to be ready..."
    sleep 10
else
    echo "✅ Development server is already running"
fi

# Verify server is responding
echo "📋 Verifying server is accessible..."
if curl -s http://localhost:4000 >/dev/null; then
    echo "✅ Server is responding at http://localhost:4000"
else
    echo "❌ Server is not responding. Please check Docker logs."
    echo "Run: docker logs fitnessmealplanner-dev"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Install Playwright if needed
echo "📦 Ensuring Playwright is installed..."
npx playwright install

# Create screenshots directory
mkdir -p test-screenshots

echo ""
echo "🎭 Running Recipe Generation Progress Tests..."
echo "============================================="

# Run the progress bar tests
echo "Test 1: Core Progress Bar Functionality"
npx playwright test recipe-generation-progress.spec.ts -t "Progress Bar Appears and Updates" --reporter=line

echo "Test 2: Sub-Step Indicators"  
npx playwright test recipe-generation-progress.spec.ts -t "Sub-Step Indicators" --reporter=line

echo "Test 3: Current Recipe Name Display"
npx playwright test recipe-generation-progress.spec.ts -t "Current Recipe Name" --reporter=line

echo "Test 4: ETA Calculations"
npx playwright test recipe-generation-progress.spec.ts -t "ETA Calculations" --reporter=line

echo "Test 5: Error Handling"
npx playwright test recipe-generation-progress.spec.ts -t "Error Handling in Progress" --reporter=line

echo "Test 6: Auto-Refresh Functionality"
npx playwright test recipe-generation-progress.spec.ts -t "Auto-Refresh" --reporter=line

echo "Test 7: Form Controls Disabled"
npx playwright test recipe-generation-progress.spec.ts -t "Form Controls Disabled" --reporter=line

echo "Test 8: Large Batch Performance"
npx playwright test recipe-generation-progress.spec.ts -t "Large Batch" --reporter=line

echo ""
echo "📱 Running Responsive & Accessibility Tests..."
echo "=============================================="

echo "Test 9: Mobile Progress Testing"
npx playwright test recipe-generation-progress.spec.ts -t "Mobile Progress" --reporter=line

echo "Test 10: Accessibility Testing"
npx playwright test recipe-generation-progress.spec.ts -t "Accessibility" --reporter=line

echo ""
echo "⚠️  Running Error Scenario Tests..."
echo "==================================="

echo "Test 11: Network Error Handling"
npx playwright test recipe-generation-progress.spec.ts -t "Network Error" --reporter=line

echo "Test 12: Concurrent Generation Testing"
npx playwright test recipe-generation-progress.spec.ts -t "Concurrent Generation" --reporter=line

echo ""
echo "📊 Generating Test Report..."
echo "============================"

# Run all tests with HTML reporter
npx playwright test recipe-generation-progress.spec.ts --reporter=html

echo ""
echo "✅ Test Execution Complete!"
echo "=========================="
echo ""
echo "📁 Test artifacts:"
echo "  - Screenshots: ./test-screenshots/"
echo "  - HTML Report: ./playwright-report/index.html"
echo "  - Video recordings: ./test-results/ (if enabled)"
echo ""
echo "🌐 To view the HTML report:"
echo "  npx playwright show-report"
echo ""
echo "🔍 To view server logs:"
echo "  docker logs fitnessmealplanner-dev -f"
echo ""
echo "🛑 To stop development server:"
echo "  docker-compose --profile dev down"
echo ""

# Optional: Open report in browser
read -p "📖 Open test report in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx playwright show-report
fi