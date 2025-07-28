# End-to-End Test Debugging Approaches

This document outlines various approaches to improve debugging capabilities for Playwright e2e tests, particularly useful for AI-assisted development where visual feedback is limited.

## Priority Order

### 1. Enhanced Error Reporting with DOM Context (HIGHEST PRIORITY)
**Why first:** Provides immediate value, captures rich context automatically on test failures, easy to integrate.

When a test fails, automatically capture:
- Full page screenshot
- Complete DOM HTML
- All visible text on page
- List of all interactive elements (buttons, links, inputs)
- Current URL and page title
- Console logs and errors
- Network failures

This gives comprehensive context about what the page actually looked like when the test failed.

### 2. Debug Helper Script
**Why second:** Enables interactive exploration when automated capture isn't enough.

A script that launches a browser with helper functions for:
- Quick login as different user types
- Inspecting current page state
- Finding elements by text
- Taking screenshots
- Dumping DOM

### 3. Step-by-Step Debug Mode
**Why third:** Helps trace exact execution flow when timing issues occur.

Wraps page actions to:
- Log each action before execution
- Take screenshots before/after actions
- Report state changes
- Add configurable delays

### 4. AI-Friendly Test Reporter
**Why fourth:** Provides structured output optimized for AI consumption.

Custom Playwright reporter that outputs:
- Structured JSON with failure context
- Extracted selectors from errors
- Step-by-step execution trace
- Aggregated error patterns

### 5. Interactive Browser REPL
**Why fifth:** Powerful but requires more setup and interactive session.

Node REPL with Playwright page object for:
- Running arbitrary commands
- Testing selectors interactively
- Experimenting with page interactions

### 6. Visual Diff Testing
**Why sixth:** Useful for regression testing but requires baseline management.

Compares screenshots against expected baselines to:
- Detect visual regressions
- Show what changed
- Validate UI states

### 7. Browser Console and Network Capture
**Why seventh:** Useful but often already partially available in CI logs.

Captures all browser-side activity:
- Console messages
- Network requests/responses
- JavaScript errors

## Implementation Status

- [x] Enhanced Error Reporting with DOM Context - **IMPLEMENTED**
- [x] Debug Helper Script - **IMPLEMENTED**
- [ ] Step-by-Step Debug Mode
- [ ] AI-Friendly Test Reporter
- [ ] Interactive Browser REPL (partially covered by Debug Helper Script)
- [ ] Visual Diff Testing
- [ ] Browser Console and Network Capture

## Lessons Learned

### Enhanced Error Reporting Effectiveness
The Enhanced Error Reporting proved extremely effective for debugging test failures:

1. **Immediate Problem Identification**: The debug output immediately showed we were stuck on the login page instead of the admin page
2. **Complete Context**: Having the full list of interactive elements, visible text, and DOM saved to files gave comprehensive debugging information
3. **No Guesswork**: Instead of guessing what elements exist, we could see exactly what buttons and links were available

### Key Insights from Debug Output
- Showed 179 table rows with user data - immediately revealing the page structure
- Listed all 360 buttons on the page - showing "Make Admin", "Delete", etc. but no "Edit" buttons
- Captured the exact URL and page title - confirming navigation issues
- Saved everything to files for detailed analysis when needed

### Test Writing Best Practices Discovered
1. **Match Actual UI**: Tests were expecting buttons and elements that didn't exist
2. **Use Simple Selectors**: `tr[data-testid="user-row"]:has-text("email")` worked better than complex page object methods
3. **Robust Login Helper**: Creating a dedicated login helper with debug output made authentication issues easy to spot

### Debug Helper Script Implementation
The Debug Helper Script provides an interactive REPL environment with helper functions:

1. **Interactive Commands**: 
   - `debug.goto(url)` - Navigate to any URL
   - `debug.loginAsAdmin()` - Quick admin login with code capture
   - `debug.loginAsUser()` - Quick user login
   - `debug.inspect()` - Comprehensive page state inspection
   - `debug.findByText(text)` - Search for elements containing text
   - `debug.screenshot(name?)` - Capture screenshots
   - `debug.click(selector)` - Click with helpful error messages
   - `debug.fill(selector, value)` - Fill inputs
   - `debug.evaluate(code)` - Execute JavaScript in browser

2. **Example Debug Scenarios**:
   - `/scripts/debug-scenarios/debug-admin-flow.ts` - Step through admin workflow
   - `/scripts/debug-scenarios/debug-failed-test.ts` - Reproduce test failures

3. **Key Benefits**:
   - Visual browser window for direct observation
   - Step-by-step execution with slow motion
   - REPL for experimenting with selectors
   - Automatic error logging and diagnostics
   - Persistent browser session for exploration

## Usage Examples

### Enhanced Error Reporting
```typescript
test.afterEach(async ({ page }, testInfo) => {
  await captureDebugInfo(page, testInfo);
});
```

### Debug Helper Script
```bash
npx tsx scripts/debug-browser.ts
# Then in the session:
await debug.loginAsAdmin()
await debug.inspect()
```

### Step-by-Step Debug Mode
```typescript
debugTest('should create user', async (page) => {
  // Each page action will be logged with before/after state
  await page.goto('/admin/users');
  await page.click('button:has-text("Create User")');
});
```