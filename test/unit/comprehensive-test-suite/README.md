# Comprehensive Unit Test Suite for FitnessMealPlanner

## Overview

This comprehensive unit test suite provides 50+ tests covering all major components and functionality of the FitnessMealPlanner application. The tests are organized by category and designed to provide thorough coverage of authentication, components, utilities, API integration, and form validation.

## Test Coverage

### 1. Authentication Tests (16 tests)
Located in `auth/`

#### `LoginPage.test.tsx` (16 tests)
- **Component Rendering** (4 tests)
  - Renders login form with all required elements
  - Renders responsive design elements
  - Includes proper accessibility attributes
  - Tests form structure and layout

- **Form Validation** (5 tests)
  - Validates required email field
  - Validates email format
  - Validates required password field
  - Validates minimum password length
  - Normalizes email to lowercase and trims whitespace

- **Form Submission** (4 tests)
  - Submits form with valid credentials
  - Shows loading state during submission
  - Navigates based on user role (admin, trainer, customer)
  - Tests successful form submission flow

- **Error Handling** (3 tests)
  - Displays error message on login failure
  - Clears password field on error
  - Handles network errors gracefully

#### `useAuth.test.tsx` (25 tests)
- **Hook Initialization** (4 tests)
  - Throws error when used outside AuthProvider
  - Provides default values when not authenticated
  - Loads token from localStorage on initialization
  - Sets up event listeners for cross-tab synchronization

- **User Authentication Query** (4 tests)
  - Fetches user data when token exists
  - Does not fetch when no token exists
  - Handles 401 errors by attempting token refresh
  - Clears auth state when token refresh fails

- **Login Function** (4 tests)
  - Successfully logs in user with valid credentials
  - Throws error on invalid credentials
  - Handles network errors during login
  - Validates response structure from login

- **Register Function** (2 tests)
  - Successfully registers new user
  - Handles registration errors

- **Logout Function** (2 tests)
  - Successfully logs out user
  - Clears auth state even if logout request fails

- **Error Handling** (2 tests)
  - Provides error state when user fetch fails
  - Handles malformed server responses

- **Cross-tab Synchronization** (2 tests)
  - Updates auth state when localStorage changes in another tab
  - Removes event listeners on component unmount

#### `RegisterPage.test.tsx` (20 tests)
- **Component Rendering** (4 tests)
  - Renders registration form with all required elements
  - Renders role selection dropdown
  - Includes proper accessibility attributes
  - Renders responsive design elements

- **Form Validation** (7 tests)
  - Validates required email field
  - Validates email format
  - Validates required password field
  - Validates minimum password length
  - Validates password confirmation match
  - Validates required role selection
  - Validates password strength requirements
  - Normalizes email to lowercase and trims whitespace

- **Form Submission** (3 tests)
  - Submits form with valid data for customer role
  - Submits form with valid data for trainer role
  - Shows loading state during submission
  - Navigates to correct page based on user role after registration

- **Error Handling** (6 tests)
  - Displays error message on registration failure
  - Handles network errors gracefully
  - Resets form after successful registration
  - Validates complex password requirements
  - Provides helpful feedback for password requirements

### 2. Component Tests (45 tests)
Located in `components/`

#### `CustomerProfile.test.tsx` (24 tests)
- **Component Rendering** (8 tests)
  - Renders customer profile with basic information
  - Displays customer statistics
  - Shows fitness goals as badges
  - Displays dietary restrictions
  - Shows preferred cuisines
  - Displays physical metrics
  - Shows activity level
  - Displays bio information

- **Profile Editing** (6 tests)
  - Enables edit mode when edit button is clicked
  - Shows form inputs in edit mode
  - Allows updating weight, height, age, and bio fields
  - Cancels edit mode when cancel button is clicked

- **Profile Updates** (4 tests)
  - Saves profile changes when save button is clicked
  - Shows loading state during save operation
  - Handles save errors gracefully
  - Validates numeric inputs

