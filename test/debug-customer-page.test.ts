import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Customer Page Debugging Suite', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:4000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    page = await browser.newPage();
    
    // Enable request interception to log all network requests
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      console.log(`📤 Request: ${request.method()} ${request.url()}`);
      request.continue();
    });
    
    page.on('response', (response) => {
      console.log(`📥 Response: ${response.status()} ${response.url()}`);
    });
    
    // Log console messages from the browser
    page.on('console', (msg) => {
      console.log(`🖥️  Browser Console [${msg.type()}]: ${msg.text()}`);
    });
    
    // Log page errors
    page.on('pageerror', (error) => {
      console.error('🚨 Page Error:', error.message);
    });
    
    // Log failed requests
    page.on('requestfailed', (request) => {
      console.error('❌ Request Failed:', request.url(), request.failure()?.errorText);
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should check server health endpoint', async () => {
    const response = await page.goto(`${baseUrl}/api/health`);
    expect(response?.status()).toBe(200);
    
    const content = await page.content();
    expect(content).toContain('ok');
    console.log('✅ Server health check passed');
  });

  it('should load the main page without errors', async () => {
    const response = await page.goto(baseUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📄 Main page response status: ${response?.status()}`);
    expect(response?.status()).toBe(200);
    
    // Check for any JavaScript errors
    const errors = await page.evaluate(() => {
      return window.console.error.toString();
    });
    
    console.log('🔍 Checking for JavaScript load errors...');
    
    // Wait for React to load
    await page.waitForFunction(() => {
      return window.React !== undefined || document.querySelector('[data-reactroot]') !== null;
    }, { timeout: 10000 }).catch(() => {
      console.log('⚠️  React not detected in 10 seconds');
    });
  });

  it('should attempt to navigate to customer page directly', async () => {
    console.log('🎯 Testing direct navigation to /my-meal-plans...');
    
    const response = await page.goto(`${baseUrl}/my-meal-plans`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`📄 Customer page response status: ${response?.status()}`);
    
    // Wait a bit for any redirects or dynamic content
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`🌐 Current URL after navigation: ${currentUrl}`);
    
    // Check what's actually rendered
    const bodyContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        hasErrorBoundary: document.body.innerHTML.includes('error'),
        hasLoadingSpinner: document.body.innerHTML.includes('spinner') || document.body.innerHTML.includes('loading'),
        scripts: Array.from(document.scripts).map(s => s.src).filter(src => src),
        bodyHTML: document.body.innerHTML.substring(0, 1000)
      };
    });
    
    console.log('📋 Page Content Analysis:');
    console.log('Title:', bodyContent.title);
    console.log('Has React Root:', bodyContent.hasReactRoot);
    console.log('Has Error Boundary:', bodyContent.hasErrorBoundary);
    console.log('Has Loading Spinner:', bodyContent.hasLoadingSpinner);
    console.log('Scripts Loaded:', bodyContent.scripts);
    console.log('Body Text (first 500 chars):', bodyContent.bodyText);
    console.log('Body HTML (first 1000 chars):', bodyContent.bodyHTML);
  });

  it('should test authentication flow', async () => {
    console.log('🔐 Testing authentication...');
    
    // Go to login page
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    
    // Check if login form exists
    const hasLoginForm = await page.evaluate(() => {
      return !!document.querySelector('form') || 
             !!document.querySelector('input[type="email"]') ||
             !!document.querySelector('input[type="password"]');
    });
    
    console.log('📝 Login form detected:', hasLoginForm);
    
    if (hasLoginForm) {
      console.log('✅ Login page renders correctly');
    } else {
      console.log('❌ Login page not rendering properly');
      
      // Debug what's actually on the login page
      const loginPageContent = await page.evaluate(() => ({
        html: document.body.innerHTML.substring(0, 1000),
        text: document.body.innerText.substring(0, 500)
      }));
      
      console.log('🔍 Login page content:', loginPageContent);
    }
  });

  it('should check for CSS and JavaScript loading issues', async () => {
    console.log('🎨 Checking CSS and JavaScript loading...');
    
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    
    // Check for loaded resources
    const resources = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets).map(sheet => {
        try {
          return { href: sheet.href, rules: sheet.cssRules?.length || 0 };
        } catch (e) {
          return { href: sheet.href, error: 'CORS or loading error' };
        }
      });
      
      const scripts = Array.from(document.scripts).map(script => ({
        src: script.src,
        loaded: !script.src || script.readyState === 'complete'
      }));
      
      return { styles, scripts };
    });
    
    console.log('🎨 CSS Stylesheets:', resources.styles);
    console.log('📜 JavaScript Scripts:', resources.scripts);
    
    // Check for Vite HMR
    const hasVite = await page.evaluate(() => {
      return !!(window as any).__vite_is_modern_browser;
    });
    
    console.log('⚡ Vite HMR detected:', hasVite);
  });

  it('should test API endpoints availability', async () => {
    console.log('🔌 Testing API endpoints...');
    
    const endpoints = [
      '/api/health',
      '/api/auth/profile',
      '/api/meal-plan/personalized'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.goto(`${baseUrl}${endpoint}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });
        console.log(`📡 ${endpoint}: ${response?.status()}`);
      } catch (error) {
        console.log(`❌ ${endpoint}: Error - ${error.message}`);
      }
    }
  });
});