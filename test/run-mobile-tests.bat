@echo off
echo ========================================
echo Running Comprehensive Mobile Test Suite
echo ========================================

echo.
echo Starting Docker development environment...
docker-compose --profile dev up -d

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak

echo.
echo ========================================
echo Running Mobile Unit Tests
echo ========================================
npm test -- test/unit/mobile-comprehensive.test.tsx

echo.
echo ========================================
echo Running Mobile Playwright E2E Tests
echo ========================================
npx playwright test test/e2e/mobile-full-app.spec.ts

echo.
echo ========================================
echo Running Cross-Device Tests
echo ========================================
npx playwright test test/e2e/mobile-cross-device.spec.ts

echo.
echo ========================================
echo Running Mobile Performance Tests
echo ========================================
npx playwright test test/e2e/mobile-performance.spec.ts

echo.
echo ========================================
echo Mobile Test Suite Complete
echo ========================================

echo.
echo Stopping Docker development environment...
docker-compose --profile dev down

echo.
echo Test execution finished. Check results above.
pause