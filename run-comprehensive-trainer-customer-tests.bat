@echo off
echo ========================================
echo FitnessMealPlanner Comprehensive Testing
echo Trainer-Customer Interaction Test Suite
echo ========================================
echo.

:: Check if Docker is running
echo [1/6] Checking Docker status...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running! Please start Docker Desktop.
    echo    Run: docker-compose --profile dev up -d
    pause
    exit /b 1
)
echo ✅ Docker is running

:: Check if development server is accessible
echo.
echo [2/6] Checking development server...
curl -s http://localhost:4000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Development server not accessible at http://localhost:4000
    echo    Please ensure the development server is running:
    echo    docker-compose --profile dev up -d
    pause
    exit /b 1
)
echo ✅ Development server is accessible

:: Install dependencies if needed
echo.
echo [3/6] Checking test dependencies...
if not exist node_modules\@playwright\test (
    echo Installing Playwright...
    npm install @playwright/test
    npx playwright install
)
echo ✅ Test dependencies ready

:: Create test results directory
echo.
echo [4/6] Preparing test environment...
if not exist test-results-comprehensive mkdir test-results-comprehensive
if not exist test-screenshots mkdir test-screenshots
echo ✅ Test directories ready

:: Run comprehensive test suite
echo.
echo [5/6] Running comprehensive trainer-customer tests...
echo.
echo Running Test Suite 1: Trainer-Customer Comprehensive Tests
echo =========================================================
npx playwright test test/e2e/trainer-customer-comprehensive.spec.ts --reporter=html --reporter=list

echo.
echo Running Test Suite 2: Customer Invitation Workflow Tests  
echo ========================================================
npx playwright test test/e2e/customer-invitation-workflow.spec.ts --reporter=html --reporter=list

echo.
echo Running Test Suite 3: Performance and Load Tests
echo ===============================================
npx playwright test test/e2e/performance-load-tests.spec.ts --reporter=html --reporter=list

:: Generate comprehensive report
echo.
echo [6/6] Generating comprehensive test report...

:: Create summary report
echo. > test-results-comprehensive\execution-summary.txt
echo FitnessMealPlanner - Comprehensive Test Execution Summary >> test-results-comprehensive\execution-summary.txt
echo Execution Date: %date% %time% >> test-results-comprehensive\execution-summary.txt
echo. >> test-results-comprehensive\execution-summary.txt

echo Test Suites Executed: >> test-results-comprehensive\execution-summary.txt
echo 1. Trainer-Customer Comprehensive Tests >> test-results-comprehensive\execution-summary.txt
echo 2. Customer Invitation Workflow Tests >> test-results-comprehensive\execution-summary.txt  
echo 3. Performance and Load Tests >> test-results-comprehensive\execution-summary.txt
echo. >> test-results-comprehensive\execution-summary.txt

echo Test Accounts Used: >> test-results-comprehensive\execution-summary.txt
echo - Admin: admin@fitmeal.pro >> test-results-comprehensive\execution-summary.txt
echo - Trainer: trainer.test@evofitmeals.com >> test-results-comprehensive\execution-summary.txt
echo - Customer: customer.test@evofitmeals.com >> test-results-comprehensive\execution-summary.txt
echo. >> test-results-comprehensive\execution-summary.txt

echo Test Environment: >> test-results-comprehensive\execution-summary.txt
echo - Base URL: http://localhost:4000 >> test-results-comprehensive\execution-summary.txt
echo - Browser: Chromium (headed mode) >> test-results-comprehensive\execution-summary.txt
echo - Screenshots: Enabled on failure >> test-results-comprehensive\execution-summary.txt
echo - Videos: Enabled on failure >> test-results-comprehensive\execution-summary.txt
echo. >> test-results-comprehensive\execution-summary.txt

:: Copy results to comprehensive folder
if exist playwright-report xcopy playwright-report test-results-comprehensive\html-report\ /E /I /Y >nul 2>&1
if exist test-results.json copy test-results.json test-results-comprehensive\ >nul 2>&1

echo ========================================
echo ✅ Comprehensive Test Execution Complete
echo ========================================
echo.
echo 📊 Test Results:
echo    - HTML Report: test-results-comprehensive\html-report\index.html
echo    - Screenshots: test-screenshots\
echo    - Summary: test-results-comprehensive\execution-summary.txt
echo.
echo 🔍 To view detailed results:
echo    1. Open test-results-comprehensive\html-report\index.html in browser
echo    2. Check test-screenshots\ for visual evidence
echo    3. Review execution-summary.txt for overview
echo.

:: Open HTML report automatically
if exist test-results-comprehensive\html-report\index.html (
    echo Opening HTML report...
    start test-results-comprehensive\html-report\index.html
)

echo Press any key to exit...
pause >nul