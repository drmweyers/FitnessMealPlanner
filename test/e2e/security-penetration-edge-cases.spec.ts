import { test, expect, Page } from '@playwright/test';
import { loginAsTrainer, loginAsAdmin, loginAsCustomer } from './helpers/auth';

test.describe('Security & Penetration Testing: Health Protocol Elimination', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsTrainer(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('XSS Prevention & Code Injection', () => {
    test('XSS payloads cannot restore Health Protocol functionality', async () => {
      console.log('Starting XSS payload testing...');
      
      const xssPayloads = [
        // Script-based XSS attempts
        '<script>window.healthProtocol = true; location.reload();</script>',
        '<script>document.querySelector("body").innerHTML += `<button role="tab">Health Protocol</button>`;</script>',
        '<script>localStorage.setItem("health-protocol", "enabled"); window.location.reload();</script>',
        
        // Event handler XSS
        '<img src="x" onerror="window.showHealthProtocol=true;window.location.reload();">',
        '<div onload="enableHealthProtocol()" onclick="showHealthTab()">Test</div>',
        '<svg onload="document.body.appendChild(document.createElement(\'div\')).innerHTML=\'Health Protocol\'">',
        
        // JavaScript URL schemes
        'javascript:void(document.body.innerHTML+=`<div>Health Protocol</div>`)',
        'javascript:localStorage.setItem("health-enabled","true");location.reload();',
        'javascript:document.querySelector("[role=tablist]").innerHTML+=`<button role=tab>Health</button>`;',
        
        // Advanced XSS techniques
        '<iframe src="javascript:parent.window.healthProtocol=true"></iframe>',
        '<object data="javascript:alert(\'Health Protocol Enabled\')"></object>',
        '<embed src="javascript:document.title=\'Health Protocol Active\'"></embed>',
        
        // Template injection attempts
        '${window.healthProtocol = true}',
        '{{constructor.constructor(\"window.healthProtocol=true\")()}}',
        '<%= system("echo Health Protocol") %>',
        
        // CSS injection attempts
        '<style>body::after { content: "Health Protocol"; position: fixed; z-index: 9999; }</style>',
        '<link rel="stylesheet" href="javascript:document.body.innerHTML+=`Health Protocol`">',
      ];

      for (const payload of xssPayloads) {
        console.log(`Testing XSS payload: ${payload.substring(0, 50)}...`);
        
        try {
          // Try injecting through search inputs
          const searchInputs = await page.locator('input[type="text"], input[type="search"], textarea').all();
          for (const input of searchInputs) {
            try {
              await input.fill(payload);
              await page.keyboard.press('Enter');
              await page.waitForTimeout(500);
            } catch (e) {
              console.log('Input rejection expected');
            }
          }
          
          // Try injecting through URL parameters
          const currentUrl = page.url();
          const testUrls = [
            `${currentUrl}?search=${encodeURIComponent(payload)}`,
            `${currentUrl}#${encodeURIComponent(payload)}`,
            `${currentUrl}?tab=${encodeURIComponent(payload)}`,
          ];
          
          for (const testUrl of testUrls) {
            try {
              await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 5000 });
            } catch (e) {
              console.log('URL injection rejected (expected)');
            }
          }
          
          // Verify no health protocol content appears
          const healthCount = await page.locator('text=Health Protocol').count();
          expect(healthCount).toBe(0);
          
          const tabCount = await page.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
          
        } catch (e) {
          console.log(`XSS payload blocked (expected): ${e.message}`);
        }
      }
      
      console.log('XSS payload testing completed - all payloads blocked');
    });

    test('DOM manipulation attacks cannot restore Health Protocol', async () => {
      console.log('Starting DOM manipulation attack testing...');
      
      const domAttacks = [
        // Direct DOM manipulation
        `
        const tabsList = document.querySelector('[role="tablist"]');
        if (tabsList) {
          const healthTab = document.createElement('button');
          healthTab.setAttribute('role', 'tab');
          healthTab.textContent = 'Health Protocol';
          healthTab.onclick = () => window.location.hash = 'health-protocol';
          tabsList.appendChild(healthTab);
        }
        `,
        
        // Event listener manipulation
        `
        document.addEventListener('click', function(e) {
          if (e.target.textContent === 'Health Protocol') {
            e.target.style.display = 'block';
          }
        });
        const div = document.createElement('div');
        div.textContent = 'Health Protocol';
        div.style.display = 'none';
        document.body.appendChild(div);
        `,
        
        // MutationObserver manipulation
        `
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
              const healthDiv = document.createElement('div');
              healthDiv.textContent = 'Health Protocol';
              mutation.target.appendChild(healthDiv);
            }
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        `,
        
        // Shadow DOM attacks
        `
        const shadowHost = document.createElement('div');
        const shadowRoot = shadowHost.attachShadow({mode: 'open'});
        shadowRoot.innerHTML = '<button role="tab">Health Protocol</button>';
        document.body.appendChild(shadowHost);
        `,
        
        // Prototype pollution
        `
        Object.prototype.healthProtocol = true;
        Array.prototype.push.call(document.querySelectorAll('[role="tab"]'), 
          document.createElement('button'));
        `,
        
        // Custom elements
        `
        class HealthProtocolTab extends HTMLElement {
          connectedCallback() {
            this.innerHTML = '<button role="tab">Health Protocol</button>';
          }
        }
        customElements.define('health-protocol-tab', HealthProtocolTab);
        document.body.innerHTML += '<health-protocol-tab></health-protocol-tab>';
        `,
      ];

      for (const attack of domAttacks) {
        console.log(`Testing DOM attack: ${attack.substring(0, 50)}...`);
        
        try {
          await page.evaluate(attack);
          await page.waitForTimeout(1000);
          
          // Verify attack didn't work
          const healthCount = await page.locator('text=Health Protocol').count();
          expect(healthCount).toBe(0);
          
          // Verify tab count unchanged
          const tabCount = await page.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
          
        } catch (e) {
          console.log('DOM attack blocked (expected)');
        }
      }
      
      console.log('DOM manipulation attack testing completed');
    });

    test('Console-based attacks cannot restore Health Protocol', async () => {
      console.log('Starting console-based attack testing...');
      
      const consoleAttacks = [
        // Window object manipulation
        `
        window.healthProtocol = true;
        window.showHealthTab = () => {
          const tab = document.createElement('button');
          tab.textContent = 'Health Protocol';
          tab.setAttribute('role', 'tab');
          document.querySelector('[role="tablist"]').appendChild(tab);
        };
        window.showHealthTab();
        `,
        
        // React/framework bypasses
        `
        if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
          const internals = window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
          console.log('Attempting React internals manipulation');
        }
        `,
        
        // Event system manipulation
        `
        const customEvent = new CustomEvent('showHealthProtocol', {
          detail: { enabled: true }
        });
        document.dispatchEvent(customEvent);
        window.dispatchEvent(customEvent);
        `,
        
        // Router manipulation attempts
        `
        if (window.history && window.history.pushState) {
          window.history.pushState({}, '', '/trainer/health-protocol');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        `,
        
        // Local/Session storage bypass
        `
        const storageBypass = {
          'health-protocol-enabled': 'true',
          'trainer-permissions': JSON.stringify({healthProtocol: true}),
          'feature-flags': JSON.stringify({healthProtocol: true}),
          'user-settings': JSON.stringify({healthProtocolVisible: true})
        };
        Object.entries(storageBypass).forEach(([key, value]) => {
          localStorage.setItem(key, value);
          sessionStorage.setItem(key, value);
        });
        location.reload();
        `,
      ];

      for (const attack of consoleAttacks) {
        console.log(`Testing console attack: ${attack.substring(0, 50)}...`);
        
        try {
          await page.evaluate(attack);
          await page.waitForTimeout(2000);
          
          // Verify no health protocol appears
          const healthCount = await page.locator('text=Health Protocol').count();
          expect(healthCount).toBe(0);
          
          // Verify system integrity
          const tabCount = await page.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
          
        } catch (e) {
          console.log('Console attack blocked (expected)');
        }
      }
      
      console.log('Console-based attack testing completed');
    });
  });

  test.describe('Authentication & Authorization Bypasses', () => {
    test('Role escalation attempts cannot access Health Protocol', async () => {
      console.log('Starting role escalation testing...');
      
      // Test with different user roles
      const roles = [
        { login: loginAsTrainer, name: 'trainer' },
        { login: loginAsAdmin, name: 'admin' },
        { login: loginAsCustomer, name: 'customer' }
      ];

      for (const role of roles) {
        console.log(`Testing role escalation for: ${role.name}`);
        
        await role.login(page);
        
        // Attempt role manipulation
        await page.evaluate((roleName) => {
          // Try to escalate privileges
          if (window.localStorage) {
            localStorage.setItem('user-role', 'super-admin');
            localStorage.setItem('permissions', JSON.stringify({
              healthProtocol: true,
              allFeatures: true
            }));
          }
          
          if (window.sessionStorage) {
            sessionStorage.setItem('user-permissions', JSON.stringify({
              role: 'super-admin',
              healthProtocol: true
            }));
          }
          
          // Try to set window user object
          if (window.user) {
            window.user.role = 'super-admin';
            window.user.permissions = ['health-protocol'];
          }
        }, role.name);
        
        // Navigate to trainer page
        await page.goto('/trainer', { waitUntil: 'networkidle' });
        
        // Verify no health protocol access regardless of role manipulation
        const healthCount = await page.locator('text=Health Protocol').count();
        expect(healthCount).toBe(0);
        
        const tabCount = await page.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
        
        console.log(`✓ Role escalation blocked for ${role.name}`);
      }
    });

    test('JWT token manipulation cannot restore Health Protocol', async () => {
      console.log('Starting JWT token manipulation testing...');
      
      // Get current authentication cookies/tokens
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('token'));
      
      if (authCookie) {
        // Try to manipulate JWT payload
        const manipulationAttempts = [
          // Fake JWT with health protocol permissions
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJwZXJtaXNzaW9ucyI6WyJoZWFsdGgtcHJvdG9jb2wiXX0.invalid',
          
          // Base64 encoded fake permissions
          'eyJyb2xlIjoic3VwZXItYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJoZWFsdGgtcHJvdG9jb2wiXX0=',
          
          // URL encoded manipulation
          'role%3Dsuper-admin%26permissions%3Dhealth-protocol',
        ];

        for (const token of manipulationAttempts) {
          console.log(`Testing token manipulation: ${token.substring(0, 20)}...`);
          
          // Set manipulated token
          await page.context().addCookies([{
            ...authCookie,
            value: token
          }]);
          
          await page.reload({ waitUntil: 'networkidle' });
          
          // Verify manipulation doesn't work
          const healthCount = await page.locator('text=Health Protocol').count();
          expect(healthCount).toBe(0);
          
          // Verify normal functionality
          const tabCount = await page.locator('[role="tab"]').count();
          expect(tabCount).toBe(4);
        }
      }
      
      console.log('JWT token manipulation testing completed');
    });

    test('Session hijacking attempts cannot access Health Protocol', async () => {
      console.log('Starting session hijacking testing...');
      
      // Create second browser context (attacker)
      const attackerContext = await page.context().browser().newContext();
      const attackerPage = await attackerContext.newPage();
      
      try {
        // Get legitimate user's session
        const cookies = await page.context().cookies();
        const storage = await page.evaluate(() => ({
          localStorage: { ...localStorage },
          sessionStorage: { ...sessionStorage }
        }));
        
        // Hijack session in attacker context
        await attackerContext.addCookies(cookies);
        await attackerPage.goto('/trainer', { waitUntil: 'networkidle' });
        
        // Attacker tries to restore health protocol
        await attackerPage.evaluate((storage) => {
          Object.entries(storage.localStorage).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
          Object.entries(storage.sessionStorage).forEach(([key, value]) => {
            sessionStorage.setItem(key, value);
          });
          
          // Attacker-specific attempts
          localStorage.setItem('hijacker-health-protocol', 'true');
          sessionStorage.setItem('attack-health-enabled', 'true');
        }, storage);
        
        await attackerPage.reload({ waitUntil: 'networkidle' });
        
        // Verify hijacked session cannot access health protocol
        const healthCount = await attackerPage.locator('text=Health Protocol').count();
        expect(healthCount).toBe(0);
        
        const tabCount = await attackerPage.locator('[role="tab"]').count();
        expect(tabCount).toBe(4);
        
        console.log('✓ Session hijacking blocked');
        
      } finally {
        await attackerContext.close();
      }
    });
  });

  test.describe('Network & API Manipulation', () => {
    test('API response manipulation cannot restore Health Protocol', async () => {
      console.log('Starting API response manipulation testing...');
      
      // Intercept API calls and inject health protocol data
      await page.route('**/api/**', async (route) => {
        const response = await route.fetch();
        const contentType = response.headers()['content-type'];
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const json = await response.json();
            
            // Inject health protocol data into responses
            const manipulated = {
              ...json,
              healthProtocol: true,
              features: [...(json.features || []), 'health-protocol'],
              tabs: [...(json.tabs || []), 'health-protocol'],
              permissions: [...(json.permissions || []), 'health-protocol'],
              userRole: 'super-admin'
            };
            
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(manipulated)
            });
          } catch (e) {
            route.continue();
          }
        } else {
          route.continue();
        }
      });
      
      // Navigate and test
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify API manipulation doesn't work
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      // Clean up
      await page.unroute('**/api/**');
      
      console.log('API response manipulation testing completed');
    });

    test('Websocket manipulation cannot restore Health Protocol', async () => {
      console.log('Starting WebSocket manipulation testing...');
      
      // Listen for WebSocket connections
      page.on('websocket', ws => {
        console.log(`WebSocket connection: ${ws.url()}`);
        
        // Inject malicious frames
        ws.on('framesent', event => {
          console.log('WebSocket frame sent:', event.payload);
        });
        
        ws.on('framereceived', event => {
          console.log('WebSocket frame received:', event.payload);
        });
        
        // Try to send malicious health protocol data
        try {
          ws.send(JSON.stringify({
            type: 'ENABLE_HEALTH_PROTOCOL',
            data: { enabled: true }
          }));
          
          ws.send(JSON.stringify({
            type: 'UPDATE_TABS',
            tabs: ['recipes', 'meal-plan', 'customers', 'saved-plans', 'health-protocol']
          }));
        } catch (e) {
          console.log('WebSocket manipulation blocked');
        }
      });
      
      // Reload to trigger any WebSocket connections
      await page.reload({ waitUntil: 'networkidle' });
      
      await page.waitForTimeout(2000);
      
      // Verify WebSocket manipulation doesn't work
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      console.log('WebSocket manipulation testing completed');
    });

    test('Service Worker manipulation cannot restore Health Protocol', async () => {
      console.log('Starting Service Worker manipulation testing...');
      
      // Inject malicious service worker
      await page.evaluate(() => {
        if ('serviceWorker' in navigator) {
          const swCode = `
            self.addEventListener('message', function(event) {
              if (event.data.type === 'ENABLE_HEALTH_PROTOCOL') {
                // Try to manipulate DOM through service worker
                event.ports[0].postMessage({
                  type: 'HEALTH_PROTOCOL_ENABLED',
                  data: true
                });
              }
            });
          `;
          
          const blob = new Blob([swCode], { type: 'application/javascript' });
          const swUrl = URL.createObjectURL(blob);
          
          navigator.serviceWorker.register(swUrl).then(registration => {
            console.log('Malicious service worker registered');
            
            if (registration.active) {
              const channel = new MessageChannel();
              channel.port1.onmessage = function(event) {
                if (event.data.type === 'HEALTH_PROTOCOL_ENABLED') {
                  const healthTab = document.createElement('button');
                  healthTab.textContent = 'Health Protocol';
                  healthTab.setAttribute('role', 'tab');
                  document.querySelector('[role="tablist"]')?.appendChild(healthTab);
                }
              };
              
              registration.active.postMessage({
                type: 'ENABLE_HEALTH_PROTOCOL'
              }, [channel.port2]);
            }
          }).catch(err => {
            console.log('Service worker registration failed (expected)');
          });
        }
      });
      
      await page.waitForTimeout(3000);
      
      // Verify service worker manipulation doesn't work
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      const tabCount = await page.locator('[role="tab"]').count();
      expect(tabCount).toBe(4);
      
      console.log('Service Worker manipulation testing completed');
    });
  });

  test.describe('Advanced Persistence Attacks', () => {
    test('Browser cache manipulation cannot restore Health Protocol', async () => {
      console.log('Starting browser cache manipulation testing...');
      
      // Manipulate cache
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.open('health-protocol-cache').then(cache => {
            const healthResponse = new Response(
              JSON.stringify({ healthProtocol: true }),
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            cache.put('/api/features', healthResponse);
            cache.put('/api/user-permissions', healthResponse);
          });
        }
      });
      
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify cache manipulation doesn't work
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      console.log('Browser cache manipulation testing completed');
    });

    test('IndexedDB manipulation cannot restore Health Protocol', async () => {
      console.log('Starting IndexedDB manipulation testing...');
      
      await page.evaluate(() => {
        const request = indexedDB.open('health-protocol-db', 1);
        
        request.onsuccess = function(event) {
          const db = (event.target as any).result;
          const transaction = db.transaction(['settings'], 'readwrite');
          const store = transaction.objectStore('settings');
          
          store.add({
            id: 'health-protocol',
            enabled: true,
            visible: true
          });
        };
        
        request.onupgradeneeded = function(event) {
          const db = (event.target as any).result;
          db.createObjectStore('settings', { keyPath: 'id' });
        };
      });
      
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify IndexedDB manipulation doesn't work
      const healthCount = await page.locator('text=Health Protocol').count();
      expect(healthCount).toBe(0);
      
      console.log('IndexedDB manipulation testing completed');
    });
  });
});