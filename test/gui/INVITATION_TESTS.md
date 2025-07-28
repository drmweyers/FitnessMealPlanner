# Customer Invitation Feature Tests

This document describes the automated tests for the customer invitation feature that was fixed to resolve the "unexpected token Doc Type is not a valid JSON" error.

## Test Coverage

### End-to-End Tests (`customer-invitation.test.ts`)

#### 1. Complete Invitation Flow Test
- ✅ Registers a new trainer account
- ✅ Navigates to trainer profile page
- ✅ Opens the invitation modal
- ✅ Fills out customer email and message
- ✅ Sends the invitation
- ✅ Verifies success notification
- ✅ Confirms invitation appears in recent invitations list
- ✅ Validates API calls were made correctly

#### 2. Form Validation Tests
- ✅ Tests empty email validation
- ✅ Tests invalid email format validation
- ✅ Verifies error messages are displayed

#### 3. Duplicate Invitation Handling
- ✅ Sends initial invitation successfully
- ✅ Attempts to send duplicate invitation
- ✅ Verifies duplicate prevention error message

#### 4. Visual Regression Tests
- ✅ Takes screenshots of invitation modal
- ✅ Compares against baseline images

## Running the Tests

### Quick Test (Invitation Feature Only)
```bash
npm run test:invitation
```

### All GUI Tests
```bash
npm run test:gui
```

### With Test Runner (Detailed Reports)
```bash
npm run test:gui:runner
```

## Prerequisites

1. **Application Running**: The app must be running at `http://localhost:4000`
   ```bash
   cd FitnessMealPlanner
   docker-compose --profile dev up
   ```

2. **Database Access**: Tests create temporary trainer accounts, so database must be accessible

3. **Browser Dependencies**: Puppeteer will download Chromium automatically

## Test Environment

- **Browser**: Chromium (via Puppeteer)
- **Headless Mode**: Configurable (disabled by default for debugging)
- **Screenshots**: Saved to `test/gui/screenshots/`
- **Reports**: Generated in `test/gui/reports/`

## What Was Fixed

The customer invitation feature was failing with:
```
"unexpected token Doc Type is not a valid JSON"
```

**Root Cause**: The invitation API routes (`/api/invitations/*`) were not registered in the server configuration, causing requests to be handled by the frontend Vite dev server instead of the backend API.

**Fix Applied**:
1. Added `import invitationRouter from './invitationRoutes';` to `server/index.ts`
2. Added `app.use('/api/invitations', invitationRouter);` to register the routes

**Tests Verify**:
- ✅ API endpoints return JSON instead of HTML
- ✅ Invitation send functionality works end-to-end
- ✅ Success notifications are displayed
- ✅ Error handling works correctly

## Test Results Interpretation

### Success Indicators
- All tests pass with green checkmarks
- API calls return proper JSON responses
- UI interactions work smoothly
- No "JSON parsing" errors occur

### Failure Indicators
- Red X marks in test output
- Screenshots saved to help debug issues
- Detailed error messages in reports
- Network request logs for API debugging

## Debugging Failed Tests

1. **Check Application Health**:
   ```bash
   curl http://localhost:4000/health
   ```

2. **View Screenshots**: Look in `test/gui/screenshots/actual/` for visual debugging

3. **Check Network Logs**: Tests capture all API requests for inspection

4. **Run in Non-Headless Mode**: Set `headless: false` in test config to watch tests run

## Adding New Invitation Tests

To add more invitation-related tests:

1. Add test cases to `customer-invitation.test.ts`
2. Use existing helper functions:
   - `BrowserUtils` for common browser operations
   - `VisualTesting` for screenshot comparisons
3. Follow the existing test structure for consistency

## Integration with CI/CD

These tests are designed to run in CI environments:
- Set `CI=true` environment variable for headless mode
- Tests will exit with proper error codes for build failures
- Screenshots and reports are generated for debugging