- **Loading States** (2 tests)
  - Shows loading spinner while fetching profile data
  - Shows skeleton loaders for different sections

- **Error Handling** (3 tests)
  - Displays error message when profile fetch fails
  - Provides retry option on fetch error
  - Handles missing profile data gracefully

- **Accessibility** (1 test)
  - Provides proper ARIA labels for interactive elements
  - Maintains focus management during edit mode transitions
  - Provides keyboard navigation support

#### `ProgressTracking.test.tsx` (30 tests)
- **Component Rendering** (4 tests)
  - Renders progress tracking with tab navigation
  - Displays measurements tab by default
  - Shows measurements data when loaded
  - Displays measurement dates correctly formatted

- **Tab Navigation** (3 tests)
  - Switches to goals tab when clicked
  - Switches to photos tab when clicked
  - Maintains proper ARIA attributes during tab switches

- **Measurements Tab Functionality** (6 tests)
  - Shows add new measurement button
  - Opens measurement dialog when add button is clicked
  - Displays measurements in descending order by date
  - Shows edit and delete options for measurements
  - Calculates and displays progress indicators

- **Goals Tab Functionality** (4 tests)
  - Displays goals with completion status
  - Shows add new goal button
  - Displays goal target dates
  - Allows marking goals as completed

- **Photos Tab Functionality** (4 tests)
  - Displays progress photos in grid layout
  - Shows upload new photo button
  - Displays photo dates correctly
  - Provides photo viewing functionality

- **Data Loading and Error Handling** (6 tests)
  - Shows loading state while fetching data
  - Handles measurements fetch error
  - Handles goals fetch error
  - Handles photos fetch error
  - Provides retry functionality on errors

- **Responsive Design** (2 tests)
  - Adapts layout for mobile screens
  - Shows appropriate mobile navigation for tabs

- **Accessibility** (1 test)
  - Provides proper ARIA labels for tabs
  - Maintains keyboard navigation between tabs
  - Provides screen reader announcements for dynamic content

#### `MealPlanGenerator.test.tsx` (25 tests)
- **Component Rendering** (4 tests)
  - Renders meal plan generator form with all required fields
  - Displays dietary restrictions checkboxes
  - Shows cuisine preference options
  - Includes activity level selection

- **Form Validation** (5 tests)
  - Validates required plan title field
  - Validates start date is not in the past
  - Validates duration is within reasonable limits
  - Validates meals per day is reasonable
  - Validates target calories is within healthy range

- **Form Interaction** (6 tests)
  - Allows entering plan title
  - Allows selecting start date
  - Allows adjusting duration with stepper controls
  - Allows selecting dietary restrictions
  - Allows selecting cuisine preferences
  - Calculates end date automatically based on start date and duration

- **Meal Plan Generation** (6 tests)
  - Generates meal plan with valid form data
  - Shows loading state during generation
  - Displays generated meal plan preview
  - Includes dietary restrictions in generation request
  - Shows save meal plan option after generation
  - Allows regenerating meal plan with different options

- **Error Handling** (3 tests)
  - Displays error message when generation fails
  - Handles insufficient recipes error
  - Provides retry option on generation failure

- **Accessibility** (1 test)
  - Provides proper labels for all form controls
  - Provides ARIA descriptions for complex controls
  - Announces generation progress to screen readers
  - Maintains keyboard navigation throughout the form

#### `RecipeCard.test.tsx` (35 tests)
- **Component Rendering** (8 tests)
  - Renders recipe card with basic information
  - Displays recipe image with proper alt text
  - Shows cooking time information
  - Displays serving information
  - Shows difficulty level
  - Renders dietary restriction badges
  - Displays recipe tags
  - Shows nutrition information

- **Interactive Elements** (5 tests)
  - Calls onClick handler when card is clicked
  - Renders favorite button and handles favorite toggle
  - Shows correct favorite button state for favorited recipe
  - Prevents event bubbling when favorite button is clicked
  - Renders selection checkbox when selectable prop is true
  - Handles recipe selection when checkbox is clicked
  - Shows selected state when recipe is selected

