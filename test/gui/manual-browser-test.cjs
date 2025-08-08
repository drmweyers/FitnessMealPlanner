/**
 * Manual Browser Test Script
 * 
 * This script provides step-by-step instructions for manual testing
 * of the generate plan button functionality
 */

const fs = require('fs');
const path = require('path');

function generateManualTestInstructions() {
  const timestamp = new Date().toISOString();
  
  let instructions = `
# Manual Browser Test Instructions for Generate Plan Button
Generated: ${timestamp}
Application URL: http://localhost:4000

## CRITICAL ISSUE IDENTIFIED: Authentication Problem
Based on API testing, the login credentials are not working correctly.
This means the generate plan buttons may appear to be broken when they're actually auth-related.

## Pre-Test Setup
1. **Ensure Docker is running**: 
   - Run: \`docker ps\` and verify fitnessmealplanner-dev is running
   - If not running: \`docker-compose --profile dev up -d\`

2. **Verify admin user exists**:
   - Run: \`docker exec fitnessmealplanner-dev npm run create-admin\`

## Manual Test Steps

### Step 1: Basic Application Access
1. Open browser and navigate to: http://localhost:4000
2. **VERIFY**: Application loads without errors
3. **CHECK**: Browser developer console (F12) for JavaScript errors
4. **SCREENSHOT**: Take screenshot if errors are found

### Step 2: Login Page Testing
1. Navigate to: http://localhost:4000/login
2. **VERIFY**: Login form is visible and functional
3. **TRY LOGIN**: Use these credentials:
   - Email: admin@fitmeal.pro
   - Password: Admin123!@#
4. **OBSERVE**: What happens after clicking login?
   - Successful redirect to dashboard?
   - Error message displayed?
   - JavaScript console errors?
5. **SCREENSHOT**: Capture any error states

### Step 3: Meal Plan Generator Access (IF LOGIN WORKS)
1. Navigate to: http://localhost:4000/meal-plan-generator
2. **VERIFY**: Page loads without errors
3. **LOCATE**: Generate plan buttons on the page
4. **INSPECT**: Right-click on generate buttons and inspect element
   - Are they properly rendered?
   - Do they have click handlers?
   - Are they disabled/enabled correctly?

### Step 4: Generate Plan Button Testing
1. **FILL FORM**: Fill out the meal plan form with test data:
   - Days: 3
   - Daily Calories: 2000
   - Meals per day: 3
   - Client name: Test Client
   - Fitness goal: Weight loss

2. **TEST NATURAL LANGUAGE**: If available, try:
   - Input: "Create a 3-day meal plan for weight loss with high protein"
   - Click any "Parse" or "Generate" buttons

3. **TEST ADVANCED FORM**: If available:
   - Fill out detailed nutritional requirements
   - Click "Generate Meal Plan" button

4. **OBSERVE BUTTON BEHAVIOR**:
   - Does button become disabled when clicked?
   - Do loading spinners appear?
   - Any error messages?
   - Network requests in browser dev tools?

### Step 5: Network Request Analysis
1. **OPEN BROWSER DEV TOOLS**: Press F12
2. **GO TO NETWORK TAB**: Monitor all network requests
3. **CLICK GENERATE BUTTON**: Watch for:
   - API call to /api/meal-plan/generate
   - Request method (should be POST)
   - Response status code
   - Response content
   - Any error responses

### Step 6: JavaScript Error Investigation
1. **CONSOLE TAB**: Check for JavaScript errors when:
   - Page loads
   - Form is filled
   - Generate button is clicked
   - Any error messages appear

2. **COMMON ERRORS TO LOOK FOR**:
   - React component errors
   - API request failures
   - Authentication token issues
   - Missing environment variables

### Step 7: Trainer Page Testing (IF LOGIN WORKS)
1. Navigate to: http://localhost:4000/trainer
2. **LOCATE**: Any generate plan buttons for customers
3. **TEST**: If customer management is available, test generate buttons there

## Expected vs Actual Results

### If Login Fails:
- **EXPECTED**: Should login successfully with admin@fitmeal.pro / Admin123!@#
- **IF FAILS**: This is the PRIMARY issue - generate buttons may be hidden due to auth

### If Login Works but Generate Buttons Don't:
- **CHECK**: Are buttons visible and clickable?
- **CHECK**: Do API calls get made to /api/meal-plan/generate?
- **CHECK**: What error responses are returned?

### Common Issues to Investigate:
1. **Authentication**: User not logged in or token expired
2. **API Configuration**: OpenAI API keys missing or invalid
3. **Database**: Connection issues or missing data
4. **Frontend State**: React component state not updating
5. **Network**: CORS issues or blocked requests

## Data Collection for Report

Please collect the following information during testing:

1. **Screenshots** of any error states
2. **Console errors** (copy full error messages)
3. **Network request details** (status codes, response bodies)
4. **Browser information** (Chrome/Firefox version)
5. **Specific steps** that reproduce the issue

## Emergency Debugging Commands

If testing reveals issues, run these commands for additional information:

\`\`\`bash
# Check application logs
docker logs fitnessmealplanner-dev --tail 50

# Check database status
docker exec fitnessmealplanner-dev npm run db:push

# Restart application
docker-compose --profile dev restart

# Check environment
docker exec fitnessmealplanner-dev env | grep -E "(NODE_ENV|DATABASE|OPENAI)"
\`\`\`

## Next Steps After Manual Testing

Based on your findings:
1. **If auth fails**: Fix authentication before testing generate buttons
2. **If auth works but buttons fail**: Focus on API and frontend debugging
3. **If everything works**: The issue may be environment-specific or resolved

---

**IMPORTANT**: This manual testing will provide much more accurate information 
than automated tests because you can observe the actual user experience and 
see real-time browser behavior.
`;

  return instructions;
}

// Save instructions to file
const instructions = generateManualTestInstructions();
const instructionsPath = path.join(__dirname, 'reports', 'manual-test-instructions.md');

// Ensure directory exists
const reportsDir = path.dirname(instructionsPath);
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

fs.writeFileSync(instructionsPath, instructions);

console.log('================================================================================');
console.log('MANUAL BROWSER TEST INSTRUCTIONS GENERATED');
console.log('================================================================================');
console.log(instructions);
console.log('================================================================================');
console.log(`Instructions saved to: ${instructionsPath}`);
console.log('');
console.log('🔧 CRITICAL FINDING: Authentication API is failing with "Invalid credentials"');
console.log('   This means the generate plan buttons may be hidden or non-functional');
console.log('   due to authentication issues, not button-specific problems.');
console.log('');
console.log('📋 RECOMMENDATION: Follow the manual test instructions above to determine');
console.log('   whether the issue is authentication-related or truly button-specific.');
console.log('');
console.log('🚀 TO START TESTING: Open http://localhost:4000 in your browser now!');

// Also return instructions for programmatic use
module.exports = { generateManualTestInstructions };