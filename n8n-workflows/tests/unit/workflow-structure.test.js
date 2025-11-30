/**
 * WORKFLOW STRUCTURE VALIDATION TESTS
 *
 * Purpose: Validate all 5 Mailgun workflows for structural integrity
 * Test Cases: TC-001, TC-002, TC-005, TC-006
 *
 * Validates:
 * - JSON structure completeness
 * - Required workflow fields
 * - Node configurations
 * - Credential references
 * - Webhook paths
 * - Mailgun API endpoints
 */

const fs = require('fs');
const path = require('path');

// Workflow file paths
const WORKFLOWS = {
  'lead-magnet-delivery': path.join(__dirname, '../../docs/workflows/production/acquisition/lead-magnet-delivery-webhook-mailgun.json'),
  'lead-magnet-nurture-7day': path.join(__dirname, '../../docs/workflows/production/acquisition/lead-magnet-nurture-7day-scheduled-mailgun.json'),
  'long-term-nurture-monthly': path.join(__dirname, '../../docs/workflows/production/acquisition/long-term-nurture-monthly-scheduled-mailgun.json'),
  'welcome-webhook': path.join(__dirname, '../../docs/workflows/production/onboarding/welcome-webhook-mailgun.json'),
  'aha-moment-webhook': path.join(__dirname, '../../docs/workflows/production/onboarding/aha-moment-webhook-mailgun.json')
};

// Expected webhook paths from FitnessMealPlanner integration
const EXPECTED_WEBHOOK_PATHS = {
  'lead-magnet-delivery': 'lead-capture',
  'welcome-webhook': 'welcome',
  'aha-moment-webhook': 'aha-moment'
};

// Expected credential IDs
const EXPECTED_CREDENTIALS = {
  mailgun: 'mailgun_api',
  hubspot: 'hubspot_oauth',
  segment: 'segment_api',
  slack: 'slack_api'
};

