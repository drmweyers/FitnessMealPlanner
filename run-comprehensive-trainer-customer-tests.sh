#!/bin/bash

echo "========================================"
echo "FitnessMealPlanner Comprehensive Testing"
echo "Trainer-Customer Interaction Test Suite"
echo "========================================"
echo

# Check if Docker is running
echo "[1/6] Checking Docker status..."
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running! Please start Docker."
    echo "   Run: docker-compose --profile dev up -d"
    exit 1
fi
echo "✅ Docker is running"

# Check if development server is accessible
echo
echo "[2/6] Checking development server..."
if ! curl -s http://localhost:4000 >/dev/null 2>&1; then
    echo "❌ Development server not accessible at http://localhost:4000"
    echo "   Please ensure the development server is running:"
    echo "   docker-compose --profile dev up -d"
    exit 1
fi
echo "✅ Development server is accessible"

# Install dependencies if needed
echo
echo "[3/6] Checking test dependencies..."
if [ ! -d "node_modules/@playwright/test" ]; then
    echo "Installing Playwright..."
    npm install @playwright/test
    npx playwright install
fi
echo "✅ Test dependencies ready"

# Create test results directory
echo
echo "[4/6] Preparing test environment..."
mkdir -p test-results-comprehensive
mkdir -p test-screenshots
echo "✅ Test directories ready"

# Run comprehensive test suite
echo
echo "[5/6] Running comprehensive trainer-customer tests..."
echo

echo "Running Test Suite 1: Trainer-Customer Comprehensive Tests"
echo "========================================================="
npx playwright test test/e2e/trainer-customer-comprehensive.spec.ts --reporter=html --reporter=list

echo
echo "Running Test Suite 2: Customer Invitation Workflow Tests"
echo "========================================================"
npx playwright test test/e2e/customer-invitation-workflow.spec.ts --reporter=html --reporter=list

echo
echo "Running Test Suite 3: Performance and Load Tests"
echo "==============================================="
npx playwright test test/e2e/performance-load-tests.spec.ts --reporter=html --reporter=list

# Generate comprehensive report
echo
echo "[6/6] Generating comprehensive test report..."

# Create summary report
cat > test-results-comprehensive/execution-summary.txt << EOF
FitnessMealPlanner - Comprehensive Test Execution Summary
Execution Date: $(date)

Test Suites Executed:
1. Trainer-Customer Comprehensive Tests
2. Customer Invitation Workflow Tests
3. Performance and Load Tests

Test Accounts Used:
- Admin: admin@fitmeal.pro
- Trainer: trainer.test@evofitmeals.com
- Customer: customer.test@evofitmeals.com

Test Environment:
- Base URL: http://localhost:4000
- Browser: Chromium (headed mode)
- Screenshots: Enabled on failure
- Videos: Enabled on failure

EOF

# Copy results to comprehensive folder
if [ -d "playwright-report" ]; then
    cp -r playwright-report test-results-comprehensive/html-report/
fi

if [ -f "test-results.json" ]; then
    cp test-results.json test-results-comprehensive/
fi

echo "========================================"
echo "✅ Comprehensive Test Execution Complete"
echo "========================================"
echo
echo "📊 Test Results:"
echo "   - HTML Report: test-results-comprehensive/html-report/index.html"
echo "   - Screenshots: test-screenshots/"
echo "   - Summary: test-results-comprehensive/execution-summary.txt"
echo
echo "🔍 To view detailed results:"
echo "   1. Open test-results-comprehensive/html-report/index.html in browser"
echo "   2. Check test-screenshots/ for visual evidence"
echo "   3. Review execution-summary.txt for overview"
echo

# Try to open HTML report automatically (on macOS)
if [[ "$OSTYPE" == "darwin"* ]] && [ -f "test-results-comprehensive/html-report/index.html" ]; then
    echo "Opening HTML report..."
    open test-results-comprehensive/html-report/index.html
fi

# Try to open HTML report automatically (on Linux with GUI)
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ -f "test-results-comprehensive/html-report/index.html" ] && command -v xdg-open >/dev/null 2>&1; then
    echo "Opening HTML report..."
    xdg-open test-results-comprehensive/html-report/index.html
fi

echo "Test execution completed successfully! 🎉"