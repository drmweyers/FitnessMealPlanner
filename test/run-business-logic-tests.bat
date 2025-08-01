@echo off
REM 🧪 Business Logic Test Runner Script (Windows)
REM Quick script to run all business logic tests

echo 🚀 FitnessMealPlanner Business Logic Test Suite
echo ==============================================
echo.

REM Check if Docker is running
echo 🔍 Checking prerequisites...
docker ps | findstr "fitnessmealplanner-dev" >nul
if %errorlevel% neq 0 (
    echo ❌ Development server not running!
    echo Please start it first: docker-compose --profile dev up -d
    exit /b 1
)
echo ✅ Development server is running
echo.

REM Run API tests
echo 🧪 Running API-based business logic tests...
echo --------------------------------------------
node test/e2e/business-logic-simple.test.js
echo.

REM Run Playwright visual tests  
echo 🎭 Running Playwright visual tests...
echo ------------------------------------
npm run test:business-logic:simple

echo.
echo 🎉 Business logic test execution complete!
echo Check the output above for detailed results.