describe('Workflow Structure Validation', () => {
  let workflows = {};

  beforeAll(() => {
    // Load all workflow files
    Object.keys(WORKFLOWS).forEach(name => {
      const filePath = WORKFLOWS[name];
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      workflows[name] = JSON.parse(content);
    });
  });

  describe('TC-001: Workflow JSON Structure Validation', () => {
    Object.keys(WORKFLOWS).forEach(workflowName => {
      test(`${workflowName} has valid JSON structure`, () => {
        const workflow = workflows[workflowName];

        // Verify required top-level fields
        expect(workflow).toHaveProperty('name');
        expect(workflow).toHaveProperty('nodes');
        expect(workflow).toHaveProperty('connections');
        expect(workflow).toHaveProperty('settings');
        expect(workflow).toHaveProperty('tags');
        expect(workflow).toHaveProperty('triggerCount');
        expect(workflow).toHaveProperty('active');

        // Verify nodes is an array
        expect(Array.isArray(workflow.nodes)).toBe(true);
        expect(workflow.nodes.length).toBeGreaterThan(0);

        // Verify connections is an object
        expect(typeof workflow.connections).toBe('object');

        // Verify tags array
        expect(Array.isArray(workflow.tags)).toBe(true);
        expect(workflow.tags).toContainEqual(expect.objectContaining({ name: 'mailgun' }));
      });
    });
  });

  describe('TC-002: Mailgun Node Configuration', () => {
    test('All workflows have correctly configured Mailgun nodes', () => {
      Object.keys(workflows).forEach(workflowName => {
        const workflow = workflows[workflowName];

        // Find Mailgun email sending nodes (HTTP Request nodes with Mailgun API)
        const mailgunNodes = workflow.nodes.filter(node =>
          node.type === 'n8n-nodes-base.httpRequest' &&
          node.parameters.url &&
          node.parameters.url.includes('api.mailgun.net')
        );

        expect(mailgunNodes.length).toBeGreaterThan(0);

        mailgunNodes.forEach(node => {
          // Verify Mailgun API endpoint
          expect(node.parameters.url).toBe('=https://api.mailgun.net/v3/evofitmeals.com/messages');

          // Verify HTTP method is POST (via form URL encoding)
          expect(node.parameters.sendBody).toBe(true);
          expect(node.parameters.specifyBody).toBe('formUrlEncoded');

          // Verify authentication
          expect(node.parameters.authentication).toBe('genericCredentialType');
          expect(node.parameters.genericAuthType).toBe('httpBasicAuth');

          // Verify credential reference
          expect(node.credentials).toHaveProperty('httpBasicAuth');
          expect(node.credentials.httpBasicAuth.id).toBe(EXPECTED_CREDENTIALS.mailgun);

          // Verify required email parameters
          const bodyParams = node.parameters.bodyParameters.parameters;
          const paramNames = bodyParams.map(p => p.name);

          expect(paramNames).toContain('from');
          expect(paramNames).toContain('to');
          expect(paramNames).toContain('subject');
          expect(paramNames).toContain('html');
          expect(paramNames).toContain('o:tracking');
          expect(paramNames).toContain('o:tracking-clicks');
          expect(paramNames).toContain('o:tracking-opens');

          // Verify retry configuration
          expect(node.retryOnFail).toBe(true);
          expect(node.maxTries).toBe(3);
        });
      });
    });
  });

  describe('TC-005: Credential Reference Validation', () => {
    test('All workflows reference correct credentials', () => {
      Object.keys(workflows).forEach(workflowName => {
        const workflow = workflows[workflowName];

        // Find all nodes with credentials
        const credentialedNodes = workflow.nodes.filter(node =>
          node.credentials && Object.keys(node.credentials).length > 0
        );

        expect(credentialedNodes.length).toBeGreaterThan(0);

        credentialedNodes.forEach(node => {
          // Check Mailgun credentials
          if (node.credentials.httpBasicAuth) {
            const credId = node.credentials.httpBasicAuth.id;
            expect([EXPECTED_CREDENTIALS.mailgun, EXPECTED_CREDENTIALS.segment]).toContain(credId);
          }

          // Check HubSpot credentials
          if (node.credentials.hubspotOAuth2Api) {
            expect(node.credentials.hubspotOAuth2Api.id).toBe(EXPECTED_CREDENTIALS.hubspot);
          }

          // Check Slack credentials
          if (node.credentials.slackApi) {
            expect(node.credentials.slackApi.id).toBe(EXPECTED_CREDENTIALS.slack);
          }
        });
      });
    });
  });

  describe('TC-006: Webhook Path Validation', () => {
    test('Webhook workflows have correct paths matching FitnessMealPlanner', () => {
      Object.keys(EXPECTED_WEBHOOK_PATHS).forEach(workflowName => {
        const workflow = workflows[workflowName];
        const expectedPath = EXPECTED_WEBHOOK_PATHS[workflowName];

        // Find webhook trigger node
        const webhookNode = workflow.nodes.find(node =>
          node.type === 'n8n-nodes-base.webhook'
        );

        expect(webhookNode).toBeDefined();
        expect(webhookNode.parameters.path).toBe(expectedPath);
        expect(webhookNode.parameters.httpMethod).toBe('POST');
        expect(webhookNode.parameters.responseMode).toBe('lastNode');
      });
    });
  });

  describe('Node Connection Validation', () => {
    test('All workflows have valid node connections', () => {
      Object.keys(workflows).forEach(workflowName => {
        const workflow = workflows[workflowName];

        // Verify connections object structure
        expect(typeof workflow.connections).toBe('object');

        // Verify each connection references existing nodes
        Object.keys(workflow.connections).forEach(sourceNodeName => {
          const connection = workflow.connections[sourceNodeName];

          // Verify source node exists
          const sourceNode = workflow.nodes.find(n => n.name === sourceNodeName);
          expect(sourceNode).toBeDefined();

          // Verify all target nodes exist
          if (connection.main && Array.isArray(connection.main)) {
            connection.main.forEach(outputs => {
              if (Array.isArray(outputs)) {
                outputs.forEach(target => {
                  const targetNode = workflow.nodes.find(n => n.name === target.node);
                  expect(targetNode).toBeDefined();
                  expect(target.type).toBe('main');
                  expect(typeof target.index).toBe('number');
                });
              }
            });
          }
        });
      });
    });
  });

  describe('Node Type Validation', () => {
    test('All nodes use valid n8n node types', () => {
      const validNodeTypes = [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.scheduleTrigger',
        'n8n-nodes-base.code',
        'n8n-nodes-base.if',
        'n8n-nodes-base.hubspot',
        'n8n-nodes-base.httpRequest',
        'n8n-nodes-base.slack',
        'n8n-nodes-base.splitInBatches'
      ];

      Object.keys(workflows).forEach(workflowName => {
        const workflow = workflows[workflowName];

        workflow.nodes.forEach(node => {
          expect(validNodeTypes).toContain(node.type);
          expect(node.id).toBeDefined();
          expect(node.name).toBeDefined();
          expect(node.parameters).toBeDefined();
        });
      });
    });
  });

  describe('Workflow Metadata Validation', () => {
    test('All workflows have proper tags and metadata', () => {
      Object.keys(workflows).forEach(workflowName => {
        const workflow = workflows[workflowName];

        // Verify fitnessmealplanner tag exists
        const tags = workflow.tags.map(t => t.name);
        expect(tags).toContain('fitnessmealplanner');
        expect(tags).toContain('mailgun');

        // Verify trigger count
        expect(typeof workflow.triggerCount).toBe('number');
        expect(workflow.triggerCount).toBeGreaterThanOrEqual(1);

        // Verify active status is boolean
        expect(typeof workflow.active).toBe('boolean');
      });
    });
  });
});
