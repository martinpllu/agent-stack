# E2E Testing Guide

This guide covers best practices for writing end-to-end tests using Playwright and our testing utilities.

## Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { createPageObjects, PageObjects } from './pages';
import { createTestUsers, startCodeCapture } from './auth-test-utils';
import { TestDataFactory } from './data-test-utils';
import { testData } from './test-utils';

// Test fixtures
let pages: PageObjects;
let dataFactory: TestDataFactory;

test.describe('Feature Name', () => {
  // Setup and teardown
  test.beforeAll(async () => {
    dataFactory = new TestDataFactory();
    // Create test data
  });

  test.afterAll(async () => {
    await dataFactory.cleanup();
  });

  test.beforeEach(async ({ page }) => {
    pages = createPageObjects(page);
    // Common setup for each test
  });

  // Test cases
  test('should do something', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Interactive Debugging for Development

When developing or debugging tests, use the interactive test harness for rapid feedback:

### Setting Up Interactive Sessions

Create a debug script that allows step-by-step execution:

```typescript
// debug-interactive.ts
import { chromium, Browser, Page } from '@playwright/test';
import { createPageObjects, PageObjects } from './pages';
import { createTestUsers, startCodeCapture } from './auth-test-utils';

export class InteractiveTestSession {
  browser: Browser;
  page: Page;
  pages: PageObjects;
  
  async start() {
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 100 // Slow down actions for visibility
    });
    this.page = await this.browser.newPage();
    this.pages = createPageObjects(this.page);
    
    console.log('Interactive session started');
    return this;
  }
  
  async diagnoseCurrentState() {
    const state = {
      url: this.page.url(),
      title: await this.page.title(),
      errors: await this.page.$$eval('.error, [role="alert"]', 
        els => els.map(el => el.textContent)
      ),
      visibleButtons: await this.page.$$eval('button:visible', 
        els => els.map(el => ({ text: el.textContent, enabled: !el.disabled }))
      ),
      formFields: await this.page.$$eval('input:visible, select:visible, textarea:visible',
        els => els.map(el => ({
          name: el.name || el.id,
          type: el.type,
          value: el.value,
          required: el.required
        }))
      )
    };
    
    console.log('Current Page State:', JSON.stringify(state, null, 2));
    return state;
  }
  
  async executeStep(description: string, action: () => Promise<any>) {
    console.log(`\n🔍 Executing: ${description}`);
    
    try {
      const result = await action();
      console.log(`✅ Success: ${description}`);
      
      // Auto-diagnose after each step
      await this.diagnoseCurrentState();
      
      return { success: true, result };
    } catch (error) {
      console.log(`❌ Failed: ${description}`);
      console.log(`Error: ${error.message}`);
      
      // Capture failure state
      await this.page.screenshot({ 
        path: `debug/error-${Date.now()}.png` 
      });
      
      await this.diagnoseCurrentState();
      
      return { success: false, error: error.message };
    }
  }
}

// Usage example
async function debugLoginFlow() {
  const session = await new InteractiveTestSession().start();
  
  // Step-by-step execution with diagnostics
  await session.executeStep('Navigate to login', 
    () => session.pages.login.goto()
  );
  
  await session.executeStep('Enter email', 
    () => session.pages.login.enterEmail('test@example.com')
  );
  
  await session.executeStep('Submit email form', 
    () => session.pages.login.submitEmail()
  );
  
  // Check specific conditions
  const codeInput = await session.page.$('input[name="code"]');
  if (codeInput) {
    console.log('✓ Code input is now visible');
  }
}
```

### Enhanced Page Objects for Debugging

Extend your page objects with diagnostic methods:

```typescript
// pages/base-page.ts
export class BasePage {
  constructor(protected page: Page) {}
  
  // Add diagnostic capabilities to all page objects
  async diagnoseElement(selector: string) {
    const diagnostics = {
      selector,
      exists: false,
      visible: false,
      enabled: false,
      text: null,
      attributes: {},
      screenshot: null
    };
    
    try {
      const element = await this.page.$(selector);
      diagnostics.exists = !!element;
      
      if (element) {
        diagnostics.visible = await element.isVisible();
        diagnostics.enabled = await element.isEnabled();
        diagnostics.text = await element.textContent();
        
        // Get all attributes
        diagnostics.attributes = await element.evaluate(el => {
          const attrs = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        });
        
        // Take element screenshot
        await element.screenshot({ 
          path: `debug/element-${Date.now()}.png` 
        });
      }
    } catch (error) {
      diagnostics.error = error.message;
    }
    
    return diagnostics;
  }
  
  async waitForStableState(options = { timeout: 5000 }) {
    // Wait for no network activity
    await this.page.waitForLoadState('networkidle', options);
    
    // Wait for no pending animations
    await this.page.evaluate(() => {
      return Promise.all(
        Array.from(document.querySelectorAll('*')).map(el => 
          el.getAnimations().map(animation => animation.finished)
        ).flat()
      );
    });
  }
}

// pages/login-page.ts
export class LoginPage extends BasePage {
  // Regular methods for tests
  async enterEmail(email: string) {
    await this.page.fill('input[name="email"]', email);
  }
  
  // Diagnostic methods for debugging
  async diagnoseLoginForm() {
    return {
      emailField: await this.diagnoseElement('input[name="email"]'),
      submitButton: await this.diagnoseElement('button[type="submit"]'),
      errorMessages: await this.page.$$eval('.error-message', 
        els => els.map(el => el.textContent)
      ),
      formAction: await this.page.$eval('form', 
        el => el.action
      ).catch(() => null)
    };
  }
}
```

### Running Interactive Debug Sessions

Create debug scripts for common scenarios:

```typescript
// debug-scripts/debug-auth-flow.ts
import { InteractiveTestSession } from '../debug-interactive';
import { createTestUsers, startCodeCapture } from '../auth-test-utils';

async function debugAuthFlow() {
  const session = await new InteractiveTestSession().start();
  const codeCapture = startCodeCapture();
  
  // Create test user
  const testUser = { email: 'debug@example.com', isAdmin: false };
  await createTestUsers([testUser]);
  
  // Step through auth flow
  await session.executeStep('Navigate to login', 
    () => session.pages.login.goto()
  );
  
  await session.executeStep('Request login code', 
    () => session.pages.login.requestLoginCode(testUser.email)
  );
  
  // Get and display the code
  const code = await codeCapture.getCode(testUser.email);
  console.log(`📧 Login code: ${code}`);
  
  await session.executeStep('Enter verification code', 
    () => session.pages.login.verifyCode(code)
  );
  
  // Wait and check result
  await session.page.waitForURL('**/home', { timeout: 10000 })
    .catch(() => console.log('Did not redirect to home'));
  
  await session.diagnoseCurrentState();
}

// Run with: npx ts-node debug-scripts/debug-auth-flow.ts
debugAuthFlow().catch(console.error);
```

## Authentication in Tests

### Using the Robust Login Helper

We provide a robust login helper that includes debugging output and proper error handling:

```typescript
import { loginUser, loginAsAdmin } from './test-helpers/login-helper';

// For regular users
await loginUser(page, {
  email: testUser.email,
  codeCapture,
  expectedRedirect: '/',
  debug: true // Enable debug output
});

// For admin users (includes verification of admin link)
await loginAsAdmin(page, adminUser.email, codeCapture);
```

### Traditional Login Flow

For tests requiring authenticated users:

```typescript
// Create test user
const testUser = {
  email: testData.generateEmail('test'),
  isAdmin: false,
};

test.beforeAll(async () => {
  await createTestUsers([testUser]);
  codeCapture = startCodeCapture();
});

test.beforeEach(async ({ page }) => {
  // Login flow
  await pages.login.goto();
  await pages.login.requestLoginCode(testUser.email);
  const code = await codeCapture.getCode(testUser.email);
  await pages.login.verifyCode(code);
  await page.waitForURL('**/home');
});
```

### Debug Output from Login Helper

When `debug: true` is enabled, you'll see:

```
🔐 Starting login for: admin@test.com
✅ On login page
✅ Requested login code
✅ Got verification code: 123456
✅ Submitted verification code
✅ Redirected to: http://localhost:5176/
✅ Reached expected page: /
✅ Login successful for: admin@test.com
✅ Admin link is visible
```

## Using Page Object Models

Always use Page Object Models instead of direct selectors:

```typescript
// ❌ Bad
await page.locator('input[name="email"]').fill('test@example.com');
await page.getByRole('button', { name: 'Submit' }).click();

// ✅ Good
await pages.login.enterEmail('test@example.com');
await pages.login.submitEmail();
```

## Test Data Management

Use the TestDataFactory for consistent test data:

```typescript
// Create test data with automatic cleanup
const user = await dataFactory.createUser({
  email: testData.generateEmail('test'),
  role: 'admin',
});

// Use test data generators
const task = testData.generateTask({
  title: 'Test Task',
  priority: 'high',
});
```

## Assertions Best Practices

```typescript
// Use specific assertions
await pages.tasks.expectTaskVisible(taskTitle);
await pages.tasks.expectTaskHasPriority(taskTitle, 'high');

// Wait for specific conditions
await pages.tasks.waitForPageLoad();
await pages.tasks.expectTaskCount(3);

// Check multiple conditions
const taskDetails = await pages.tasks.getTaskDetails(taskTitle);
expect(taskDetails).toMatchObject({
  title: 'Expected Title',
  priority: 'high',
  status: 'pending',
});
```

## Common Patterns

### Testing Form Validation

```typescript
test('should show validation errors', async ({ page }) => {
  await pages.tasks.goto();
  await pages.tasks.createTaskButton.click();
  
  // Submit empty form
  await pages.tasks.saveTaskButton.click();
  
  // Check for validation errors
  await pages.tasks.expectErrorMessage('Title is required');
});
```

### Testing User Permissions

```typescript
test('should restrict access to admin features', async ({ page }) => {
  // Login as regular user
  await loginAsUser(page, regularUser);
  
  // Try to access admin area
  await page.goto('/admin/users');
  
  // Should redirect
  await expect(page).toHaveURL(/.*\/home/);
  await pages.home.expectErrorMessage('Unauthorized');
});
```

### Testing Data Persistence

```typescript
test('should persist changes after reload', async ({ page }) => {
  // Create data
  await pages.tasks.createTask(taskData);
  
  // Reload page
  await page.reload();
  await pages.tasks.waitForPageLoad();
  
  // Verify data persists
  await pages.tasks.expectTaskVisible(taskData.title);
});
```

## Debugging Tests

### Enhanced Error Reporting with DOM Context

When tests fail, it's crucial to understand the exact state of the page. We've implemented an Enhanced Error Reporting system that automatically captures comprehensive debug information on test failures.

#### Setting Up Enhanced Error Reporting

Import and use the `captureDebugInfo` helper in your tests:

```typescript
import { captureDebugInfo } from './test-helpers/debug-on-failure';

test.describe('My Feature', () => {
  test.afterEach(async ({ page }, testInfo) => {
    await captureDebugInfo(page, testInfo);
  });
  
  test('should do something', async ({ page }) => {
    // Your test code here
  });
});
```

#### What Gets Captured

When a test fails, the following information is automatically saved to `test-results/debug/`:

1. **Full Page Screenshot** - `screenshot.png`
2. **Complete DOM HTML** - `dom.html`
3. **All Visible Text** - `visible-text.txt`
4. **Page Information** - `page-info.json` (URL, title, timestamp)
5. **Interactive Elements** - `interactive-elements.json` (all buttons, links, inputs, etc.)

#### Console Output Example

```
================================================================================
🚨 TEST FAILURE DEBUG INFO
================================================================================
Test: should display existing users
URL: http://localhost:5176/admin/users
Title: User Management - Admin
Debug files saved to: test-results/debug/should_display_existing_users_2025-07-27T20-41-32-990Z

📊 Interactive Elements Summary:
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│ button  │ 360    │
│ a       │ 5      │
│ table   │ 1      │
│ tr      │ 179    │
└─────────┴────────┘

🔵 Buttons:
  - "Logout"  
  - "Make Admin"  
  - "Delete"  

🔗 Links:
  - "Task Tracker" -> http://localhost:5176/
  - "Home" -> http://localhost:5176/
  - "Tasks" -> http://localhost:5176/tasks
  - "Admin" -> http://localhost:5176/admin/users

📝 Input Fields:
  - email [name="email"] placeholder="Email address" value=""
================================================================================
```

### Quick Debugging in Tests

```typescript
// Pause test execution
await page.pause();

// Take screenshots
await page.screenshot({ path: 'debug.png' });

// Log page content
console.log(await page.content());

// Use Playwright UI mode
pnpm test:e2e:ui
```

### Debug Helper Script

For interactive debugging outside of test runs, use the Debug Helper Script:

```bash
# Start interactive debug browser
pnpm tsx scripts/debug-browser.ts
```

This provides a REPL environment with helpful commands:
- `debug.goto(url)` - Navigate to any URL
- `debug.loginAsAdmin()` - Quick admin login
- `debug.loginAsUser()` - Quick user login  
- `debug.inspect()` - See page state, buttons, links, inputs
- `debug.findByText(text)` - Find elements containing text
- `debug.screenshot()` - Capture screenshots
- `debug.click(selector)` - Click with error diagnostics
- `debug.evaluate(code)` - Run JavaScript in browser

Example debug session:
```javascript
🔍 debug> await debug.loginAsAdmin()
🔐 Logging in as admin: debug-admin@test.com
✅ Logged in successfully as admin

🔍 debug> await debug.goto('/admin/users')  
📍 Navigating to: http://localhost:5176/admin/users
✅ Current URL: http://localhost:5176/admin/users

🔍 debug> await debug.inspect()
// Shows all buttons, links, inputs on the page
```

See example scenarios in `/scripts/debug-scenarios/`.

### Interactive Debugging for Complex Issues

When tests are failing and the cause is unclear:

1. **Create a debug script** that reproduces the test scenario
2. **Run it interactively** to see exactly what's happening
3. **Use diagnostic methods** to understand the page state
4. **Iterate quickly** without running the full test suite

```bash
# Run interactive debug session
npx ts-node debug-scripts/debug-auth-flow.ts

# Or create a generic REPL session
npx ts-node debug-scripts/interactive-repl.ts
```

### Debug Output Format

When debugging, ensure output is structured for easy parsing:

```typescript
// Structured output for better debugging
async function debugStep(description: string, action: () => Promise<any>) {
  const result = {
    step: description,
    timestamp: new Date().toISOString(),
    success: false,
    duration: 0,
    state: null,
    error: null
  };
  
  const start = Date.now();
  
  try {
    await action();
    result.success = true;
  } catch (error) {
    result.error = {
      message: error.message,
      stack: error.stack
    };
  }
  
  result.duration = Date.now() - start;
  result.state = await getCurrentPageState();
  
  // Output as JSON for easy parsing
  console.log(JSON.stringify(result));
  
  return result;
}
```

## Best Practices from Debugging Experience

### 1. Always Match the Actual UI

Before writing tests, use the Enhanced Error Reporting to capture what's actually on the page:

```typescript
// Bad: Assuming UI elements exist
await pages.adminUsers.editUser(email); // Fails if no edit button exists

// Good: First verify what's available
const userRow = page.locator(`tr:has-text("${email}")`);
await expect(userRow.locator('button:has-text("Edit")')).toBeVisible();
```

### 2. Use Simple, Robust Selectors

```typescript
// Complex page object methods can hide failures
await pages.adminUsers.expectUserVisible(email); // May timeout without clear reason

// Simple selectors give clearer errors
const userRow = page.locator(`tr[data-testid="user-row"]:has-text("${email}")`);
await expect(userRow).toBeVisible();
```

### 3. Add Debug Output to Critical Flows

```typescript
test.beforeEach(async ({ page }) => {
  console.log('🔐 Starting authentication...');
  await loginAsAdmin(page, adminUser.email, codeCapture);
  console.log('✅ Authentication complete');
  
  console.log('📍 Navigating to admin page...');
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/.*\/admin\/users/);
  console.log('✅ On admin page');
});
```

### 4. Capture State on Every Failure

Always include the Enhanced Error Reporting in your test setup:

```typescript
test.describe('Feature Tests', () => {
  // This single line can save hours of debugging
  test.afterEach(async ({ page }, testInfo) => {
    await captureDebugInfo(page, testInfo);
  });
});
```

### 5. Verify Navigation Explicitly

```typescript
// Don't assume navigation succeeded
await page.goto('/admin/users');

// Always verify you're where you expect
await expect(page).toHaveURL(/.*\/admin\/users/);
```

## Test Organization

- Group related tests using `test.describe()`
- Use descriptive test names that explain the behavior
- Follow the Arrange-Act-Assert pattern
- Keep tests independent and atomic
- Clean up test data after each test

## Troubleshooting Common Issues

### Test Timing Out Without Clear Error

**Problem**: Test fails with timeout but no clear indication why.

**Solution**: Use Enhanced Error Reporting to see the actual page state:
- Check the captured URL - are you on the expected page?
- Review interactive elements - is the element you're looking for actually there?
- Look at visible text - are there error messages on the page?

### Login Flow Failing

**Problem**: Authentication fails intermittently.

**Solution**: Use the robust login helper with debug enabled:
```typescript
await loginUser(page, {
  email: user.email,
  codeCapture,
  debug: true // Shows each step of login process
});
```

### Element Not Found

**Problem**: Test can't find an element that should exist.

**Solution**: 
1. Let the test fail with Enhanced Error Reporting enabled
2. Check `interactive-elements.json` for the actual selectors
3. Update your test to use the correct selectors

### Tests Pass Locally but Fail in CI

**Problem**: Different behavior in different environments.

**Solution**:
- Enhanced Error Reporting captures screenshots and DOM in CI
- Compare the CI debug output with local to spot differences
- Common issues: different data, timing issues, viewport size

### Need to Understand Page Structure

**Approach**: Intentionally fail a test to trigger Enhanced Error Reporting:
```typescript
test('explore page structure', async ({ page }) => {
  await page.goto('/some-page');
  // Intentionally fail to capture debug info
  expect(true).toBe(false);
});
```

Then examine the captured files in `test-results/debug/`.