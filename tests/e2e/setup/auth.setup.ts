/**
 * Global Auth Setup — EvoFit Meals Simulation
 *
 * Runs ONCE before all simulation tests.
 * Logs in as each role, saves storageState to tests/e2e/auth-state/.
 *
 * Usage:
 *   npx playwright test --config=playwright.simulation.config.ts
 *
 * Auth state files created:
 *   tests/e2e/auth-state/admin.json
 *   tests/e2e/auth-state/trainer.json
 *   tests/e2e/auth-state/client.json
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://evofitmeals.com';
const AUTH_DIR = path.join(process.cwd(), 'tests/e2e/auth-state');

const ACCOUNTS = [
  {
    role: 'admin',
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
    file: path.join(AUTH_DIR, 'admin.json'),
    expectUrl: /dashboard|admin/i,
  },
  {
    role: 'trainer',
    // Production redirects trainer to /trainer after login
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    file: path.join(AUTH_DIR, 'trainer.json'),
    expectUrl: /trainer|dashboard/i,
  },
  {
    role: 'client',
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
    file: path.join(AUTH_DIR, 'client.json'),
    expectUrl: /dashboard|meal|home/i,
  },
];

async function globalSetup(config: FullConfig) {
  const headed = process.env.HEADED === '1';

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: !headed });

  for (const account of ACCOUNTS) {
    // Skip if fresh state exists and is less than 10 minutes old (JWT expires in 15min)
    if (fs.existsSync(account.file)) {
      const stat = fs.statSync(account.file);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 10 * 60 * 1000) {
        console.log(`[auth-setup] ✓ ${account.role} — reusing saved state (${Math.round(ageMs / 60000)}m old)`);
        continue;
      }
    }

    console.log(`[auth-setup] Logging in as ${account.role} (${account.email})...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });

      await page.fill('input[type="email"], input[name="email"]', account.email);
      await page.fill('input[type="password"], input[name="password"]', account.password);
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      await page.waitForURL(account.expectUrl, { timeout: 15000 });

      // Save full browser state (cookies + localStorage)
      await context.storageState({ path: account.file });
      console.log(`[auth-setup] ✓ ${account.role} — state saved to ${account.file}`);

      if (headed) {
        await page.screenshot({ path: `tests/e2e/auth-state/${account.role}-login.png` });
      }
    } catch (err) {
      console.error(`[auth-setup] ✗ ${account.role} login failed: ${err}`);
      // Don't abort — other roles may succeed
    }

    await context.close();
  }

  await browser.close();
}

export default globalSetup;
