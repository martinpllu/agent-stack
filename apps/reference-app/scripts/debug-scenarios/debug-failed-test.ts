#!/usr/bin/env tsx

/**
 * Debug script to reproduce and investigate a failed test
 * Usage: pnpm tsx scripts/debug-scenarios/debug-failed-test.ts
 */

import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createTestUsers, startCodeCapture } from '../../tests/auth-test-utils';
import { getDevServerUrl } from '../get-dev-server-url';

/**
 * Reproduce a specific test failure step by step
 */
async function debugFailedTest() {
  console.log('🔍 Debugging Failed Test Scenario\n');
  console.log('This script helps reproduce test failures in an interactive environment.\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage();
  
  // Add console and error logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Browser error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`💥 Page crash: ${error.message}`);
  });
  
  try {
    // Example: Debug a test that expects to find a user in a table
    console.log('📌 Reproducing test: "should display existing users"\n');
    
    // Setup test data
    const testEmail = 'test-debug@example.com';
    await createTestUsers([{ email: testEmail, isAdmin: false }], true);
    
    // Navigate directly to the problematic page
    const baseUrl = getDevServerUrl();
    await page.goto(`${baseUrl}/admin/users`);
    
    // Check current state
    await checkPageState(page, 'Initial page load');
    
    // Try to find the element the test is looking for
    console.log(`\n🔍 Looking for user row with email: ${testEmail}`);
    
    const selector = `tr[data-testid="user-row"]:has-text("${testEmail}")`;
    const element = await page.$(selector);
    
    if (!element) {
      console.log('❌ Element not found with expected selector');
      
      // Try alternative selectors
      console.log('\n🔍 Trying alternative selectors...');
      
      const alternatives = [
        `tr:has-text("${testEmail}")`,
        `[data-testid="user-row"] :text("${testEmail}")`,
        `table tr:has(td:has-text("${testEmail}"))`
      ];
      
      for (const alt of alternatives) {
        const found = await page.$(alt);
        if (found) {
          console.log(`✅ Found with selector: ${alt}`);
          break;
        }
      }
      
      // Dump all user rows for inspection
      console.log('\n📊 All user rows on page:');
      const allRows = await page.$$eval('tr[data-testid="user-row"]', rows => 
        rows.map(row => row.textContent?.trim())
      );
      allRows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row?.substring(0, 100)}`);
      });
    } else {
      console.log('✅ Element found!');
      
      // Inspect element state
      const isVisible = await element.isVisible();
      const bbox = await element.boundingBox();
      console.log(`  Visible: ${isVisible}`);
      console.log(`  Position: ${bbox ? `${bbox.x},${bbox.y}` : 'not rendered'}`);
    }
    
    console.log('\n💡 Debug Insights:');
    console.log('- Check if user is actually created in database');
    console.log('- Verify authentication/authorization');
    console.log('- Look for timing issues (data not loaded yet)');
    console.log('- Check for errors in browser console');
    
    console.log('\n🎯 Browser remains open for manual debugging.');
    console.log('Use DevTools to inspect elements and network requests.');
    console.log('Press Ctrl+C to exit.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'debug-failed-test-error.png' });
  }
}

async function checkPageState(page: Page, context: string) {
  console.log(`\n📊 Page State - ${context}:`);
  console.log(`  URL: ${page.url()}`);
  console.log(`  Title: ${await page.title()}`);
  
  // Check for common error indicators
  const hasError = await page.$('[role="alert"], .error, .alert-error');
  if (hasError) {
    const errorText = await hasError.textContent();
    console.log(`  ⚠️ Error on page: ${errorText}`);
  }
  
  // Check if we were redirected (common auth issue)
  if (page.url().includes('/auth/login')) {
    console.log('  ⚠️ Redirected to login - possible auth issue');
  }
}

// Run the debug script
debugFailedTest().catch(console.error);