#!/usr/bin/env tsx

/**
 * Debug script for admin user management flow
 * Usage: pnpm tsx scripts/debug-scenarios/debug-admin-flow.ts
 */

import { chromium } from '@playwright/test';
import { createTestUsers, startCodeCapture } from '../../tests/auth-test-utils';
import { getDevServerUrl } from '../get-dev-server-url';

async function debugAdminFlow() {
  console.log('🔍 Debugging Admin User Management Flow\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow actions for visibility
  });
  
  const page = await browser.newPage();
  const codeCapture = startCodeCapture();
  
  try {
    // Step 1: Create test users
    console.log('📌 Step 1: Creating test users...');
    const adminUser = { email: 'debug-admin@example.com', isAdmin: true };
    const regularUser = { email: 'debug-user@example.com', isAdmin: false };
    await createTestUsers([adminUser, regularUser], true);
    console.log('✅ Users created\n');
    
    // Step 2: Login as admin
    console.log('📌 Step 2: Logging in as admin...');
    const baseUrl = getDevServerUrl();
    await page.goto(`${baseUrl}/auth/login`);
    await page.fill('input[type="email"]', adminUser.email);
    await page.click('button:has-text("Send Verification Code")');
    
    const code = await codeCapture.getCode(adminUser.email);
    console.log(`Got code: ${code}`);
    
    await page.fill('input[name="code"]', code);
    await page.click('button:has-text("Verify Code")');
    await page.waitForURL('**/');
    console.log('✅ Logged in\n');
    
    // Step 3: Check admin link visibility
    console.log('📌 Step 3: Checking admin navigation...');
    const adminLink = page.locator('nav a[href="/admin/users"]');
    const isVisible = await adminLink.isVisible();
    console.log(`Admin link visible: ${isVisible}`);
    
    if (isVisible) {
      await adminLink.click();
      await page.waitForURL('**/admin/users');
      console.log('✅ Navigated to admin page\n');
    }
    
    // Step 4: Inspect admin page
    console.log('📌 Step 4: Inspecting admin page...');
    const title = await page.title();
    const heading = await page.locator('h1').textContent();
    const userRows = await page.locator('tr[data-testid="user-row"]').count();
    
    console.log(`Page title: ${title}`);
    console.log(`Page heading: ${heading}`);
    console.log(`User rows found: ${userRows}`);
    
    // Check for specific user
    const testUserRow = page.locator(`tr:has-text("${regularUser.email}")`);
    if (await testUserRow.isVisible()) {
      console.log(`\n✅ Found test user: ${regularUser.email}`);
      
      // Check available actions
      const buttons = await testUserRow.locator('button').allTextContents();
      console.log(`Available actions: ${buttons.join(', ')}`);
    }
    
    // Step 5: Test an action
    console.log('\n📌 Step 5: Testing user role change...');
    const makeAdminBtn = testUserRow.locator('button:has-text("Make Admin")');
    if (await makeAdminBtn.isVisible()) {
      await makeAdminBtn.click();
      console.log('Clicked "Make Admin"');
      
      // Wait for update
      await page.waitForTimeout(2000);
      
      // Check if button changed
      const removeAdminBtn = testUserRow.locator('button:has-text("Remove Admin")');
      if (await removeAdminBtn.isVisible()) {
        console.log('✅ User successfully made admin!');
      }
    }
    
    console.log('\n🎯 Debug session complete!');
    console.log('Browser will remain open for manual inspection.');
    console.log('Press Ctrl+C to exit.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    await page.screenshot({ path: 'debug-error.png' });
    console.log('Screenshot saved to debug-error.png');
  } finally {
    codeCapture.stop();
  }
}

// Run the debug script
debugAdminFlow().catch(console.error);