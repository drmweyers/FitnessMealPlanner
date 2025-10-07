#!/bin/bash

# Meal Plan Assignment GUI E2E Test Execution Script
# Comprehensive test runner for all meal plan assignment functionality

echo "========================================"
echo "Meal Plan Assignment E2E Test Suite"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
print_status "Checking Docker environment..."
if ! docker ps >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    echo "Run: docker-compose --profile dev up -d"
    exit 1
fi
print_success "Docker is running"

# Check if development server is running
print_status "Verifying development server..."
if ! curl -f http://localhost:4000 >/dev/null 2>&1; then
    print_warning "Development server not responding at localhost:4000"
    print_status "Starting development environment..."
    docker-compose --profile dev up -d
    print_status "Waiting for server to start..."
    sleep 10
    
    # Check again
    if ! curl -f http://localhost:4000 >/dev/null 2>&1; then
        print_error "Development server still not responding"
        print_error "Please check Docker logs: docker logs fitnessmealplanner-dev"
        exit 1
    fi
fi
print_success "Development server is running"

# Install dependencies if needed
print_status "Checking Playwright installation..."
if [ ! -f "node_modules/.bin/playwright" ]; then
    print_status "Installing Playwright..."
    npm install @playwright/test
    npx playwright install
fi
print_success "Playwright is ready"

# Create test results directories
print_status "Preparing test environment..."
mkdir -p test-screenshots
mkdir -p playwright-report
print_success "Test environment prepared"

echo ""
echo "Select test suite to run:"
echo "1. Complete Test Suite (All Tests)"
echo "2. Core Functionality Tests Only"
echo "3. Visual Regression Tests"
echo "4. Accessibility Tests"
echo "5. Performance Tests"
echo "6. Cross-Browser Tests (All Browsers)"
echo "7. Mobile/Responsive Tests"
echo "8. Debug Mode (Headed Browser)"
echo "9. Quick Smoke Test"
echo ""

read -p "Enter your choice (1-9): " choice

case $choice in
    1)
        print_status "Running Complete Meal Plan Assignment Test Suite..."
        npx playwright test test/e2e/meal-plan-assignment-* --reporter=html,list
        ;;
    2)
        print_status "Running Core Functionality Tests..."
        npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --reporter=html,list
        ;;
    3)
        print_status "Running Visual Regression Tests..."
        npx playwright test test/e2e/meal-plan-assignment-visual-regression.spec.ts --reporter=html,list
        ;;
    4)
        print_status "Running Accessibility Tests..."
        npx playwright test test/e2e/meal-plan-assignment-accessibility.spec.ts --reporter=html,list
        ;;
    5)
        print_status "Running Performance Tests..."
        npx playwright test test/e2e/meal-plan-assignment-performance.spec.ts --reporter=html,list
        ;;
    6)
        print_status "Running Cross-Browser Tests (Chromium, Firefox, WebKit)..."
        npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --project=chromium --project=firefox --project=webkit --reporter=html,list
        ;;
    7)
        print_status "Running Responsive Design Tests..."
        npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --grep="Responsive" --reporter=html,list
        ;;
    8)
        print_status "Running Tests in Debug Mode (Headed Browser)..."
        npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --headed --debug
        ;;
    9)
        print_status "Running Quick Smoke Test..."
        npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --grep="Complete trainer meal plan assignment workflow" --reporter=list
        ;;
    *)
        print_warning "Invalid choice. Running complete test suite..."
        npx playwright test test/e2e/meal-plan-assignment-* --reporter=html,list
        ;;
esac

test_exit_code=$?

echo ""
echo "========================================"
echo "Test Execution Completed"
echo "========================================"
echo ""

# Check if tests passed
if [ $test_exit_code -eq 0 ]; then
    print_success "All tests PASSED successfully!"
    echo ""
    echo "Test artifacts generated:"
    echo "- Screenshots: test-screenshots/"
    echo "- HTML Report: playwright-report/"
    echo ""
    echo "To view detailed results:"
    echo "npx playwright show-report"
else
    print_error "Some tests FAILED!"
    echo ""
    echo "Check the following for debugging:"
    echo "- Screenshots: test-screenshots/"
    echo "- HTML Report: playwright-report/"
    echo "- Console output above"
    echo ""
    echo "To view detailed results:"
    echo "npx playwright show-report"
fi

echo ""
echo "Additional commands:"
echo "- View HTML report: npx playwright show-report"
echo "- Run specific test: npx playwright test [test-file] --headed"
echo "- Debug specific test: npx playwright test [test-file] --debug"
echo "- Re-run failed tests: npx playwright test --last-failed"
echo ""

# Docker health check
print_status "Docker container health check..."
if docker ps --filter "name=fitnessmealplanner-dev" --filter "status=running" | grep -q fitnessmealplanner-dev; then
    print_success "Development container is healthy"
else
    print_warning "Development container may have issues"
    echo "Check container logs: docker logs fitnessmealplanner-dev"
fi

read -p "Open HTML report now? (y/n): " open_report
if [[ $open_report =~ ^[Yy]$ ]]; then
    npx playwright show-report
fi

echo ""
print_status "Test execution script completed."

# Exit with test result code
exit $test_exit_code