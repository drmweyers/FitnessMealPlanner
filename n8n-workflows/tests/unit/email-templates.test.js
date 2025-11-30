/**
 * EMAIL TEMPLATE RENDERING TESTS
 *
 * Purpose: Validate email template code nodes render correctly
 * Test Cases: TC-003, TC-004
 *
 * Validates:
 * - Email HTML generation
 * - Dynamic personalization
 * - Tier-specific content
 * - Day calculation logic (7-day nurture)
 * - No template errors or broken variables
 */

const fs = require('fs');
const path = require('path');

// Load workflows
const loadWorkflow = (name) => {
  const basePath = path.join(__dirname, '../../docs/workflows/production');
  const workflows = {
    'welcome': path.join(basePath, 'onboarding/welcome-webhook-mailgun.json'),
    'aha-moment': path.join(basePath, 'onboarding/aha-moment-webhook-mailgun.json'),
    'lead-magnet': path.join(basePath, 'acquisition/lead-magnet-delivery-webhook-mailgun.json'),
    'nurture-7day': path.join(basePath, 'acquisition/lead-magnet-nurture-7day-scheduled-mailgun.json'),
    'long-term': path.join(basePath, 'acquisition/long-term-nurture-monthly-scheduled-mailgun.json')
  };

  const content = fs.readFileSync(workflows[name], 'utf8');
  return JSON.parse(content);
};

// Extract code from code nodes
const extractCodeNode = (workflow, nodeName) => {
  const node = workflow.nodes.find(n => n.name.includes(nodeName));
  if (!node || node.type !== 'n8n-nodes-base.code') {
    throw new Error(`Code node "${nodeName}" not found in workflow`);
  }
  return node.parameters.jsCode;
};

// Safe eval wrapper for code node execution
const executeCodeNode = (code, inputData) => {
  const $json = inputData;
  const $input = { all: () => [{ json: inputData }] };
  const $now = { toISO: () => new Date().toISOString() };

  // Execute the code in a sandboxed context
  const func = new Function('$json', '$input', '$now', code + '\nreturn { json: json || $json };');
  return func($json, $input, $now);
};

describe('TC-003: Email Template Rendering', () => {
  describe('Welcome Email Templates', () => {
    const workflow = loadWorkflow('welcome');
    const code = extractCodeNode(workflow, 'Tier-Specific Email');

    const testCases = [
      { accountType: 'starter', firstName: 'John', expectedSubject: 'Welcome to EvoFitMeals Starter' },
      { accountType: 'professional', firstName: 'Sarah', expectedSubject: 'Welcome to EvoFitMeals Professional' },
      { accountType: 'enterprise', firstName: 'Mike', expectedSubject: 'Welcome to EvoFitMeals Enterprise' },
      { accountType: 'trial', firstName: 'Lisa', expectedSubject: 'Start Your EvoFitMeals Trial' },
      { accountType: 'lifetime', firstName: 'Alex', expectedSubject: 'Welcome to EvoFitMeals Lifetime' }
    ];

    testCases.forEach(({ accountType, firstName, expectedSubject }) => {
      test(`Renders ${accountType} tier email correctly`, () => {
        const input = {
          accountType,
          firstName,
          email: 'test@example.com',
          lastName: 'TestUser',
          customerId: 'cus_123',
          subscriptionId: 'sub_123',
          submittedAt: new Date().toISOString()
        };

        const result = executeCodeNode(code, input);

        // Verify output structure
        expect(result.json).toHaveProperty('subject');
        expect(result.json).toHaveProperty('htmlContent');

        // Verify subject line
        expect(result.json.subject).toContain(expectedSubject);

        // Verify personalization
        expect(result.json.htmlContent).toContain(firstName);

        // Verify HTML structure
        expect(result.json.htmlContent).toContain('<h1>');
        expect(result.json.htmlContent).toContain('</h1>');
        expect(result.json.htmlContent).toContain('<p>');

        // Verify no undefined variables
        expect(result.json.htmlContent).not.toContain('undefined');
        expect(result.json.htmlContent).not.toContain('null');

        // Verify CTA link exists
        expect(result.json.htmlContent).toContain('evofitmeals.com');
      });
    });
  });

  describe('Aha Moment Email Template', () => {
    const workflow = loadWorkflow('aha-moment');
    const code = extractCodeNode(workflow, 'Celebration Email');

    test('Renders celebration email with meal plan details', () => {
      const input = {
        firstName: 'Test',
        mealPlanType: 'cutting',
        calories: 2000,
        protein: 150,
        email: 'test@example.com'
      };

      const result = executeCodeNode(code, input);

      expect(result.json.subject).toContain('Amazing! You Created Your First Meal Plan');
      expect(result.json.htmlContent).toContain('Test');
      expect(result.json.htmlContent).toContain('cutting');
      expect(result.json.htmlContent).toContain('2000');
      expect(result.json.htmlContent).toContain('150');
      expect(result.json.htmlContent).not.toContain('undefined');
    });
  });

  describe('Lead Magnet Email Template', () => {
    const workflow = loadWorkflow('lead-magnet');
    const code = extractCodeNode(workflow, 'Lead Magnet Email');

    test('Renders lead magnet delivery email', () => {
      const input = {
        firstName: 'Jordan',
        email: 'jordan@example.com',
        leadSource: 'free_tool'
      };

      const result = executeCodeNode(code, input);

      expect(result.json.subject).toContain('Your Free Meal Planning Tool');
      expect(result.json.htmlContent).toContain('Jordan');
      expect(result.json.htmlContent).toContain('Next Steps');
      expect(result.json.htmlContent).toContain('Upgrade to Pro');
      expect(result.json.htmlContent).not.toContain('undefined');
    });
  });

  describe('Long-Term Nurture Email Template', () => {
    const workflow = loadWorkflow('long-term');
    const code = extractCodeNode(workflow, 'Re-engagement Email');

    test('Renders monthly re-engagement email with current month', () => {
      const input = {
        firstname: 'Chris',
        email: 'chris@example.com'
      };

      const result = executeCodeNode(code, input);

      // Verify month is included in subject
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonth = months[new Date().getMonth()];

      expect(result.json.subject).toContain(currentMonth);
      expect(result.json.subject).toContain('Check-In');
      expect(result.json.htmlContent).toContain('Chris');
      expect(result.json.htmlContent).toContain(currentMonth);
      expect(result.json.htmlContent).toContain('COMEBACK50');
      expect(result.json.htmlContent).not.toContain('undefined');
    });
  });
});

