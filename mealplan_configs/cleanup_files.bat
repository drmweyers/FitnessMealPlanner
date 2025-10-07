@echo off
echo ================================================
echo Cleaning up MealPlan App - Removing health protocol features
echo ================================================
echo.

echo WARNING: This will delete health protocol related files!
echo Make sure you're in the MealPlan/FitnessMealPlanner folder before running this.
echo.
pause

echo.
echo Removing health protocol components from client...

REM Remove health protocol components
del /Q client\src\components\TrainerHealthProtocols.tsx 2>nul
del /Q client\src\components\SpecializedProtocolsPanel.tsx 2>nul
del /Q client\src\components\AdminHealthProtocolTabs.tsx 2>nul
del /Q client\src\components\HealthProtocolDashboard.tsx 2>nul
del /Q client\src\components\ProtocolGenerator.tsx 2>nul
del /Q client\src\components\ProtocolAssignment.tsx 2>nul

echo Removed health protocol components
echo.

echo Removing health protocol routes from server...

REM Remove health protocol endpoints from server routes
REM Note: We'll keep the route files but remove health protocol endpoints manually

echo Health protocol endpoints will need to be removed manually from:
echo - server\routes\trainerRoutes.ts
echo - server\routes\adminRoutes.ts
echo.

echo Removing health protocol pages...

REM Remove health protocol specific pages
del /Q client\src\pages\HealthProtocols.tsx 2>nul
del /Q client\src\pages\Protocols.tsx 2>nul

echo Removed health protocol pages
echo.

echo Removing health protocol data files...

REM Remove health protocol data
del /Q client\src\data\clientAilments.ts 2>nul
del /Q client\src\data\healthProtocols.ts 2>nul

echo Removed health protocol data files
echo.

echo Removing test and documentation files...

REM Remove health protocol test files
del /Q *health*protocol*.* 2>nul
del /Q *HEALTH*PROTOCOL*.* 2>nul
del /Q qa_health_protocol_verification.cjs 2>nul
del /Q simple_health_protocol_test.cjs 2>nul
del /Q test_health_protocol_*.* 2>nul

REM Remove health protocol specific test directories
rmdir /s /q test\unit\protocols 2>nul
rmdir /s /q test\e2e\health-protocol* 2>nul

echo Removed test files
echo.

echo ================================================
echo Cleanup completed!
echo.
echo Manual steps still needed:
echo.
echo 1. Edit server\routes\trainerRoutes.ts:
echo    - Remove health protocol endpoints
echo    - Keep meal plan and recipe endpoints
echo.
echo 2. Edit server\routes\adminRoutes.ts:
echo    - Remove health protocol admin endpoints
echo.
echo 3. Edit any remaining component imports:
echo    - Remove health protocol component imports
echo    - Update navigation menus
echo.
echo 4. Update main navigation:
echo    - Remove health protocol tabs/links
echo    - Keep meal planning navigation
echo.
echo 5. Run: docker-compose --profile dev up -d
echo.
echo ================================================

pause