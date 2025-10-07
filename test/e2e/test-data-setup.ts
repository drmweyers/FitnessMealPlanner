/**
 * TEST DATA SETUP AND HELPERS FOR E2E TESTING
 * 
 * This file provides common test data, helper functions, and utilities
 * used across all E2E test suites for FitnessMealPlanner.
 */

export const TEST_ACCOUNTS = {
  admin: {
    username: 'admin@fitmeal.pro',
    password: 'Admin123!@#',
    role: 'admin' as const
  },
  trainer: {
    username: 'testtrainer@example.com', 
    password: 'TrainerPassword123!',
    role: 'trainer' as const
  },
  customer: {
    username: 'testcustomer@example.com',
    password: 'TestPassword123!', 
    role: 'customer' as const
  }
};

export const HEALTH_PROTOCOL_KEYWORDS = [
  'health protocol',
  'Health Protocol', 
  'HEALTH PROTOCOL',
  'protocol assignment',
  'Protocol Assignment',
  'specialized protocol',
  'Specialized Protocol',
  'TrainerHealthProtocols',
  'SpecializedProtocolsPanel',
  'protocolAssignments',
  'health-protocol',
  'healthProtocol'
];

/**
 * Take a timestamped screenshot for evidence
 */
export async function takeEvidenceScreenshot(
  page: any, 
  category: string, 
  description: string,
  fullPage: boolean = true
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `evidence-${category}-${description}-${timestamp}.png`;
  
  await page.screenshot({
    path: `test-results/${filename}`,
    fullPage
  });
  
  console.log(`📸 Evidence screenshot: ${filename}`);
  return filename;
}

/**
 * Validate that Health Protocol content is absent from page
 */
export async function verifyHealthProtocolAbsence(page: any, pageName: string): Promise<void> {
  const pageContent = await page.content();
  const foundKeywords: string[] = [];
  
  for (const keyword of HEALTH_PROTOCOL_KEYWORDS) {
    if (pageContent.toLowerCase().includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }
  
  if (foundKeywords.length > 0) {
    await takeEvidenceScreenshot(page, 'health-protocol-violation', pageName);
    throw new Error(`Health Protocol content found on ${pageName}: ${foundKeywords.join(', ')}`);
  }
  
  console.log(`✅ ${pageName}: Health Protocol absence verified`);
}

/**
 * Setup test environment with common configurations
 */
export async function setupTestEnvironment(): Promise<void> {
  console.log('🔧 Setting up test environment...');
  // Add any common test setup here
  console.log('✅ Test environment setup complete');
}
