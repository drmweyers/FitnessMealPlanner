# Admin Natural Language Generator E2E Test Suite

## Overview

Comprehensive Playwright end-to-end test suite for the "Generate Directly" button and Natural Language Generator feature in the AdminRecipeGenerator component.

## Test File Location

`test/e2e/admin-natural-language-generator.spec.ts`

## Test Coverage

### Main Test Suite (15 tests)

1. **Admin Login and Navigation to Recipe Generator**
   - Verifies admin can login successfully
   - Navigates to Recipe Generator section
   - Confirms AI Recipe Generator section is visible

2. **Verify Natural Language Generator Section Exists**
   - Checks section header visibility
   - Verifies section description
   - Confirms textarea element exists and is editable

3. **Verify "Generate Directly" Button Exists**
   - Locates the Generate Directly button
   - Verifies button has correct Wand2 icon
   - Checks button styling (green background)

4. **Verify Button is Disabled When Textarea is Empty**
   - Ensures empty textarea disables button
   - Confirms both Parse with AI and Generate Directly buttons are disabled

5. **Verify Button Becomes Enabled When Text is Entered**
   - Tests button state transition from disabled to enabled
   - Verifies both buttons enable when valid text is entered

6. **Verify Button Disabled State with Only Whitespace**
   - Tests that whitespace-only input keeps button disabled
   - Validates trim() logic on input

7. **Verify API Call When Generate Directly is Clicked**
   - Intercepts `/api/admin/generate-from-prompt` endpoint
   - Verifies request is made with correct payload
   - Checks prompt is sent in request body

8. **Verify Success Toast Notification Appears**
   - Mocks successful API response
   - Confirms success toast displays
   - Validates toast message content

9. **Verify Error Handling - Empty Input**
   - Documents expected behavior for empty input
   - Confirms button remains disabled

10. **Verify Error Handling - API Error (400)**
    - Mocks 400 Bad Request response
    - Verifies error toast appears
    - Checks error message display

11. **Verify Error Handling - Server Error (500)**
    - Mocks 500 Internal Server Error
    - Confirms error toast notification
    - Validates error messaging

12. **Verify Button Loading State During Generation**
    - Tests button shows loading state
    - Verifies spinner animation appears
    - Confirms button is disabled during loading

13. **Verify Network Error Handling**
    - Simulates network disconnection
    - Tests error handling for network failures
    - Validates user feedback

14. **Verify Parse with AI Button vs Generate Directly Button**
    - Compares both button behaviors
    - Validates different styling (blue vs green)
    - Confirms Generate Directly calls correct endpoint

15. **Complete User Journey - Natural Language Generation**
    - End-to-end user flow test
    - Login → Navigation → Input → Generate → Success
    - Screenshots captured at each step

### Edge Cases Suite (3 tests)

1. **Very Long Prompt**
   - Tests system handles very long text input
   - Verifies button still functions correctly

2. **Special Characters in Prompt**
   - Tests handling of special characters: `()[]&@!#$`
   - Verifies payload is sent correctly

3. **Multiple Line Breaks in Prompt**
   - Tests multiline input with line breaks
   - Validates prompt formatting preservation

## API Endpoint Tested

**Endpoint:** `POST /api/admin/generate-from-prompt`

**Expected Request Payload:**
```json
{
  "prompt": "Generate 15 high-protein breakfast recipes..."
}
```

**Expected Response:**
```json
{
  "batchId": "test-batch-123",
  "parsedParameters": {
    "count": 15,
    "mealType": "breakfast",
    "dietaryTag": "keto"
  },
  "generationOptions": {
    "batchSize": 15
  }
}
```

## Running the Tests

### Run all Natural Language Generator tests:
```bash
npx playwright test admin-natural-language-generator.spec.ts
```

### Run specific test:
```bash
npx playwright test admin-natural-language-generator.spec.ts -g "Verify Generate Directly Button Exists"
```

### Run with headed browser (see the test):
```bash
npx playwright test admin-natural-language-generator.spec.ts --headed
```

### Run with debug mode:
```bash
npx playwright test admin-natural-language-generator.spec.ts --debug
```

### Generate HTML report:
```bash
npx playwright test admin-natural-language-generator.spec.ts
npx playwright show-report
```

## Test Credentials

- **Admin Email:** admin@fitmeal.pro
- **Admin Password:** AdminPass123

## Test Data

### Sample Prompts Used:
1. **Valid:** "Generate 15 high-protein breakfast recipes under 20 minutes prep time, focusing on eggs and Greek yogurt, suitable for keto diet, with 400-600 calories per serving"
2. **Short:** "Create 5 lunch recipes"
3. **Complex:** "Make 20 vegetarian dinner recipes under 500 calories for weight loss with at least 25g protein per serving"

## Screenshot Locations

All screenshots are saved to: `test-screenshots/`

### Screenshot Files:
- `nl-generator-1-navigation.png` - Admin dashboard view
- `nl-generator-2-section-visible.png` - Natural Language section
- `nl-generator-3-button-exists.png` - Generate Directly button
- `nl-generator-4-button-disabled.png` - Disabled state
- `nl-generator-5-button-enabled.png` - Enabled state
- `nl-generator-6-whitespace-disabled.png` - Whitespace validation
- `nl-generator-7-api-call.png` - API request made
- `nl-generator-8-success-toast.png` - Success notification
- `nl-generator-9-empty-validation.png` - Empty input validation
- `nl-generator-10-api-error.png` - API error handling
- `nl-generator-11-server-error.png` - Server error handling
- `nl-generator-12-loading-state.png` - Loading state
- `nl-generator-13-network-error.png` - Network error
- `nl-generator-14-button-comparison.png` - Button comparison
- `nl-generator-journey-*.png` - Complete user journey (6 screenshots)
- `nl-generator-edge-*.png` - Edge case screenshots (3 screenshots)

## Test Results Expected

✅ All 18 tests should pass (15 main + 3 edge cases)

## Component Under Test

**File:** `client/src/components/AdminRecipeGenerator.tsx`

**Key Elements Tested:**
- Natural Language textarea (ID: `natural-language`)
- Generate Directly button (green, with Wand2 icon)
- Parse with AI button (blue, with Sparkles icon)
- Toast notifications
- Loading states
- API integration

## Error Scenarios Covered

1. ✅ Empty textarea input
2. ✅ Whitespace-only input
3. ✅ API error (400 Bad Request)
4. ✅ Server error (500 Internal Server Error)
5. ✅ Network disconnection
6. ✅ Invalid prompt format

## Future Enhancements

- [ ] Add accessibility testing (ARIA labels, keyboard navigation)
- [ ] Add performance testing (measure API response times)
- [ ] Add visual regression testing (screenshot comparison)
- [ ] Test integration with BMAD Generator tab
- [ ] Test concurrent generation requests

## Notes

- Tests use mocked API responses to avoid rate limits
- Viewport set to 1280x720 for consistency
- All tests include screenshot capture for debugging
- Request interceptors used for API mocking
- Tests are isolated and can run independently

## Maintenance

When updating the AdminRecipeGenerator component:
1. Update test selectors if element IDs/classes change
2. Update API mock responses if endpoint contract changes
3. Add new tests for new features
4. Update screenshots if UI changes significantly
