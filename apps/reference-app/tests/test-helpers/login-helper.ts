import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createPageObjects } from '../pages';

export interface LoginOptions {
  email: string;
  codeCapture: {
    getCode: (email: string) => Promise<string>;
  };
  expectedRedirect?: string;
  debug?: boolean;
}

/**
 * Robust login helper with debugging capabilities
 */
export async function loginUser(page: Page, options: LoginOptions) {
  const { email, codeCapture, expectedRedirect = '/', debug = false } = options;
  const pages = createPageObjects(page);
  
  if (debug) {
    console.log(`🔐 Starting login for: ${email}`);
  }
  
  // Go to login page
  await pages.login.goto();
  
  // Verify we're on the login page
  await expect(page).toHaveURL(/.*\/auth\/login/);
  if (debug) {
    console.log('✅ On login page');
  }
  
  // Enter email
  await pages.login.requestLoginCode(email);
  if (debug) {
    console.log('✅ Requested login code');
  }
  
  // Wait for code input to be visible
  await expect(page.locator('input[name="code"]')).toBeVisible({ timeout: 10000 });
  
  // Get and enter verification code
  const code = await codeCapture.getCode(email);
  if (debug) {
    console.log(`✅ Got verification code: ${code}`);
  }
  
  await pages.login.verifyCode(code);
  if (debug) {
    console.log('✅ Submitted verification code');
  }
  
  // Wait for redirect away from login page
  await expect(page).not.toHaveURL(/.*\/auth\/login/, { timeout: 15000 });
  if (debug) {
    console.log(`✅ Redirected to: ${page.url()}`);
  }
  
  // If expected redirect is specified, wait for it
  if (expectedRedirect !== null) {
    if (expectedRedirect === '/') {
      // For home page, check exact match
      await expect(page).toHaveURL(/.*\/$/, { timeout: 10000 });
    } else {
      await expect(page).toHaveURL(new RegExp(`.*${expectedRedirect}`), { timeout: 10000 });
    }
    if (debug) {
      console.log(`✅ Reached expected page: ${expectedRedirect}`);
    }
  }
  
  // Verify user is logged in by checking for logout button or user email in nav
  const headerText = await page.locator('header').textContent();
  if (!headerText?.includes(email)) {
    throw new Error(`Login verification failed: user email "${email}" not found in header`);
  }
  
  if (debug) {
    console.log(`✅ Login successful for: ${email}`);
  }
  
  return true;
}

/**
 * Login helper specifically for admin users
 */
export async function loginAsAdmin(page: Page, adminEmail: string, codeCapture: { getCode: (email: string) => Promise<string> }) {
  await loginUser(page, {
    email: adminEmail,
    codeCapture,
    expectedRedirect: '/',
    debug: true // Enable debug for admin logins
  });
  
  // Verify admin link is visible
  const adminLink = page.locator('nav a[href="/admin/users"]');
  await expect(adminLink).toBeVisible({ timeout: 5000 });
  console.log('✅ Admin link is visible');
}