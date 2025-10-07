@echo off
REM Meal Plan Assignment GUI E2E Test Execution Script
REM Comprehensive test runner for all meal plan assignment functionality

echo ========================================
echo Meal Plan Assignment E2E Test Suite
echo ========================================
echo.

REM Check if Docker is running
echo [1/5] Checking Docker environment...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker first.
    echo Run: docker-compose --profile dev up -d
    pause
    exit /b 1
)

REM Check if development server is running
echo [2/5] Verifying development server...
curl -f http://localhost:4000 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Development server not responding at localhost:4000
    echo Starting development environment...
    docker-compose --profile dev up -d
    echo Waiting for server to start...
    timeout /t 10 /nobreak >nul
)

REM Install dependencies if needed
echo [3/5] Checking Playwright installation...
if not exist "node_modules\.bin\playwright.cmd" (
    echo Installing Playwright...
    npm install @playwright/test
    npx playwright install
)

REM Create test results directory
echo [4/5] Preparing test environment...
if not exist "test-screenshots" mkdir test-screenshots
if not exist "playwright-report" mkdir playwright-report

echo [5/5] Running Meal Plan Assignment E2E Tests...
echo.

REM Menu for test selection
echo Select test suite to run:
echo 1. Complete Test Suite (All Tests)
echo 2. Core Functionality Tests Only
echo 3. Visual Regression Tests
echo 4. Accessibility Tests
echo 5. Performance Tests
echo 6. Cross-Browser Tests (All Browsers)
echo 7. Mobile/Responsive Tests
echo 8. Debug Mode (Headed Browser)
echo 9. Quick Smoke Test
echo.

set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto run_all_tests
if "%choice%"=="2" goto run_core_tests
if "%choice%"=="3" goto run_visual_tests
if "%choice%"=="4" goto run_accessibility_tests
if "%choice%"=="5" goto run_performance_tests
if "%choice%"=="6" goto run_cross_browser_tests
if "%choice%"=="7" goto run_responsive_tests
if "%choice%"=="8" goto run_debug_tests
if "%choice%"=="9" goto run_smoke_tests

echo Invalid choice. Running complete test suite...
goto run_all_tests

:run_all_tests
echo Running Complete Meal Plan Assignment Test Suite...
npx playwright test test/e2e/meal-plan-assignment-* --reporter=html,list
goto show_results

:run_core_tests
echo Running Core Functionality Tests...
npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --reporter=html,list
goto show_results

:run_visual_tests
echo Running Visual Regression Tests...
npx playwright test test/e2e/meal-plan-assignment-visual-regression.spec.ts --reporter=html,list
goto show_results

:run_accessibility_tests
echo Running Accessibility Tests...
npx playwright test test/e2e/meal-plan-assignment-accessibility.spec.ts --reporter=html,list
goto show_results

:run_performance_tests
echo Running Performance Tests...
npx playwright test test/e2e/meal-plan-assignment-performance.spec.ts --reporter=html,list
goto show_results

:run_cross_browser_tests
echo Running Cross-Browser Tests (Chromium, Firefox, WebKit)...
npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --project=chromium --project=firefox --project=webkit --reporter=html,list
goto show_results

:run_responsive_tests
echo Running Responsive Design Tests...
npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --grep="Responsive" --reporter=html,list
goto show_results

:run_debug_tests
echo Running Tests in Debug Mode (Headed Browser)...
npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --headed --debug
goto show_results

:run_smoke_tests
echo Running Quick Smoke Test...
npx playwright test test/e2e/meal-plan-assignment-comprehensive.spec.ts --grep="Complete trainer meal plan assignment workflow" --reporter=list
goto show_results

:show_results
echo.
echo ========================================
echo Test Execution Completed
echo ========================================
echo.

REM Check if tests passed
if %errorlevel% equ 0 (
    echo ✅ All tests PASSED successfully!
    echo.
    echo Test artifacts generated:
    echo - Screenshots: test-screenshots/
    echo - HTML Report: playwright-report/
    echo.
    echo To view detailed results:
    echo npx playwright show-report
) else (
    echo ❌ Some tests FAILED!
    echo.
    echo Check the following for debugging:
    echo - Screenshots: test-screenshots/
    echo - HTML Report: playwright-report/
    echo - Console output above
    echo.
    echo To view detailed results:
    echo npx playwright show-report
)

echo.
echo Additional commands:
echo - View HTML report: npx playwright show-report
echo - Run specific test: npx playwright test [test-file] --headed
echo - Debug specific test: npx playwright test [test-file] --debug
echo.

set /p open_report="Open HTML report now? (y/n): "
if /i "%open_report%"=="y" (
    npx playwright show-report
)

echo.
echo Test execution script completed.
pause