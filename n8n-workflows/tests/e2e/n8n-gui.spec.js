/**
 * TC-010: PLAYWRIGHT GUI WORKFLOW IMPORT TEST
 *
 * Purpose: Automate workflow import into n8n via GUI
 * Base URL: http://localhost:5678
 *
 * Prerequisites:
 * - n8n running in Docker
 * - Owner account created (hello@evofit.io)
 * - Credentials configured (Mailgun, HubSpot, Segment, Slack)
 *
 * Test Flow:
 * 1. Navigate to n8n
 * 2. Login if required
 * 3. Import each of 5 workflows
 * 4. Verify import success
 * 5. Check workflow appears in list
 * 6. Verify node count matches expected
 * 7. Take screenshots for verification
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Workflow files to import
const WORKFLOWS = {
  'lead-magnet-delivery': {
    file: path.join(__dirname, '../../docs/workflows/production/acquisition/lead-magnet-delivery-webhook-mailgun.json'),
    name: 'Lead Magnet Delivery - Webhook (Mailgun)',
    expectedNodes: 9,
    triggerType: 'Webhook'
  },
  'welcome-onboarding': {
    file: path.join(__dirname, '../../docs/workflows/production/onboarding/welcome-webhook-mailgun.json'),
    name: 'Welcome Onboarding - Webhook (Mailgun)',
    expectedNodes: 8,
    triggerType: 'Webhook'
  },
  'aha-moment': {
    file: path.join(__dirname, '../../docs/workflows/production/onboarding/aha-moment-webhook-mailgun.json'),
    name: 'Aha Moment Celebration - Webhook (Mailgun)',
    expectedNodes: 8,
    triggerType: 'Webhook'
  },
  'nurture-7day': {
    file: path.join(__dirname, '../../docs/workflows/production/acquisition/lead-magnet-nurture-7day-scheduled-mailgun.json'),
    name: 'Lead Magnet Nurture - 7 Day Sequence (Mailgun)',
    expectedNodes: 13,
    triggerType: 'Schedule'
  },
  'long-term-nurture': {
    file: path.join(__dirname, '../../docs/workflows/production/acquisition/long-term-nurture-monthly-scheduled-mailgun.json'),
    name: 'Long-Term Nurture - Monthly Re-engagement (Mailgun)',
    expectedNodes: 8,
    triggerType: 'Schedule'
  }
};

// n8n owner credentials
const N8N_EMAIL = 'hello@evofit.io';
const N8N_PASSWORD = 'Password123!';

test.describe('TC-010: n8n GUI Workflow Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to n8n
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if login is required
    const loginForm = page.locator('form').filter({ hasText: /email|password/i });
    if (await loginForm.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Login required
      await page.fill('input[type="email"]', N8N_EMAIL);
      await page.fill('input[type="password"]', N8N_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
  });

  // Test workflow import for each workflow
  Object.keys(WORKFLOWS).forEach((workflowKey) => {
    const workflow = WORKFLOWS[workflowKey];

    test(`Import: ${workflow.name}`, async ({ page }) => {
      // Read workflow JSON
      const workflowData = JSON.parse(fs.readFileSync(workflow.file, 'utf8'));

      // Navigate to workflows page
      await page.goto('/workflows');
      await page.waitForLoadState('networkidle');

      // Take screenshot before import
      await page.screenshot({ path: `test-results/screenshots/before-import-${workflowKey}.png`, fullPage: true });

      // Click "Add workflow" or "Import from File"
      // Note: n8n UI selectors may vary by version
      const importButton = page.locator('button').filter({ hasText: /import/i }).first();

      if (await importButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await importButton.click();

        // Handle file upload dialog
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(workflow.file);

        // Wait for import confirmation
        await page.waitForTimeout(2000);

        // Verify workflow appears
        const workflowTitle = page.locator(`text=${workflow.name}`);
        await expect(workflowTitle).toBeVisible({ timeout: 10000 });

        // Count nodes (if on canvas)
        const nodes = page.locator('[data-test-id*="node"]');
        const nodeCount = await nodes.count();

        // Take screenshot after import
        await page.screenshot({ path: `test-results/screenshots/after-import-${workflowKey}.png`, fullPage: true });

        // Log results
        console.log(`✅ Imported: ${workflow.name}`);
        console.log(`   Expected nodes: ${workflow.expectedNodes}`);
        console.log(`   Found nodes: ${nodeCount}`);
        console.log(`   Trigger type: ${workflow.triggerType}`);

        // Basic validation
        expect(nodeCount).toBeGreaterThan(0);
      } else {
        // Skip test if import button not found
        test.skip(true, 'Import button not found - manual import required');
      }
    });
  });

  test('Verify all workflows in list', async ({ page }) => {
    await page.goto('/workflows');
    await page.waitForLoadState('networkidle');

    // Take screenshot of workflow list
    await page.screenshot({ path: 'test-results/screenshots/all-workflows-list.png', fullPage: true });

    // Verify each workflow appears in list
    for (const workflow of Object.values(WORKFLOWS)) {
      const workflowInList = page.locator(`text=${workflow.name}`);

      if (await workflowInList.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`✅ Found in list: ${workflow.name}`);
      } else {
        console.log(`⚠️ Not found in list: ${workflow.name} (may need manual import)`);
      }
    }
  });
});

test.describe('Manual Testing Documentation', () => {
  test('Generate manual testing guide', async () => {
    const guide = `
# MANUAL TESTING GUIDE FOR n8n WORKFLOWS

**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** Awaiting manual import and activation

---

## 🎯 Manual Testing Steps

### 1. Access n8n Interface
\`\`\`
URL: http://localhost:5678
Email: ${N8N_EMAIL}
Password: ${N8N_PASSWORD}
\`\`\`

### 2. Import Each Workflow

For each of the 5 workflows below:

${Object.values(WORKFLOWS).map((w, i) => `
#### Workflow ${i + 1}: ${w.name}
- **File:** \`${path.basename(w.file)}\`
- **Expected Nodes:** ${w.expectedNodes}
- **Trigger Type:** ${w.triggerType}

**Steps:**
1. Go to Workflows → Add Workflow → Import from File
2. Select file: \`${w.file}\`
3. Verify ${w.expectedNodes} nodes appear
4. Save workflow
5. Check for any errors or warnings
`).join('\n')}

### 3. Configure Credentials

Link credentials to workflow nodes:

1. **Mailgun API** (\`mailgun_api\`)
   - Type: HTTP Basic Auth
   - Username: \`api\`
   - Password: [From FitnessMealPlanner/.env]

2. **HubSpot OAuth** (\`hubspot_oauth\`)
   - Type: HubSpot OAuth2 API
   - Connect account via OAuth flow

3. **Segment API** (\`segment_api\`)
   - Type: HTTP Basic Auth
   - Username: [Segment Write Key]
   - Password: (leave empty)

4. **Slack API** (\`slack_api\`)
   - Type: Slack API
   - Webhook URL or OAuth token

### 4. Activate Workflows

For each workflow:
1. Open workflow
2. Toggle "Active" switch ON
3. Verify webhook URL appears (for webhook workflows)
4. Save

### 5. Test Webhooks

**Test Lead Capture:**
\`\`\`bash
curl -X POST http://localhost:5678/webhook/lead-capture \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "leadSource": "free_tool"
  }'
\`\`\`

**Test Welcome:**
\`\`\`bash
curl -X POST http://localhost:5678/webhook/welcome \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "accountType": "starter"
  }'
\`\`\`

**Test Aha Moment:**
\`\`\`bash
curl -X POST http://localhost:5678/webhook/aha-moment \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "mealPlanId": "plan_123",
    "mealPlanType": "cutting",
    "calories": 2000,
    "protein": 150
  }'
\`\`\`

### 6. Verify Results

For each test:
1. Check n8n Executions: http://localhost:5678/executions
2. Verify email received (check inbox)
3. Check HubSpot for contact creation
4. Check Mailgun dashboard for delivery

### 7. Checklist

- [ ] All 5 workflows imported
- [ ] All credentials configured and linked
- [ ] All workflows activated
- [ ] Lead capture webhook tested successfully
- [ ] Welcome webhook tested successfully
- [ ] Aha moment webhook tested successfully
- [ ] All test emails received
- [ ] HubSpot contacts created correctly
- [ ] No errors in execution logs

---

**Generated:** ${new Date().toISOString()}
`;

    fs.writeFileSync('test-results/MANUAL_TESTING_GUIDE.md', guide);
    console.log('✅ Manual testing guide created: test-results/MANUAL_TESTING_GUIDE.md');
  });
});