- **Layout Variants** (5 tests)
  - Renders in compact mode when specified
  - Renders in detailed mode by default
  - Truncates description in compact mode
  - Adapts to grid layout when specified
  - Adapts to list layout when specified

- **Content Variations** (5 tests)
  - Handles missing optional fields gracefully
  - Displays fallback image when imageUrl is missing
  - Shows multiple dietary restrictions
  - Handles long recipe titles appropriately
  - Displays recipe with no cuisine specified

- **Accessibility** (5 tests)
  - Provides proper ARIA labels for interactive elements
  - Includes proper image accessibility
  - Supports keyboard navigation
  - Provides screen reader friendly descriptions
  - Includes ARIA live regions for dynamic updates

- **Responsive Design** (3 tests)
  - Adapts to mobile viewport
  - Shows appropriate touch targets on mobile
  - Adjusts layout for tablet screens

- **Performance Considerations** (3 tests)
  - Lazy loads recipe images
  - Optimizes image sizes for different screen densities
  - Prevents unnecessary re-renders when props remain the same

- **Error Handling** (1 test)
  - Handles image loading errors gracefully
  - Handles missing recipe data gracefully
  - Provides error boundaries for component failures

#### `Layout.test.tsx` (30 tests)
- **Component Rendering** (5 tests)
  - Renders layout structure with navigation and main content
  - Displays brand logo and title
  - Shows user profile information in header
  - Displays user avatar with fallback
  - Shows user avatar image when profile picture exists

- **Navigation Menu** (15 tests)
  - Customer Navigation (3 tests)
    - Shows customer-specific menu items
    - Does not show admin-only menu items for customers
    - Does not show trainer-only menu items for customers
  - Trainer Navigation (3 tests)
    - Shows trainer-specific menu items
    - Does not show admin-only menu items for trainers
    - Does not show customer-only menu items for trainers
  - Admin Navigation (2 tests)
    - Shows admin-specific menu items
    - Shows all menu sections for admin users
  - Navigation Interactions (3 tests)
    - Navigates to correct route when menu item is clicked
    - Highlights active menu item based on current route
    - Expands and collapses menu sections

- **User Menu and Profile** (4 tests)
  - Opens user menu when avatar is clicked
  - Navigates to profile page when "View Profile" is clicked
  - Handles logout when "Sign Out" is clicked
  - Closes user menu when clicking outside

- **Responsive Design** (5 tests)
  - Shows mobile menu toggle on small screens
  - Hides navigation menu by default on mobile
  - Toggles mobile menu when hamburger button is clicked
  - Adapts header layout for mobile screens
  - Collapses navigation sections on mobile by default

- **Loading and Error States** (3 tests)
  - Shows loading skeleton when user is loading
  - Handles unauthenticated state gracefully
  - Displays error state when user loading fails

- **Accessibility** (5 tests)
  - Provides proper ARIA labels for navigation elements
  - Supports keyboard navigation through menu items
  - Provides skip link for keyboard users
  - Announces navigation changes to screen readers
  - Manages focus properly when opening/closing mobile menu

- **Performance Considerations** (3 tests)
  - Lazy loads navigation components
  - Memoizes navigation items to prevent unnecessary re-renders
  - Optimizes image loading for user avatars

### 3. Utility Function Tests (20 tests)
Located in `utils/`

#### `dateFormatting.test.ts` (20 tests)
- **formatDate** (5 tests)
  - Formats Date object with default format
  - Formats ISO string with default format
  - Formats date with custom format string
  - Returns "Invalid Date" for invalid date input
  - Handles null and undefined inputs

- **formatDateTime** (3 tests)
  - Formats date with time using default format
  - Formats ISO string with time
  - Returns "Invalid Date" for invalid input

