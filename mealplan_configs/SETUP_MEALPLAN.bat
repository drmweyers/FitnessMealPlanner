@echo off
echo ========================================================
echo     FITNESS MEAL PLANNER APP - COMPLETE SETUP SCRIPT
echo ========================================================
echo.
echo This script will set up your MealPlan standalone app
echo Make sure you're in the FitnessMealPlanner folder!
echo.
echo Current directory: %CD%
echo.
echo Press CTRL+C to cancel, or
pause

echo.
echo [1/8] Copying configuration files...
echo ========================================

REM Copy root level files
copy /Y mealplan_configs\package.json package.json
copy /Y mealplan_configs\docker-compose.yml docker-compose.yml
copy /Y mealplan_configs\.env.development .env.development
copy /Y mealplan_configs\.env.production .env.production

echo Root files copied.

REM Copy client files
copy /Y mealplan_configs\vite.config.ts vite.config.ts
copy /Y mealplan_configs\client_package.json client\package.json
copy /Y mealplan_configs\App.tsx client\src\App.tsx
copy /Y mealplan_configs\MealPlanDashboard.tsx client\src\components\MealPlanDashboard.tsx

echo Client files copied.

REM Copy server files
copy /Y mealplan_configs\server_index.ts server\index.ts
copy /Y mealplan_configs\schema_index.ts server\db\schema\index.ts

echo Server files copied.
echo.

echo [2/8] Removing health protocol components...
echo ========================================

REM Remove health protocol components
del /Q client\src\components\TrainerHealthProtocols.tsx 2>nul
del /Q client\src\components\SpecializedProtocolsPanel.tsx 2>nul
del /Q client\src\components\AdminHealthProtocolTabs.tsx 2>nul
del /Q client\src\components\HealthProtocolDashboard.tsx 2>nul

echo Health protocol components removed.
echo.

echo [3/8] Removing health protocol data files...
echo ========================================

REM Remove health protocol data
del /Q client\src\data\clientAilments.ts 2>nul

echo Health protocol data files removed.
echo.

echo [4/8] Removing health protocol test files...
echo ========================================

REM Remove health protocol test files
del /Q *health*protocol*.* 2>nul
del /Q *HEALTH*PROTOCOL*.* 2>nul
del /Q qa_health_protocol_verification.cjs 2>nul
del /Q simple_health_protocol_test.cjs 2>nul
del /Q test_health_protocol_*.* 2>nul

echo Test files cleaned up.
echo.

echo [5/8] Initializing Git repository...
echo ========================================

if exist .git (
    echo Removing existing .git folder...
    rmdir /s /q .git
)
git init
git add .
git commit -m "Initial commit: FitnessMealPlanner standalone app"

echo Git repository initialized.
echo.

echo [6/8] Installing dependencies...
echo ========================================
echo This may take a few minutes...

call npm install

echo Dependencies installed.
echo.

echo [7/8] Installing client dependencies...
echo ========================================

cd client
call npm install
cd ..

echo Client dependencies installed.
echo.

echo [8/8] Starting Docker containers...
echo ========================================

docker-compose --profile dev up -d

echo.
echo ========================================================
echo       SETUP COMPLETE!
echo ========================================================
echo.
echo Your Fitness Meal Planner app is ready!
echo.
echo Access the app at: http://localhost:4000
echo.
echo Login credentials:
echo   Email: trainer.test@evofitmeals.com
echo   Password: TestTrainer123!
echo.
echo Features available:
echo   ✅ Recipe Management
echo   ✅ Meal Plan Generation
echo   ✅ Customer Meal Plans
echo   ✅ PDF Export
echo   ✅ Progress Tracking
echo   ✅ Multi-role Support
echo.
echo Commands:
echo   Start: docker-compose --profile dev up -d
echo   Stop:  docker-compose --profile dev down
echo   Logs:  docker logs mealplanner-dev -f
echo.
echo Manual cleanup still needed:
echo   1. Edit server\routes\trainerRoutes.ts - remove health protocol endpoints
echo   2. Edit server\routes\adminRoutes.ts - remove health protocol endpoints  
echo   3. Update navigation components if needed
echo.
echo ========================================================

pause