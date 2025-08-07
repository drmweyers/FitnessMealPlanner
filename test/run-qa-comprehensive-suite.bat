@echo off
echo ===================================
echo   FitnessMealPlanner QA Test Suite
echo ===================================
echo.

echo [1/3] Starting Docker development environment...
docker-compose --profile dev up -d
timeout /t 10 /nobreak

echo.
echo [2/3] Running comprehensive GUI tests...
npx playwright test test/e2e/qa-ui-content-verification.spec.ts --reporter=html --output=test/reports/

echo.
echo [3/3] Test execution complete!
echo.
echo Reports available:
echo - HTML Report: npx playwright show-report
echo - Comprehensive Report: test/reports/qa-comprehensive-final-report.md
echo - Screenshots: test/screenshots/
echo.
echo Test Accounts:
echo - Trainer: trainer.test@evofitmeals.com / TestTrainer123!
echo - Customer: customer.test@evofitmeals.com / TestCustomer123!
echo.
pause