- **formatRelativeDate** (8 tests)
  - Returns "Today" for current date
  - Returns "Yesterday" for previous day
  - Returns days ago for recent dates
  - Returns weeks ago for dates within a month
  - Returns months ago for dates within a year
  - Returns years ago for old dates
  - Handles ISO string input
  - Returns "Invalid Date" for invalid input

- **getDateRange** (4 tests)
  - Calculates date range for given start date and duration
  - Handles ISO string input
  - Returns null for invalid start date
  - Handles single day range

### 4. API Integration Tests (15 tests)
Located in `api/`

#### `queryClient.test.ts` (15 tests)
- **makeRequest** (8 tests)
  - Makes HTTP request with proper configuration
  - Includes auth token in headers when available
  - Omits auth header when no token available
  - Merges custom headers with defaults
  - Includes credentials for cross-origin requests
  - Handles network errors
  - Calls response handler with fetch response

- **HTTP Method Helpers** (4 tests)
  - GET requests with correct method
  - POST requests with correct method and body
  - PUT requests with correct method and body
  - DELETE requests with correct method

- **Query Key Factories** (3 tests)
  - Generates correct keys for recipes
  - Generates correct keys for meal plans
  - Generates correct keys for user data

### 5. Form Validation Tests (25 tests)
Located in `forms/`

#### `FormValidation.test.ts` (25 tests)
- **Authentication Validation** (12 tests)
  - Login Schema (6 tests)
    - Validates valid login credentials
    - Validates and normalizes email
    - Rejects invalid email format
    - Rejects empty email
    - Rejects short password
    - Rejects empty password
  - Registration Schema (6 tests)
    - Validates valid registration data
    - Rejects password without uppercase letter
    - Rejects password without lowercase letter
    - Rejects password without number
    - Rejects mismatched passwords
    - Rejects invalid role

- **Profile Validation** (6 tests)
  - Validates valid profile data
  - Allows empty optional fields
  - Rejects weight outside valid range
  - Rejects height outside valid range
  - Rejects age outside valid range
  - Rejects bio that is too long

- **Recipe Validation** (5 tests)
  - Validates complete recipe data
  - Rejects recipe without required fields
  - Rejects recipe with empty ingredients
  - Rejects recipe with invalid prep time
  - Rejects recipe with invalid calories

- **Utility Functions** (7 tests)
  - Validates email formats correctly
  - Validates password strength
  - Validates date ranges
  - Validates numeric ranges
  - Sanitizes input properly
  - Validates file uploads correctly

## Test Structure

```
test/unit/comprehensive-test-suite/
├── auth/
│   ├── LoginPage.test.tsx          # 16 tests
│   ├── RegisterPage.test.tsx       # 20 tests
│   └── useAuth.test.tsx           # 25 tests
├── components/
│   ├── CustomerProfile.test.tsx    # 24 tests
│   ├── Layout.test.tsx            # 30 tests
│   ├── MealPlanGenerator.test.tsx # 25 tests
│   ├── ProgressTracking.test.tsx  # 30 tests
│   └── RecipeCard.test.tsx        # 35 tests
├── utils/
│   └── dateFormatting.test.ts     # 20 tests
├── api/
│   └── queryClient.test.ts        # 15 tests
├── forms/
│   └── FormValidation.test.ts     # 25 tests
├── testRunner.ts                   # Test execution framework
└── README.md                       # This file
```

## Running the Tests

### Individual Test Suites

```bash
# Authentication tests
npm run test test/unit/comprehensive-test-suite/auth/**/*.test.{ts,tsx}

# Component tests
npm run test test/unit/comprehensive-test-suite/components/**/*.test.{ts,tsx}

# Utility tests
npm run test test/unit/comprehensive-test-suite/utils/**/*.test.ts

# API tests
npm run test test/unit/comprehensive-test-suite/api/**/*.test.ts

# Form validation tests
npm run test test/unit/comprehensive-test-suite/forms/**/*.test.ts
```

### All Tests with Test Runner

