#!/usr/bin/env tsx

import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createTestUsers, startCodeCapture } from '../tests/auth-test-utils';
import * as repl from 'repl';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Interactive Debug Helper for Playwright tests
 * Provides a REPL environment with helper functions for debugging
 */
class DebugHelper {
  browser!: Browser;
  page!: Page;
  codeCapture: ReturnType<typeof startCodeCapture> | null = null;
  screenshotCount = 0;

  async init() {
    console.log('🚀 Starting debug browser...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 100 // Slow down actions for visibility
    });
    this.page = await this.browser.newPage();
    
    // Set up console message logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Browser console error: ${msg.text()}`);
      }
    });
    
    this.page.on('pageerror', error => {
      console.log(`💥 Page error: ${error.message}`);
    });
    
    this.page.on('requestfailed', request => {
      console.log(`❌ Failed request: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    console.log('✅ Browser launched successfully');
    return this;
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string) {
    if (!url.startsWith('http')) {
      // Get the base URL dynamically
      const { getDevServerUrl } = require('./get-dev-server-url');
      const baseUrl = getDevServerUrl();
      url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    console.log(`📍 Navigating to: ${url}`);
    await this.page.goto(url);
    console.log(`✅ Current URL: ${this.page.url()}`);
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin(email?: string) {
    const adminEmail = email || 'debug-admin@test.com';
    console.log(`🔐 Logging in as admin: ${adminEmail}`);
    
    // Create admin user
    await createTestUsers([{ email: adminEmail, isAdmin: true }], true);
    
    // Start code capture if not already started
    if (!this.codeCapture) {
      this.codeCapture = startCodeCapture();
    }
    
    // Navigate to login
    await this.goto('/auth/login');
    
    // Fill email
    await this.page.fill('input[type="email"]', adminEmail);
    await this.page.click('button:has-text("Send Verification Code")');
    
    // Get and enter code
    const code = await this.codeCapture.getCode(adminEmail);
    console.log(`📧 Got verification code: ${code}`);
    
    await this.page.fill('input[name="code"]', code);
    await this.page.click('button:has-text("Verify Code")');
    
    // Wait for redirect
    await this.page.waitForURL('**/', { timeout: 10000 });
    console.log('✅ Logged in successfully as admin');
  }

  /**
   * Login as regular user
   */
  async loginAsUser(email?: string) {
    const userEmail = email || 'debug-user@test.com';
    console.log(`🔐 Logging in as user: ${userEmail}`);
    
    // Create regular user
    await createTestUsers([{ email: userEmail, isAdmin: false }], true);
    
    // Start code capture if not already started
    if (!this.codeCapture) {
      this.codeCapture = startCodeCapture();
    }
    
    // Rest of login flow is same as admin
    await this.goto('/auth/login');
    await this.page.fill('input[type="email"]', userEmail);
    await this.page.click('button:has-text("Send Verification Code")');
    
    const code = await this.codeCapture.getCode(userEmail);
    console.log(`📧 Got verification code: ${code}`);
    
    await this.page.fill('input[name="code"]', code);
    await this.page.click('button:has-text("Verify Code")');
    
    await this.page.waitForURL('**/', { timeout: 10000 });
    console.log('✅ Logged in successfully as user');
  }

  /**
   * Inspect current page state
   */
  async inspect() {
    console.log('\n📊 Current Page State:');
    console.log('='.repeat(60));
    
    const state = {
      url: this.page.url(),
      title: await this.page.title(),
      
      // Get all visible text
      visibleText: await this.page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
              return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
          }
        );
        const texts: string[] = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            texts.push(text);
          }
        }
        return texts.slice(0, 20).join(' | '); // First 20 text nodes
      }),
      
      // Get buttons
      buttons: await this.page.$$eval('button:visible, [role="button"]:visible', 
        els => els.map(el => ({
          text: el.textContent?.trim(),
          disabled: (el as HTMLButtonElement).disabled,
          classes: el.className
        }))
      ),
      
      // Get links
      links: await this.page.$$eval('a:visible', 
        els => els.map(el => ({
          text: el.textContent?.trim(),
          href: (el as HTMLAnchorElement).href
        }))
      ),
      
      // Get form fields
      inputs: await this.page.$$eval('input:visible, textarea:visible, select:visible',
        els => els.map(el => ({
          type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
          name: (el as HTMLInputElement).name,
          id: el.id,
          value: (el as HTMLInputElement).value,
          placeholder: (el as HTMLInputElement).placeholder
        }))
      ),
      
      // Get errors
      errors: await this.page.$$eval('[role="alert"], .error, .alert-error', 
        els => els.map(el => el.textContent?.trim())
      )
    };
    
    console.log(`URL: ${state.url}`);
    console.log(`Title: ${state.title}`);
    console.log(`\nVisible Text (first 20 nodes):`);
    console.log(state.visibleText);
    
    if (state.buttons.length > 0) {
      console.log(`\n🔵 Buttons (${state.buttons.length}):`);
      state.buttons.forEach(btn => {
        console.log(`  - "${btn.text}" ${btn.disabled ? '(disabled)' : ''}`);
      });
    }
    
    if (state.links.length > 0) {
      console.log(`\n🔗 Links (${state.links.length}):`);
      state.links.forEach(link => {
        console.log(`  - "${link.text}" -> ${link.href}`);
      });
    }
    
    if (state.inputs.length > 0) {
      console.log(`\n📝 Input Fields (${state.inputs.length}):`);
      state.inputs.forEach(input => {
        console.log(`  - ${input.type} [name="${input.name}"] ${input.placeholder ? `placeholder="${input.placeholder}"` : ''}`);
      });
    }
    
    if (state.errors.length > 0) {
      console.log(`\n❌ Errors on page:`);
      state.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Find elements by text
   */
  async findByText(text: string) {
    console.log(`\n🔍 Searching for text: "${text}"`);
    
    const elements = await this.page.evaluate((searchText) => {
      const results: Array<{
        tag: string;
        text: string;
        selector: string;
        attributes: Record<string, string>;
      }> = [];
      
      document.querySelectorAll('*').forEach(el => {
        if (el.textContent?.includes(searchText)) {
          // Build a selector for this element
          let selector = el.tagName.toLowerCase();
          if (el.id) selector += `#${el.id}`;
          if (el.className) selector += `.${Array.from(el.classList).join('.')}`;
          
          const attrs: Record<string, string> = {};
          Array.from(el.attributes).forEach(attr => {
            attrs[attr.name] = attr.value;
          });
          
          results.push({
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.substring(0, 100) || '',
            selector,
            attributes: attrs
          });
        }
      });
      
      return results.slice(0, 10); // First 10 matches
    }, text);
    
    if (elements.length === 0) {
      console.log('No elements found');
    } else {
      console.log(`Found ${elements.length} elements:`);
      elements.forEach((el, i) => {
        console.log(`\n${i + 1}. ${el.selector}`);
        console.log(`   Text: ${el.text.substring(0, 60)}...`);
        if (el.attributes['data-testid']) {
          console.log(`   data-testid: ${el.attributes['data-testid']}`);
        }
      });
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(name?: string) {
    const dir = 'debug-screenshots';
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
    
    const filename = name || `screenshot-${++this.screenshotCount}`;
    const filepath = path.join(dir, `${filename}.png`);
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filepath}`);
  }

  /**
   * Click an element with helpful error messages
   */
  async click(selector: string) {
    try {
      console.log(`🖱️ Clicking: ${selector}`);
      await this.page.click(selector, { timeout: 5000 });
      console.log('✅ Click successful');
    } catch (error: any) {
      console.log(`❌ Click failed: ${error.message}`);
      
      // Try to provide helpful debugging info
      const exists = await this.page.$(selector) !== null;
      if (!exists) {
        console.log('   Element not found on page');
      } else {
        const visible = await this.page.isVisible(selector);
        const enabled = await this.page.isEnabled(selector);
        console.log(`   Element exists: ${exists}`);
        console.log(`   Element visible: ${visible}`);
        console.log(`   Element enabled: ${enabled}`);
      }
    }
  }

  /**
   * Fill an input field
   */
  async fill(selector: string, value: string) {
    try {
      console.log(`⌨️ Filling "${selector}" with "${value}"`);
      await this.page.fill(selector, value);
      console.log('✅ Fill successful');
    } catch (error: any) {
      console.log(`❌ Fill failed: ${error.message}`);
    }
  }

  /**
   * Wait for an element
   */
  async wait(selector: string, options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }) {
    try {
      console.log(`⏳ Waiting for: ${selector}`);
      await this.page.waitForSelector(selector, options || {});
      console.log('✅ Element found');
    } catch (error: any) {
      console.log(`❌ Wait failed: ${error.message}`);
    }
  }

  /**
   * Execute custom JavaScript in the browser
   */
  async evaluate(code: string) {
    try {
      const result = await this.page.evaluate(code);
      console.log('Result:', result);
      return result;
    } catch (error: any) {
      console.log(`❌ Evaluation failed: ${error.message}`);
    }
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.codeCapture) {
      this.codeCapture.stop();
    }
    await this.browser.close();
    console.log('👋 Browser closed');
  }
}

/**
 * Start the interactive debug session
 */
async function startDebugSession() {
  const debug = new DebugHelper();
  await debug.init();
  
  console.log('\n🎯 Debug Helper Ready!');
  console.log('='.repeat(60));
  console.log('Available commands:');
  console.log('  debug.goto(url)              - Navigate to URL');
  console.log('  debug.loginAsAdmin()         - Login as admin user');
  console.log('  debug.loginAsUser()          - Login as regular user');
  console.log('  debug.inspect()              - Inspect current page state');
  console.log('  debug.findByText(text)       - Find elements containing text');
  console.log('  debug.screenshot(name?)      - Take a screenshot');
  console.log('  debug.click(selector)        - Click an element');
  console.log('  debug.fill(selector, value)  - Fill an input');
  console.log('  debug.wait(selector)         - Wait for element');
  console.log('  debug.evaluate(code)         - Run JS in browser');
  console.log('  debug.page                   - Access Playwright page object');
  console.log('  debug.close()                - Close browser and exit');
  console.log('='.repeat(60));
  console.log('\nExample: debug.goto("/") or debug.loginAsAdmin()');
  console.log('');
  
  // Start REPL
  const replServer = repl.start({
    prompt: '🔍 debug> ',
    useGlobal: true
  });
  
  // Add debug to REPL context
  replServer.context.debug = debug;
  
  // Handle REPL exit
  replServer.on('exit', async () => {
    await debug.close();
    process.exit(0);
  });
}

// Start the session
startDebugSession().catch(console.error);