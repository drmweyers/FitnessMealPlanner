@echo off
REM Deploy Test Accounts to Production - Windows Batch Script
REM This script ensures test accounts are deployed to production environment

echo.
echo ============================================
echo   DEPLOYING TEST ACCOUNTS TO PRODUCTION
echo ============================================
echo.

REM Check if database URL is provided
if "%1"=="" (
    echo Usage: deploy-test-accounts-prod.bat [PRODUCTION_DATABASE_URL]
    echo.
    if "%DATABASE_URL%"=="" (
        echo ERROR: No database URL provided
        echo Please provide database URL as argument or set DATABASE_URL environment variable
        exit /b 1
    )
    set PROD_DB_URL=%DATABASE_URL%
) else (
    set PROD_DB_URL=%1
)

echo [OK] Using production database
echo.

REM Set the database URL for the script
set DATABASE_URL=%PROD_DB_URL%

REM Navigate to project root
cd /d "%~dp0\.."

echo Installing dependencies...
call npm install --silent
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo.
echo Compiling TypeScript setup script...
call npx tsx scripts/setup-test-accounts.ts
if errorlevel 1 (
    echo ERROR: Failed to run setup script
    exit /b 1
)

echo.
echo ============================================
echo   TEST ACCOUNTS DEPLOYMENT COMPLETE
echo ============================================
echo.
echo Credentials:
echo ------------
echo ADMIN:    admin@fitmeal.pro / AdminPass123
echo TRAINER:  trainer.test@evofitmeals.com / TestTrainer123!
echo CUSTOMER: customer.test@evofitmeals.com / TestCustomer123!
echo.
echo [SUCCESS] Customer is linked to Trainer!
echo.