```bash
# Run all comprehensive tests
tsx test/unit/comprehensive-test-suite/testRunner.ts

# Run with coverage
tsx test/unit/comprehensive-test-suite/testRunner.ts --coverage

# Run in parallel
tsx test/unit/comprehensive-test-suite/testRunner.ts --parallel

# Run specific categories
tsx test/unit/comprehensive-test-suite/testRunner.ts --categories auth,components

# Run with verbose output
tsx test/unit/comprehensive-test-suite/testRunner.ts --verbose

# Fail fast on first failure
tsx test/unit/comprehensive-test-suite/testRunner.ts --fail-fast
```

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:comprehensive": "tsx test/unit/comprehensive-test-suite/testRunner.ts",
    "test:comprehensive:coverage": "tsx test/unit/comprehensive-test-suite/testRunner.ts --coverage",
    "test:comprehensive:parallel": "tsx test/unit/comprehensive-test-suite/testRunner.ts --parallel",
    "test:auth": "vitest run test/unit/comprehensive-test-suite/auth/**/*.test.{ts,tsx}",
    "test:components": "vitest run test/unit/comprehensive-test-suite/components/**/*.test.{ts,tsx}",
    "test:utils": "vitest run test/unit/comprehensive-test-suite/utils/**/*.test.ts",
    "test:api": "vitest run test/unit/comprehensive-test-suite/api/**/*.test.ts",
    "test:forms": "vitest run test/unit/comprehensive-test-suite/forms/**/*.test.ts"
  }
}
```

## Test Features

### Comprehensive Mocking
- API requests and responses
- React Query client
- Authentication context
- Toast notifications
- Navigation hooks
- File uploads
- Date/time functions

### Accessibility Testing
- ARIA labels and attributes
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Live regions for dynamic content

### Responsive Design Testing
- Mobile viewport testing
- Tablet layout verification
- Touch target validation
- Responsive component behavior

### Error Handling Testing
- Network errors
- Validation errors
- Loading states
- Empty states
- Invalid data handling

### Performance Testing
- Component memoization
- Lazy loading
- Image optimization
- Re-render prevention

## Test Quality Standards

- **Isolation**: Each test is independent and can run in any order
- **Clarity**: Test names clearly describe what is being tested
- **Coverage**: Tests cover happy paths, edge cases, and error scenarios
- **Maintainability**: Tests are well-organized and easy to update
- **Performance**: Tests run efficiently with appropriate timeouts
- **Reliability**: Tests are deterministic and not flaky

## Coverage Goals

- **Statements**: > 85%
- **Branches**: > 80%
- **Functions**: > 85%
- **Lines**: > 85%

## Continuous Integration

These tests are designed to integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Comprehensive Tests
  run: |
    npm install
    npm run test:comprehensive -- --coverage
    
- name: Upload Coverage Reports
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

## Contributing

When adding new features to the FitnessMealPlanner:

1. **Add corresponding tests** to the appropriate test suite
2. **Follow naming conventions** for test files and descriptions
3. **Include all test categories**: rendering, interaction, validation, error handling, accessibility
4. **Mock external dependencies** appropriately
5. **Test responsive behavior** for UI components
6. **Include edge cases** and error scenarios
7. **Update this README** if adding new test categories

## Test Report Generation

The test runner automatically generates detailed reports:

- **JSON Report**: `test-results/comprehensive-test-report.json`
- **Coverage Report**: `coverage/comprehensive-test-coverage.json`
- **Console Output**: Detailed pass/fail status for each suite

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout values in test configuration
2. **Mock not working**: Verify mock is placed before imports
3. **State pollution**: Ensure proper cleanup in beforeEach/afterEach
4. **Async issues**: Use proper awaiting and waitFor utilities
5. **CI failures**: Check for environment-specific dependencies

### Debug Mode

Run tests with debug information:

```bash
DEBUG=1 tsx test/unit/comprehensive-test-suite/testRunner.ts --verbose
```

This comprehensive test suite ensures the FitnessMealPlanner application is robust, reliable, and maintains high quality standards across all components and functionality.