describe('TC-004: Day Calculation Logic (7-Day Nurture)', () => {
  const workflow = loadWorkflow('nurture-7day');
  const code = extractCodeNode(workflow, 'Nurture Day');

  const testScenarios = [
    {
      daysSinceStart: 1,
      expectedDay: 1,
      expectedSubject: 'Quick Win: Master Meal Planning in 10 Minutes'
    },
    {
      daysSinceStart: 3,
      expectedDay: 3,
      expectedSubject: 'How Sarah Lost 15 lbs Using This Strategy'
    },
    {
      daysSinceStart: 5,
      expectedDay: 5,
      expectedSubject: 'Special Offer: Transform Your Nutrition Game'
    },
    {
      daysSinceStart: 7,
      expectedDay: 7,
      expectedSubject: 'Your Bonus Expires in 48 Hours'
    },
    {
      daysSinceStart: 10,
      expectedDay: 10,
      expectedSubject: 'Last Chance: Offer Expires Tonight at Midnight'
    },
    {
      daysSinceStart: 2,
      expectedDay: null,
      shouldSendEmail: false
    },
    {
      daysSinceStart: 6,
      expectedDay: null,
      shouldSendEmail: false
    }
  ];

  testScenarios.forEach(scenario => {
    const { daysSinceStart, expectedDay, expectedSubject, shouldSendEmail = true } = scenario;

    test(`Day ${daysSinceStart}: ${shouldSendEmail ? 'Sends email' : 'No email sent'}`, () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - (daysSinceStart * 24 * 60 * 60 * 1000));

      const input = [{
        json: {
          email: 'test@example.com',
          firstname: 'Test',
          nurture_sequence_start_date: startDate.toISOString(),
          hs_lifecyclestage_customer_date: null
        }
      }];

      // Mock $input.all()
      const $input = { all: () => input };
      const func = new Function('$input', code + '\nreturn enrichedContacts.filter(item => item.json.shouldSendEmail);');
      const results = func($input);

      if (shouldSendEmail) {
        expect(results.length).toBe(1);
        expect(results[0].json.emailDay).toBe(expectedDay);
        expect(results[0].json.emailSubject).toContain(expectedSubject);
        expect(results[0].json.shouldSendEmail).toBe(true);
      } else {
        expect(results.length).toBe(0);
      }
    });
  });
});
