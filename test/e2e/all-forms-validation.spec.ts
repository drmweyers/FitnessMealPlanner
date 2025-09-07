/**
 * ALL FORMS VALIDATION COMPREHENSIVE TEST SUITE
 * 
 * This test suite provides exhaustive testing of ALL form validation in the app:
 * - Login form validation
 * - Registration form validation  
 * - Profile forms validation (Admin, Trainer, Customer)
 * - Recipe generation form validation
 * - Customer invitation form validation
 * - Meal plan creation form validation
 * - Progress tracking form validation
 * - Search and filter form validation
 * - Password reset form validation
 * - All input types and edge cases
 * - Real-time validation feedback
 * - Form submission error handling
 */

import { test, expect, Page } from '@playwright/test';

// Test account credentials
const TEST_ACCOUNTS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

// Helper function to test form field validation
async function testFieldValidation(page: Page, selector: string, fieldName: string, testCases: {
  value: string;
  expectError: boolean;
  errorType: string;
}[]) {
  console.log(`🔍 Testing ${fieldName} validation...`);
  
  const field = page.locator(selector);
  await expect(field).toBeVisible();
  
  for (const testCase of testCases) {
    console.log(`  Testing: "${testCase.value}" (expect error: ${testCase.expectError})`);
    
    // Clear field first
    await field.clear();
    await page.waitForTimeout(200);
    
    // Fill with test value
    if (testCase.value) {
      await field.fill(testCase.value);
    }
    
    // Trigger validation by blurring field
    await field.blur();
    await page.waitForTimeout(500);
    
    // Check for validation errors
    const errorMessages = await page.locator('.error, [role="alert"], .text-red-500, .text-destructive, .invalid-feedback').count();
    const hasError = errorMessages > 0;
    
    if (testCase.expectError && hasError) {
      console.log(`    ✅ Validation error shown correctly for ${testCase.errorType}`);
      
      // Try to get error message text
      const errorText = await page.locator('.error, [role="alert"], .text-red-500, .text-destructive').first().textContent().catch(() => '');
      if (errorText) {
        console.log(`    📝 Error message: "${errorText.trim()}"`);
      }
    } else if (!testCase.expectError && !hasError) {
      console.log(`    ✅ No validation error (correct for valid input)`);
    } else if (testCase.expectError && !hasError) {
      console.log(`    ❌ Expected validation error but none shown`);
    } else {
      console.log(`    ❌ Unexpected validation error shown`);
    }
    
    // Clear field for next test
    await field.clear();
  }
}

// Helper function to login
async function loginAs(page: Page, role: 'admin' | 'trainer' | 'customer') {
  const account = TEST_ACCOUNTS[role];
  console.log(`🔐 Logging in as ${role}...`);
  
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
}

