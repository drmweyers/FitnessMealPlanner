export const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:4000',
  timeout: {
    page: 30000,      // 30s for page loads
    action: 10000,    // 10s for user actions
    navigation: 30000 // 30s for navigation
  },
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  },
  retry: {
    count: 3,
    delay: 1000
  }
};