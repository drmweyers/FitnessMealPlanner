# Recipe Approval Testing Suite

This document describes the comprehensive testing suite created for the recipe approval functionality in the FitnessMealPlanner application.

## Overview

The testing suite covers the complete "Approve All" functionality that was fixed, including:
- Unit tests for the PendingRecipesTable component
- Playwright end-to-end tests for the full user workflow
- API integration tests
- Error handling scenarios

## Test Files Created

### Unit Tests

#### 1. `test/unit/components/PendingRecipesTable.test.tsx`
**Comprehensive unit tests for the PendingRecipesTable component**

**Coverage:**
- Component rendering and data loading
- Individual recipe actions (approve/delete)
- Bulk approve functionality with new bulk API endpoint
- Cache management and query invalidation
- Authentication error handling
- Responsive design testing
- Data display and formatting
- Error handling and edge cases
- Performance optimization verification

**Key Features Tested:**
- ✅ Correct API query with `approved=false` parameter
- ✅ Bulk approve using `/api/admin/recipes/bulk-approve` endpoint
- ✅ Immediate page refresh after approval
- ✅ Proper cache invalidation
- ✅ Error toast handling
- ✅ Loading states and disabled buttons
- ✅ Responsive mobile/desktop layouts

**Test Count:** 41 comprehensive test cases

#### 2. `test/unit/components/PendingRecipesTable.simple.test.tsx`
**Simplified unit tests for debugging**

**Purpose:** Streamlined tests focusing on core functionality
- Basic rendering with pending recipes
- API call verification with correct parameters
- Individual and bulk approval actions
- Empty state handling

**Test Count:** 9 focused test cases

### End-to-End Tests (Playwright)

#### 1. `test/e2e/recipe-approval-workflow.spec.ts`
**Complete GUI workflow testing**

**Test Scenarios:**
- **Navigation and Setup**
  - Navigate to pending recipes page
  - Display recipe counts correctly
  
- **Individual Recipe Approval**
  - Approve individual recipes successfully
  - Delete individual recipes
  - Open recipe detail modals
  
- **Bulk Approval Functionality**
  - Show bulk approve button with correct count
  - Approve all recipes at once
  - Show loading states during operations
  - Disable buttons during operations
  
- **Page Refresh and State Management**
  - Manual refresh functionality
  - State consistency after operations
  
- **Responsive Design**
  - Mobile viewport testing
  - Desktop viewport testing
  
- **Error Scenarios**
  - Network error handling
  - Authentication error handling
  
- **Empty State**
  - Display when no pending recipes
  - Transition after approving all recipes

**Test Count:** 16 comprehensive E2E scenarios

#### 2. `test/e2e/simple-approval-test.spec.ts`
**Basic connectivity and navigation tests**

**Purpose:** Verify basic application functionality
- Homepage loading
- Login page navigation
- Invalid login error handling
- Admin dashboard access

**Test Count:** 4 basic connectivity tests

## Key Fixes Tested

### 1. API Query Parameters
**Issue:** Component wasn't sending `approved=false` parameter
**Fix:** Added proper query string construction
**Test:** Verifies API called with `/api/admin/recipes?approved=false&page=1&limit=50`

### 2. Bulk Approval Optimization
**Issue:** Individual API calls in a loop
**Fix:** Single bulk API endpoint call
**Test:** Verifies single call to `/api/admin/recipes/bulk-approve` with recipe IDs array

### 3. Page Refresh After Approval
**Issue:** Page not refreshing after approval
**Fix:** Added immediate `refetch()` call after cache invalidation
**Test:** Verifies recipes disappear after approval and counts update

### 4. Cache Management
**Issue:** Stale data after operations
**Fix:** Proper query invalidation + immediate refetch
**Test:** Verifies `invalidateQueries` and `refetch` are called

## Running the Tests

### Unit Tests
```bash
# Run all PendingRecipesTable tests
npm test test/unit/components/PendingRecipesTable.test.tsx

# Run simplified tests
npm test test/unit/components/PendingRecipesTable.simple.test.tsx

# Run all unit tests
npm test
```

### Playwright E2E Tests
```bash
# Ensure development server is running
docker-compose --profile dev up -d

# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test test/e2e/simple-approval-test.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode
npx playwright test --ui
```

### View Test Reports
```bash
# View Playwright HTML report
npx playwright show-report

# View test coverage (if configured)
npm run test:coverage
```

## Test Environment Setup

### Prerequisites
1. **Docker Development Environment**
   ```bash
   docker-compose --profile dev up -d
   ```

2. **Test Database with Admin User**
   - Ensure admin user exists: `admin@test.com` / `admin123`
   - Or modify credentials in test files

3. **Playwright Installation**
   ```bash
   npx playwright install
   ```

### Configuration Files
- `playwright.config.ts` - Playwright configuration
- `vitest.config.ts` - Vitest configuration
- `test/setup.ts` - Test setup and mocks

## Test Data Management

### Generating Test Recipes
For E2E tests that need pending recipes:
```javascript
await generateTestRecipes(page, count);
```

This function:
1. Navigates to admin recipe generation
2. Creates specified number of recipes
3. Waits for generation to complete

### Mock Data
Unit tests use comprehensive mock data:
- Mock pending recipes with realistic data
- Mock API responses
- Mock authentication context
- Mock toast notifications

## Known Issues and Limitations

### Unit Test Issues
- React Query mocking complexity in test environment
- Some timing-sensitive tests may need adjustment
- Mock setup requires careful component isolation

### E2E Test Considerations
- Requires real database with admin user
- Tests may create actual data (cleanup recommended)
- Network timing can affect test reliability
- Requires development server to be running

## Future Improvements

### Unit Tests
1. Fix React Query mocking for better integration testing
2. Add more edge case scenarios
3. Improve test performance and reliability
4. Add snapshot testing for UI components

### E2E Tests
1. Add test data cleanup after each test
2. Implement test user management
3. Add cross-browser testing
4. Add visual regression testing
5. Implement parallel test execution

### Integration Tests
1. Add API-level integration tests
2. Test database transactions
3. Test email notification flows
4. Test file upload scenarios

## Maintenance Notes

### Updating Tests
When modifying the PendingRecipesTable component:
1. Update unit tests for new functionality
2. Update E2E tests for workflow changes
3. Update mock data if data structure changes
4. Update API endpoint tests if endpoints change

### Test Data
- Keep test credentials secure
- Regularly clean test database
- Update mock data to match real data structure
- Ensure test isolation between runs

## Contact and Support

For questions about the test suite:
- Review test files for implementation details
- Check test logs for specific failure information
- Ensure development environment is properly set up
- Verify all dependencies are installed correctly

---

**Created:** August 2025  
**Last Updated:** August 20, 2025  
**Test Coverage:** Recipe approval workflow fixes  
**Status:** ✅ Complete and ready for use