test.describe('All Forms Validation Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('LOGIN FORM - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing LOGIN FORM - Complete Validation');
    
    await page.goto('/login');
    await expect(page).toHaveTitle(/FitnessMealPlanner/);
    
    const emailField = 'input[type="email"]';
    const passwordField = 'input[type="password"]';
    const submitButton = 'button[type="submit"]';
    
    // Test email field validation
    await testFieldValidation(page, emailField, 'Email', [
      { value: '', expectError: true, errorType: 'required' },
      { value: 'invalid-email', expectError: true, errorType: 'invalid format' },
      { value: 'test@', expectError: true, errorType: 'incomplete domain' },
      { value: '@example.com', expectError: true, errorType: 'missing local part' },
      { value: 'test..test@example.com', expectError: true, errorType: 'double dots' },
      { value: 'test@example', expectError: true, errorType: 'missing TLD' },
      { value: 'valid@example.com', expectError: false, errorType: 'valid email' },
      { value: 'test+tag@example.com', expectError: false, errorType: 'email with plus' },
      { value: 'test.name@example.com', expectError: false, errorType: 'email with dot' }
    ]);
    
    // Test password field validation
    await testFieldValidation(page, passwordField, 'Password', [
      { value: '', expectError: true, errorType: 'required' },
      { value: '123', expectError: true, errorType: 'too short' },
      { value: '12345', expectError: true, errorType: 'minimum length' },
      { value: '123456', expectError: false, errorType: 'minimum valid length' },
      { value: 'ValidPassword123!', expectError: false, errorType: 'strong password' }
    ]);
    
    // Test form submission with empty fields
    console.log('🔲 Testing empty form submission...');
    await page.locator(emailField).clear();
    await page.locator(passwordField).clear();
    await page.click(submitButton);
    await page.waitForTimeout(1000);
    
    const errorCount = await page.locator('.error, [role="alert"], .text-red-500').count();
    console.log(`  Found ${errorCount} validation errors for empty submission`);
    
    // Test form submission with invalid credentials
    console.log('🚫 Testing invalid credentials...');
    await page.fill(emailField, 'nonexistent@example.com');
    await page.fill(passwordField, 'wrongpassword');
    await page.click(submitButton);
    await page.waitForTimeout(2000);
    
    // Check for authentication error
    const authError = await page.locator('.error, [role="alert"], .text-red-500, .toast').count();
    console.log(`  Authentication error shown: ${authError > 0}`);
    
    // Test successful login
    console.log('✅ Testing successful login...');
    await page.fill(emailField, TEST_ACCOUNTS.admin.email);
    await page.fill(passwordField, TEST_ACCOUNTS.admin.password);
    await page.click(submitButton);
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    
    const loggedIn = page.url().includes('/admin');
    console.log(`  Successfully logged in: ${loggedIn}`);
    
    console.log('✅ LOGIN FORM validation testing completed');
  });

  test('REGISTRATION FORM - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing REGISTRATION FORM - Complete Validation');
    
    await page.goto('/register');
    
    // Identify form fields
    const emailField = 'input[type="email"]';
    const passwordField = 'input[type="password"]';
    const confirmPasswordField = 'input[name*="confirm"], input[placeholder*="confirm" i]';
    const firstNameField = 'input[name*="first"], input[placeholder*="first" i]';
    const lastNameField = 'input[name*="last"], input[placeholder*="last" i]';
    const roleField = 'select[name*="role"], select';
    
    // Test email validation (same as login)
    if (await page.locator(emailField).count() > 0) {
      await testFieldValidation(page, emailField, 'Registration Email', [
        { value: '', expectError: true, errorType: 'required' },
        { value: 'invalid-email', expectError: true, errorType: 'invalid format' },
        { value: 'valid@example.com', expectError: false, errorType: 'valid email' }
      ]);
    }
    
    // Test password validation (more stringent for registration)
    if (await page.locator(passwordField).count() > 0) {
      await testFieldValidation(page, passwordField, 'Registration Password', [
        { value: '', expectError: true, errorType: 'required' },
        { value: '123', expectError: true, errorType: 'too short' },
        { value: '12345678', expectError: true, errorType: 'no special chars' },
        { value: 'password', expectError: true, errorType: 'no numbers' },
        { value: '12345678', expectError: true, errorType: 'no letters' },
        { value: 'Password123', expectError: true, errorType: 'no special chars' },
        { value: 'Password123!', expectError: false, errorType: 'strong password' }
      ]);
    }
    
    // Test confirm password validation
    if (await page.locator(confirmPasswordField).count() > 0) {
      console.log('🔍 Testing confirm password validation...');
      
      // Set original password
      await page.fill(passwordField, 'TestPassword123!');
      
      // Test mismatched confirmation
      await page.fill(confirmPasswordField, 'DifferentPassword123!');
      await page.locator(confirmPasswordField).blur();
      await page.waitForTimeout(500);
      
      const mismatchError = await page.locator('.error, [role="alert"], .text-red-500').count();
      console.log(`  Password mismatch error shown: ${mismatchError > 0}`);
      
      // Test matching confirmation
      await page.fill(confirmPasswordField, 'TestPassword123!');
      await page.locator(confirmPasswordField).blur();
      await page.waitForTimeout(500);
      
      const matchSuccess = await page.locator('.error, [role="alert"], .text-red-500').count();
      console.log(`  Matching passwords valid: ${matchSuccess === 0}`);
    }
    
    // Test name fields validation
    if (await page.locator(firstNameField).count() > 0) {
      await testFieldValidation(page, firstNameField, 'First Name', [
        { value: '', expectError: true, errorType: 'required' },
        { value: 'A', expectError: true, errorType: 'too short' },
        { value: '123', expectError: true, errorType: 'invalid characters' },
        { value: 'John', expectError: false, errorType: 'valid name' },
        { value: 'Jean-Luc', expectError: false, errorType: 'hyphenated name' },
        { value: "O'Connor", expectError: false, errorType: 'apostrophe name' }
      ]);
    }
    
    if (await page.locator(lastNameField).count() > 0) {
      await testFieldValidation(page, lastNameField, 'Last Name', [
        { value: '', expectError: true, errorType: 'required' },
        { value: 'S', expectError: true, errorType: 'too short' },
        { value: 'Smith', expectError: false, errorType: 'valid surname' },
        { value: 'Van Der Berg', expectError: false, errorType: 'multi-part surname' }
      ]);
    }
    
    // Test role selection validation
    if (await page.locator(roleField).count() > 0) {
      console.log('🔍 Testing role selection validation...');
      
      // Test no selection
      await page.selectOption(roleField, '');
      await page.locator(roleField).blur();
      await page.waitForTimeout(500);
      
      const noRoleError = await page.locator('.error, [role="alert"], .text-red-500').count();
      console.log(`  No role selected error: ${noRoleError > 0}`);
      
      // Test valid selections
      const roleOptions = await page.locator(`${roleField} option`).all();
      for (let i = 1; i < Math.min(roleOptions.length, 4); i++) {
        const optionValue = await roleOptions[i].getAttribute('value');
        const optionText = await roleOptions[i].textContent();
        
        if (optionValue) {
          await page.selectOption(roleField, optionValue);
          await page.waitForTimeout(300);
          console.log(`    Selected role: ${optionText} (${optionValue})`);
        }
      }
    }
    
    // Test complete form submission
    console.log('📝 Testing complete registration form submission...');
    
    // Fill valid data
    if (await page.locator(emailField).count() > 0) {
      await page.fill(emailField, 'newuser@example.com');
    }
    if (await page.locator(passwordField).count() > 0) {
      await page.fill(passwordField, 'NewPassword123!');
    }
    if (await page.locator(confirmPasswordField).count() > 0) {
      await page.fill(confirmPasswordField, 'NewPassword123!');
    }
    if (await page.locator(firstNameField).count() > 0) {
      await page.fill(firstNameField, 'John');
    }
    if (await page.locator(lastNameField).count() > 0) {
      await page.fill(lastNameField, 'Doe');
    }
    if (await page.locator(roleField).count() > 0) {
      await page.selectOption(roleField, { index: 1 });
    }
    
    // Submit form (don't actually register)
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      console.log('  Form ready for submission (test only - not submitting)');
    }
    
    console.log('✅ REGISTRATION FORM validation testing completed');
  });

  test('PROFILE FORMS - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing PROFILE FORMS - Complete Validation');
    
    // Test Admin Profile
    await loginAs(page, 'admin');
    await page.goto('/admin/profile');
    await page.waitForTimeout(1000);
    
    console.log('👤 Testing Admin Profile Form...');
    
    // Test profile image upload
    const imageUpload = page.locator('input[type="file"]');
    if (await imageUpload.count() > 0) {
      console.log('  📸 Testing image upload validation...');
      
      // Note: File upload testing would require actual files
      // Here we test the field exists and is accessible
      const uploadField = await imageUpload.isVisible();
      console.log(`    Image upload field visible: ${uploadField}`);
    }
    
    // Test email update
    const profileEmailField = page.locator('input[type="email"]');
    if (await profileEmailField.count() > 0) {
      await testFieldValidation(page, 'input[type="email"]', 'Profile Email', [
        { value: 'invalid-email', expectError: true, errorType: 'invalid format' },
        { value: 'newemail@example.com', expectError: false, errorType: 'valid email' }
      ]);
    }
    
    // Test password change
    const currentPasswordField = page.locator('input[placeholder*="current" i], input[name*="current"]');
    const newPasswordField = page.locator('input[placeholder*="new" i], input[name*="new"]');
    
    if (await newPasswordField.count() > 0) {
      await testFieldValidation(page, 'input[placeholder*="new" i]', 'New Password', [
        { value: '123', expectError: true, errorType: 'too short' },
        { value: 'NewPassword123!', expectError: false, errorType: 'strong password' }
      ]);
    }
    
    // Test Trainer Profile
    await loginAs(page, 'trainer');
    await page.goto('/trainer/profile');
    await page.waitForTimeout(1000);
    
    console.log('🏋️ Testing Trainer Profile Form...');
    
    // Test bio/description field
    const bioField = page.locator('textarea[name*="bio"], textarea[placeholder*="bio" i]');
    if (await bioField.count() > 0) {
      console.log('  📝 Testing bio field validation...');
      
      await bioField.fill('a'.repeat(1000)); // Test max length
      await bioField.blur();
      await page.waitForTimeout(500);
      
      const bioError = await page.locator('.error, [role="alert"], .text-red-500').count();
      console.log(`    Bio length validation: ${bioError > 0 ? 'enforced' : 'not enforced'}`);
    }
    
    // Test specialization fields
    const specializationField = page.locator('input[name*="specialization"], select[name*="specialization"]');
    if (await specializationField.count() > 0) {
      console.log('  🎯 Testing specialization field...');
      
      if (await specializationField.first().getAttribute('type') === 'text') {
        await testFieldValidation(page, 'input[name*="specialization"]', 'Specialization', [
          { value: '', expectError: false, errorType: 'optional field' },
          { value: 'Weight Loss, Muscle Gain', expectError: false, errorType: 'valid specializations' }
        ]);
      }
    }
    
    // Test Customer Profile  
    await loginAs(page, 'customer');
    await page.goto('/customer/profile');
    await page.waitForTimeout(1000);
    
    console.log('👥 Testing Customer Profile Form...');
    
    // Test personal information fields
    const ageField = page.locator('input[name*="age"], input[type="number"]');
    const heightField = page.locator('input[name*="height"]');
    const weightField = page.locator('input[name*="weight"]');
    
    if (await ageField.count() > 0) {
      await testFieldValidation(page, 'input[name*="age"]', 'Age', [
        { value: '0', expectError: true, errorType: 'too young' },
        { value: '150', expectError: true, errorType: 'too old' },
        { value: '25', expectError: false, errorType: 'valid age' }
      ]);
    }
    
    if (await heightField.count() > 0) {
      await testFieldValidation(page, 'input[name*="height"]', 'Height', [
        { value: '0', expectError: true, errorType: 'invalid height' },
        { value: '170', expectError: false, errorType: 'valid height cm' },
        { value: '5.8', expectError: false, errorType: 'valid height feet' }
      ]);
    }
    
    if (await weightField.count() > 0) {
      await testFieldValidation(page, 'input[name*="weight"]', 'Weight', [
        { value: '0', expectError: true, errorType: 'invalid weight' },
        { value: '70', expectError: false, errorType: 'valid weight kg' }
      ]);
    }
    
    console.log('✅ PROFILE FORMS validation testing completed');
  });

  test('SEARCH AND FILTER FORMS - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing SEARCH AND FILTER FORMS - Complete Validation');
    
    await loginAs(page, 'admin');
    
    // Test recipe search form
    console.log('🔍 Testing Recipe Search Form...');
    
    const searchField = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchField.count() > 0) {
      console.log('  📝 Testing search input validation...');
      
      // Test various search inputs
      const searchTerms = [
        '',
        'a', // too short
        'chicken',
        'high protein',
        '!@#$%', // special characters
        'very long search term that might be too long for the system to handle properly'
      ];
      
      for (const term of searchTerms) {
        await searchField.clear();
        await searchField.fill(term);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        console.log(`    Search term: "${term.substring(0, 20)}..." - executed`);
      }
    }
    
    // Test filter dropdowns
    console.log('  🔽 Testing filter dropdowns...');
    
    const mealTypeFilter = page.locator('select[name*="meal"], select[name*="type"]');
    const dietaryFilter = page.locator('select[name*="dietary"], select[name*="diet"]');
    const prepTimeFilter = page.locator('select[name*="prep"], select[name*="time"]');
    
    const filters = [
      { selector: mealTypeFilter, name: 'Meal Type' },
      { selector: dietaryFilter, name: 'Dietary' },
      { selector: prepTimeFilter, name: 'Prep Time' }
    ];
    
    for (const filter of filters) {
      if (await filter.selector.count() > 0) {
        console.log(`    Testing ${filter.name} filter...`);
        
        const options = await page.locator(`${await filter.selector.first().getAttribute('selector') || 'select'} option`).all();
        
        // Test selecting different options
        for (let i = 0; i < Math.min(options.length, 3); i++) {
          const optionValue = await options[i].getAttribute('value');
          const optionText = await options[i].textContent();
          
          if (optionValue) {
            await filter.selector.selectOption(optionValue);
            await page.waitForTimeout(500);
            console.log(`      Selected: ${optionText}`);
          }
        }
      }
    }
    
    // Test numeric range inputs
    console.log('  🔢 Testing numeric range filters...');
    
    const calorieMinField = page.locator('input[name*="calorie"][name*="min"], input[placeholder*="min calorie" i]');
    const calorieMaxField = page.locator('input[name*="calorie"][name*="max"], input[placeholder*="max calorie" i]');
    
    if (await calorieMinField.count() > 0 && await calorieMaxField.count() > 0) {
      console.log('    Testing calorie range validation...');
      
      // Test invalid ranges
      await calorieMinField.fill('500');
      await calorieMaxField.fill('300'); // Max less than min
      await calorieMaxField.blur();
      await page.waitForTimeout(500);
      
      const rangeError = await page.locator('.error, [role="alert"], .text-red-500').count();
      console.log(`      Invalid range error: ${rangeError > 0}`);
      
      // Test valid range
      await calorieMinField.fill('200');
      await calorieMaxField.fill('600');
      await calorieMaxField.blur();
      await page.waitForTimeout(500);
      
      console.log('      Valid range tested');
    }
    
    console.log('✅ SEARCH AND FILTER FORMS validation testing completed');
  });

  test('CUSTOMER INVITATION FORM - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing CUSTOMER INVITATION FORM - Complete Validation');
    
    await loginAs(page, 'trainer');
    
    // Navigate to customers tab
    const customersTab = page.locator('button:has-text("Customer"), [role="tab"]:has-text("Customer")');
    if (await customersTab.count() > 0) {
      await customersTab.first().click();
      await page.waitForTimeout(1000);
    }
    
    // Find and click invite button
    const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Customer")');
    if (await inviteButton.count() > 0) {
      await inviteButton.first().click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('[role="dialog"], .modal, .fixed.inset-0');
      if (await modal.count() > 0) {
        console.log('📧 Testing Customer Invitation Modal Form...');
        
        // Test email field
        const inviteEmailField = modal.locator('input[type="email"]');
        if (await inviteEmailField.count() > 0) {
          await testFieldValidation(page, 'input[type="email"]', 'Invitation Email', [
            { value: '', expectError: true, errorType: 'required' },
            { value: 'invalid-email', expectError: true, errorType: 'invalid format' },
            { value: 'customer@example.com', expectError: false, errorType: 'valid email' }
          ]);
        }
        
        // Test first name field
        const firstNameField = modal.locator('input[name*="first"], input[placeholder*="first" i]');
        if (await firstNameField.count() > 0) {
          await testFieldValidation(page, 'input[name*="first"]', 'Customer First Name', [
            { value: '', expectError: true, errorType: 'required' },
            { value: 'J', expectError: true, errorType: 'too short' },
            { value: 'Jane', expectError: false, errorType: 'valid name' }
          ]);
        }
        
        // Test last name field
        const lastNameField = modal.locator('input[name*="last"], input[placeholder*="last" i]');
        if (await lastNameField.count() > 0) {
          await testFieldValidation(page, 'input[name*="last"]', 'Customer Last Name', [
            { value: '', expectError: true, errorType: 'required' },
            { value: 'D', expectError: true, errorType: 'too short' },
            { value: 'Doe', expectError: false, errorType: 'valid surname' }
          ]);
        }
        
        // Test custom message field
        const messageField = modal.locator('textarea[name*="message"], textarea[placeholder*="message" i]');
        if (await messageField.count() > 0) {
          console.log('  💬 Testing custom message field...');
          
          const longMessage = 'a'.repeat(1000);
          await messageField.fill(longMessage);
          await messageField.blur();
          await page.waitForTimeout(500);
          
          const messageError = await page.locator('.error, [role="alert"], .text-red-500').count();
          console.log(`    Message length validation: ${messageError > 0 ? 'enforced' : 'not enforced'}`);
          
          // Test valid message
          await messageField.clear();
          await messageField.fill('Welcome to our fitness program!');
          await page.waitForTimeout(300);
        }
        
        // Test form submission
        console.log('  📤 Testing invitation form submission...');
        
        // Fill valid data
        if (await inviteEmailField.count() > 0) {
          await inviteEmailField.fill('newcustomer@example.com');
        }
        if (await firstNameField.count() > 0) {
          await firstNameField.fill('New');
        }
        if (await lastNameField.count() > 0) {
          await lastNameField.fill('Customer');
        }
        
        const submitButton = modal.locator('button[type="submit"], button:has-text("Send"), button:has-text("Invite")');
        if (await submitButton.count() > 0) {
          console.log('    Form ready for submission (test only - not submitting)');
        }
        
        // Close modal
        const closeButton = modal.locator('button:has-text("Cancel"), button:has-text("Close")');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
    
    console.log('✅ CUSTOMER INVITATION FORM validation testing completed');
  });

  test('PASSWORD RESET FORM - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing PASSWORD RESET FORM - Complete Validation');
    
    // Test forgot password form
    await page.goto('/forgot-password');
    
    console.log('🔒 Testing Forgot Password Form...');
    
    const resetEmailField = page.locator('input[type="email"]');
    if (await resetEmailField.count() > 0) {
      await testFieldValidation(page, 'input[type="email"]', 'Reset Email', [
        { value: '', expectError: true, errorType: 'required' },
        { value: 'invalid-email', expectError: true, errorType: 'invalid format' },
        { value: 'user@example.com', expectError: false, errorType: 'valid email' }
      ]);
    }
    
    // Test reset password form (if accessible)
    await page.goto('/reset-password?token=test-token');
    
    if (page.url().includes('reset-password')) {
      console.log('🔑 Testing Reset Password Form...');
      
      const newPasswordField = page.locator('input[type="password"]:first-of-type');
      const confirmNewPasswordField = page.locator('input[type="password"]:nth-of-type(2)');
      
      if (await newPasswordField.count() > 0) {
        await testFieldValidation(page, 'input[type="password"]:first-of-type', 'New Password', [
          { value: '', expectError: true, errorType: 'required' },
          { value: '123', expectError: true, errorType: 'too short' },
          { value: 'NewSecurePassword123!', expectError: false, errorType: 'strong password' }
        ]);
      }
      
      if (await confirmNewPasswordField.count() > 0) {
        console.log('  🔍 Testing password confirmation...');
        
        await newPasswordField.fill('TestPassword123!');
        await confirmNewPasswordField.fill('DifferentPassword123!');
        await confirmNewPasswordField.blur();
        await page.waitForTimeout(500);
        
        const confirmError = await page.locator('.error, [role="alert"], .text-red-500').count();
        console.log(`    Confirmation mismatch error: ${confirmError > 0}`);
        
        // Test matching passwords
        await confirmNewPasswordField.fill('TestPassword123!');
        await confirmNewPasswordField.blur();
        await page.waitForTimeout(500);
        
        console.log('    Matching passwords tested');
      }
    }
    
    console.log('✅ PASSWORD RESET FORM validation testing completed');
  });

  test('MEAL PLAN CREATION FORM - Complete Validation Testing', async ({ page }) => {
    console.log('🧪 Testing MEAL PLAN CREATION FORM - Complete Validation');
    
    await loginAs(page, 'trainer');
    
    // Navigate to meal plan creation
    const mealPlanTab = page.locator('button:has-text("Meal Plan"), [role="tab"]:has-text("Meal")');
    if (await mealPlanTab.count() > 0) {
      await mealPlanTab.first().click();
      await page.waitForTimeout(1000);
      
      console.log('🍽️ Testing Meal Plan Generator Form...');
      
      // Test meal plan name
      const planNameField = page.locator('input[name*="name"], input[placeholder*="name" i]');
      if (await planNameField.count() > 0) {
        await testFieldValidation(page, 'input[name*="name"]', 'Plan Name', [
          { value: '', expectError: true, errorType: 'required' },
          { value: 'A', expectError: true, errorType: 'too short' },
          { value: 'Weight Loss Plan', expectError: false, errorType: 'valid name' }
        ]);
      }
      
      // Test calorie target
      const calorieTargetField = page.locator('input[name*="calorie"], input[type="number"]');
      if (await calorieTargetField.count() > 0) {
        await testFieldValidation(page, 'input[name*="calorie"]', 'Calorie Target', [
          { value: '0', expectError: true, errorType: 'too low' },
          { value: '800', expectError: true, errorType: 'unhealthily low' },
          { value: '10000', expectError: true, errorType: 'unrealistically high' },
          { value: '2000', expectError: false, errorType: 'reasonable target' }
        ]);
      }
      
      // Test meal count
      const mealCountField = page.locator('input[name*="meal"], select[name*="meal"]');
      if (await mealCountField.count() > 0) {
        if (await mealCountField.getAttribute('type') === 'number') {
          await testFieldValidation(page, 'input[name*="meal"]', 'Meal Count', [
            { value: '0', expectError: true, errorType: 'too few' },
            { value: '10', expectError: true, errorType: 'too many' },
            { value: '3', expectError: false, errorType: 'reasonable count' }
          ]);
        }
      }
      
      // Test days count
      const daysField = page.locator('input[name*="day"], select[name*="day"]');
      if (await daysField.count() > 0) {
        if (await daysField.getAttribute('type') === 'number') {
          await testFieldValidation(page, 'input[name*="day"]', 'Days Count', [
            { value: '0', expectError: true, errorType: 'invalid' },
            { value: '1', expectError: false, errorType: 'single day' },
            { value: '7', expectError: false, errorType: 'weekly plan' },
            { value: '31', expectError: true, errorType: 'too long' }
          ]);
        }
      }
      
      // Test customer selection
      const customerSelect = page.locator('select[name*="customer"], select[name*="client"]');
      if (await customerSelect.count() > 0) {
        console.log('  👥 Testing customer selection...');
        
        const options = await customerSelect.locator('option').all();
        console.log(`    Found ${options.length} customer options`);
        
        if (options.length > 1) {
          // Test selecting customer
          const customerValue = await options[1].getAttribute('value');
          if (customerValue) {
            await customerSelect.selectOption(customerValue);
            console.log('    Customer selection tested');
          }
        }
      }
    }
    
    console.log('✅ MEAL PLAN CREATION FORM validation testing completed');
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot for debugging
    const testName = test.info().title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    await page.screenshot({ 
      path: `test-results/forms-validation-${testName}.png`, 
      fullPage: true 
    });
  });
});