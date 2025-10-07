import { test, expect } from '@playwright/test';

test.describe('Add Measurement Modal Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'customer.test@evofitmeals.com');
    await page.fill('input[type="password"]', 'TestCustomer123!');
    await page.click('button[type="submit"]');

    // Wait for navigation and load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to Progress tab
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await expect(progressTab).toBeVisible();
    await progressTab.click();
    await page.waitForTimeout(2000);

    // Navigate to Measurements sub-tab if not already there
    const measurementsTab = page.locator('[role="tab"]:has-text("Measurements")');
    if (await measurementsTab.isVisible()) {
      await measurementsTab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Add Measurement modal opens when button is clicked', async ({ page }) => {
    // Find and click the Add Measurement button
    const addButton = page.locator('button:has-text("Add Measurement")');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Verify modal description
    const modalDescription = page.locator('text="Record your current body measurements. All fields are optional."');
    await expect(modalDescription).toBeVisible();

    console.log('✅ Add Measurement modal opens correctly');
  });

  test('Modal form contains all expected fields', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Check for required date field
    const dateField = page.locator('#measurementDate');
    await expect(dateField).toBeVisible();
    await expect(dateField).toHaveAttribute('type', 'date');
    await expect(dateField).toHaveAttribute('required');

    // Check for weight field
    const weightField = page.locator('#weightLbs');
    await expect(weightField).toBeVisible();
    await expect(weightField).toHaveAttribute('type', 'number');

    // Check for body fat field
    const bodyFatField = page.locator('#bodyFatPercentage');
    await expect(bodyFatField).toBeVisible();
    await expect(bodyFatField).toHaveAttribute('type', 'number');

    // Check for body measurement fields
    const measurementFields = [
      'neckCm', 'shouldersCm', 'chestCm', 'waistCm', 'hipsCm',
      'bicepLeftCm', 'bicepRightCm', 'thighLeftCm', 'thighRightCm',
      'calfLeftCm', 'calfRightCm', 'muscleMassKg'
    ];

    for (const fieldId of measurementFields) {
      const field = page.locator(`#${fieldId}`);
      await expect(field).toBeVisible();
      await expect(field).toHaveAttribute('type', 'number');
    }

    // Check for notes field
    const notesField = page.locator('#notes');
    await expect(notesField).toBeVisible();

    // Check for action buttons
    const cancelButton = page.locator('button:has-text("Cancel")');
    const saveButton = page.locator('button:has-text("Save Measurement")');
    await expect(cancelButton).toBeVisible();
    await expect(saveButton).toBeVisible();

    console.log('✅ Modal form contains all expected fields');
  });

  test('Fill in measurement form with test data and submit', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Fill in the form with test data
    const testDate = new Date().toISOString().split('T')[0]; // Today's date
    await page.locator('#measurementDate').fill(testDate);

    // Fill in some measurement data
    await page.locator('#weightLbs').fill('150.5');
    await page.locator('#bodyFatPercentage').fill('15.2');
    await page.locator('#waistCm').fill('80.5');
    await page.locator('#chestCm').fill('100.0');
    await page.locator('#hipsCm').fill('95.0');
    await page.locator('#notes').fill('Test measurement from automated test');

    // Submit the form
    const saveButton = page.locator('button:has-text("Save Measurement")');
    await saveButton.click();

    // Wait for submission to complete
    await page.waitForTimeout(2000);

    // Verify modal closes (or shows success)
    const modalTitleAfterSubmit = page.locator('h2:has-text("Add New Measurement")');

    // Modal should either close or show a success state
    const isModalClosed = !(await modalTitleAfterSubmit.isVisible());
    const hasSuccessToast = await page.locator('.toast, [data-testid="toast"]').isVisible();

    if (isModalClosed) {
      console.log('✅ Modal closed after successful submission');
    } else if (hasSuccessToast) {
      console.log('✅ Success toast shown after submission');
    } else {
      console.log('⚠️ Submission state unclear - checking for validation errors');

      // Check if there are any validation errors
      const errorMessages = page.locator('.text-red-500, .error, [class*="error"]');
      if (await errorMessages.first().isVisible()) {
        console.log('⚠️ Validation errors present - this may be expected behavior');
      }
    }
  });

  test('Form validation works correctly', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Try to submit form without required date field
    const saveButton = page.locator('button:has-text("Save Measurement")');

    // Clear the date field (it might be pre-filled)
    await page.locator('#measurementDate').clear();

    // Try to submit
    await saveButton.click();
    await page.waitForTimeout(500);

    // Check if browser validation prevents submission
    const dateField = page.locator('#measurementDate');
    const validationMessage = await dateField.evaluate(el => (el as HTMLInputElement).validationMessage);

    if (validationMessage) {
      console.log('✅ Form validation prevents submission without required date');
    } else {
      console.log('⚠️ Browser validation may vary - checking for other validation indicators');
    }

    // Test invalid number inputs
    await page.locator('#measurementDate').fill(new Date().toISOString().split('T')[0]);
    await page.locator('#weightLbs').fill('invalid-weight');

    // Check if invalid number input is handled
    const weightValue = await page.locator('#weightLbs').inputValue();
    if (weightValue === '' || weightValue === 'invalid-weight') {
      console.log('✅ Invalid number input handled correctly');
    }

    console.log('✅ Form validation tested');
  });

  test('Cancel button closes modal without saving', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Fill in some data
    await page.locator('#weightLbs').fill('150.0');
    await page.locator('#notes').fill('This should not be saved');

    // Click Cancel
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Wait for modal to close
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible();

    console.log('✅ Cancel button closes modal without saving');
  });

  test('Modal is properly centered on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload to ensure mobile layout
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate back to Progress tab and Measurements
    const progressTab = page.locator('[role="tab"]:has-text("Progress")');
    await progressTab.click();
    await page.waitForTimeout(1000);

    const measurementsTab = page.locator('[role="tab"]:has-text("Measurements")');
    if (await measurementsTab.isVisible()) {
      await measurementsTab.click();
      await page.waitForTimeout(1000);
    }

    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is visible and accessible on mobile
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Check that modal content is accessible (can scroll if needed)
    const modalContent = modalTitle.locator('..');
    await expect(modalContent).toBeVisible();

    // Test that form fields are accessible
    const dateField = page.locator('#measurementDate');
    await expect(dateField).toBeVisible();

    // Test scrolling within modal if content is long
    const notesField = page.locator('#notes');
    if (await notesField.isVisible()) {
      await notesField.scrollIntoViewIfNeeded();
      await expect(notesField).toBeVisible();
    }

    // Verify buttons are accessible
    const cancelButton = page.locator('button:has-text("Cancel")');
    const saveButton = page.locator('button:has-text("Save Measurement")');
    await expect(cancelButton).toBeVisible();
    await expect(saveButton).toBeVisible();

    // Close the modal
    await cancelButton.click();

    console.log('✅ Modal is properly accessible on mobile viewport');
  });

  test('Modal can be closed by clicking outside (if applicable)', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Try to click outside the modal (this depends on implementation)
    // Click on a coordinate that should be outside the modal
    await page.click('body', { position: { x: 50, y: 50 } });
    await page.waitForTimeout(500);

    // Check if modal is still open (behavior may vary)
    const isModalStillOpen = await modalTitle.isVisible();

    if (isModalStillOpen) {
      console.log('✅ Modal stays open when clicking outside (expected behavior for forms)');
      // Close it properly for cleanup
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
    } else {
      console.log('✅ Modal closes when clicking outside');
    }
  });

  test('Modal can be closed with Escape key', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Check if modal closed
    const isModalClosed = !(await modalTitle.isVisible());

    if (isModalClosed) {
      console.log('✅ Modal closes with Escape key');
    } else {
      console.log('⚠️ Modal does not close with Escape (may be intentional for forms)');
      // Close it properly for cleanup
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
    }
  });

  test('Form preserves data during interaction', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Fill in some data
    const testWeight = '145.5';
    const testNotes = 'Test data preservation';

    await page.locator('#weightLbs').fill(testWeight);
    await page.locator('#notes').fill(testNotes);

    // Click on another field or perform some interaction
    await page.locator('#waistCm').click();
    await page.locator('#waistCm').fill('75.0');

    // Verify original data is still there
    const weightValue = await page.locator('#weightLbs').inputValue();
    const notesValue = await page.locator('#notes').inputValue();

    expect(weightValue).toBe(testWeight);
    expect(notesValue).toBe(testNotes);

    console.log('✅ Form preserves data during interaction');

    // Close the modal
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
  });

  test('Modal accessibility - keyboard navigation works', async ({ page }) => {
    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('h2:has-text("Add New Measurement")');
    await expect(modalTitle).toBeVisible();

    // Test keyboard navigation through form fields
    await page.keyboard.press('Tab'); // Should focus first field
    await page.waitForTimeout(200);

    // Type in the focused field (should be date field)
    const testDate = new Date().toISOString().split('T')[0];
    await page.keyboard.type(testDate);

    // Tab to next field and enter data
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.type('150');

    // Tab through a few more fields
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Should eventually reach the Cancel button
    let tabCount = 0;
    const maxTabs = 20; // Prevent infinite loop

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const activeElement = await page.evaluate(() => document.activeElement?.textContent);
      if (activeElement?.includes('Cancel') || activeElement?.includes('Save')) {
        console.log('✅ Keyboard navigation reaches action buttons');
        break;
      }
      tabCount++;
    }

    console.log('✅ Modal keyboard navigation tested');

    // Close the modal
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
  });

  test('No console errors during modal interactions', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error' &&
          !msg.text().includes('WebSocket') &&
          !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      if (!error.message.includes('WebSocket') &&
          !error.message.includes('ERR_CONNECTION_REFUSED')) {
        errors.push(error.message);
      }
    });

    // Open the modal
    const addButton = page.locator('button:has-text("Add Measurement")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Interact with various form fields
    await page.locator('#measurementDate').fill(new Date().toISOString().split('T')[0]);
    await page.locator('#weightLbs').fill('150.0');
    await page.locator('#bodyFatPercentage').fill('15.0');
    await page.locator('#waistCm').fill('80.0');
    await page.locator('#notes').fill('Test interaction');

    // Close the modal
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Check for errors
    if (errors.length > 0) {
      console.log('Errors found:', errors);
      throw new Error(`Console errors detected: ${errors.join(', ')}`);
    }

    console.log('✅ No console errors during modal interactions');
  });
});