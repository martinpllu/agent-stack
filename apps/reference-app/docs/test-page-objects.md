# Page Object Models Guide

Page Object Models (POM) provide a structured way to interact with pages in your tests, making them more maintainable and readable.

## Overview

Each page in the application has a corresponding Page Object that encapsulates:
- Page elements (locators)
- Page actions (methods)
- Page assertions
- State checks

## Available Page Objects

### BasePage

All page objects extend from `BasePage`, providing common functionality:

```typescript
const page = new BasePage(playwrightPage);

// Common elements
page.navBar
page.userMenu
page.pageTitle
page.errorMessage
page.successMessage

// Common actions
await page.goto('/path');
await page.waitForPageLoad();
await page.logout();
await page.fillForm({ field: 'value' });
await page.submitForm('Button Text');

// Common assertions
await page.expectPageTitle('Title');
await page.expectErrorMessage('Error text');
await page.expectSuccessMessage('Success text');
```

### LoginPage

Handles authentication flows:

```typescript
const loginPage = new LoginPage(page);

// Navigate to login
await loginPage.goto();

// Login flow
await loginPage.requestLoginCode('test@example.com');
await loginPage.verifyCode('123456');

// Complete login in one call
await loginPage.login('test@example.com', '123456');

// Assertions
await loginPage.expectLoginFormVisible();
await loginPage.expectVerificationFormVisible();

// State checks
const isOnLogin = await loginPage.isOnLoginStep();
const isOnVerification = await loginPage.isOnVerificationStep();
```

### HomePage

Manages the home/dashboard page:

```typescript
const homePage = new HomePage(page);

await homePage.goto();

// Navigation
await homePage.navigateToTasks();
await homePage.navigateToAdmin();
await homePage.navigateToProfile();

// Actions
await homePage.clickGetStarted();

// Assertions
await homePage.expectWelcomeMessage('Welcome back!');
await homePage.expectQuickActionsVisible();

// State checks
const isAdmin = await homePage.isAdminLinkVisible();
const statValue = await homePage.getStatValue('total-tasks');
const activityCount = await homePage.getRecentActivityCount();
```

### TasksPage

Manages task operations:

```typescript
const tasksPage = new TasksPage(page);

// Create task
await tasksPage.createTask({
  title: 'New Task',
  description: 'Task description',
  priority: 'high',
  status: 'pending'
});

// Search and filter
await tasksPage.searchTasks('keyword');
await tasksPage.filterByStatus('in_progress');
await tasksPage.sortTasks('priority');

// Task operations
await tasksPage.editTask('Task Title');
await tasksPage.deleteTask('Task Title');
await tasksPage.toggleTaskComplete('Task Title');

// Assertions
await tasksPage.expectTaskVisible('Task Title');
await tasksPage.expectTaskCount(5);
await tasksPage.expectTaskHasStatus('Task Title', 'completed');
await tasksPage.expectTaskHasPriority('Task Title', 'high');
await tasksPage.expectEmptyState();

// Get task details
const details = await tasksPage.getTaskDetails('Task Title');
const count = await tasksPage.getTaskCount();
const isCompleted = await tasksPage.isTaskCompleted('Task Title');
```

### AdminUsersPage

Manages admin user operations:

```typescript
const adminPage = new AdminUsersPage(page);

// User management
await adminPage.createUser({
  email: 'new@example.com',
  name: 'New User',
  role: 'user'
});

await adminPage.editUser('user@example.com');
await adminPage.deleteUser('user@example.com');
await adminPage.changeUserRole('user@example.com', 'admin');
await adminPage.toggleUserStatus('user@example.com');

// Search and filter
await adminPage.searchUsers('search term');
await adminPage.filterByRole('admin');
await adminPage.filterByStatus('active');

// Assertions
await adminPage.expectUserVisible('user@example.com');
await adminPage.expectUserHasRole('user@example.com', 'admin');
await adminPage.expectUserIsActive('user@example.com');
await adminPage.expectUserCount(10);

// Get user information
const userDetails = await adminPage.getUserDetails('user@example.com');
const userCount = await adminPage.getUserCount();
const isActive = await adminPage.isUserActive('user@example.com');
```

## Using Page Objects in Tests

### Creating Page Objects

```typescript
import { createPageObjects } from './pages';

test('example test', async ({ page }) => {
  // Create all page objects at once
  const pages = createPageObjects(page);
  
  // Use individual pages
  await pages.login.goto();
  await pages.tasks.createTask({ title: 'Test' });
  await pages.adminUsers.searchUsers('test');
});
```

### Individual Page Objects

```typescript
import { LoginPage, TasksPage } from './pages';

test('example test', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const tasksPage = new TasksPage(page);
  
  await loginPage.login('test@example.com', '123456');
  await tasksPage.createTask({ title: 'Test' });
});
```

## Best Practices

### 1. Keep Page Objects Focused

Each page object should represent a single page or component:

```typescript
// ✅ Good - Single responsibility
class TasksPage {
  // Only task-related elements and actions
}

// ❌ Bad - Mixed responsibilities
class TasksAndUsersPage {
  // Multiple unrelated features
}
```

### 2. Use Descriptive Method Names

```typescript
// ✅ Good
await tasksPage.createTask(data);
await tasksPage.expectTaskVisible(title);

// ❌ Bad
await tasksPage.create(data);
await tasksPage.checkVisible(title);
```

### 3. Return Useful Values

```typescript
// ✅ Good - Returns useful data
async getTaskDetails(title: string): Promise<TaskDetails> {
  // Implementation
}

// ❌ Bad - No return value when data could be useful
async getTaskDetails(title: string): Promise<void> {
  // Just logs to console
}
```

### 4. Handle Waiting Properly

```typescript
// ✅ Good - Waits for elements
async expectTaskVisible(title: string) {
  await this.getTaskByTitle(title).waitFor({ state: 'visible' });
}

// ❌ Bad - No waiting
async expectTaskVisible(title: string) {
  return this.getTaskByTitle(title).isVisible();
}
```

### 5. Encapsulate Complex Interactions

```typescript
// ✅ Good - Single method for complex flow
async login(email: string, code: string) {
  await this.goto();
  await this.requestLoginCode(email);
  await this.verifyCode(code);
}

// ❌ Bad - Exposing all steps in test
// Test would need to call multiple methods
```

## Creating New Page Objects

When adding a new page to the application:

1. Create a new file in `tests/pages/`
2. Extend from `BasePage`
3. Add element locators as getters
4. Add action methods
5. Add assertion methods
6. Add state check methods
7. Export from `tests/pages/index.ts`

Example:

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class NewFeaturePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Elements
  get featureButton() {
    return this.page.getByRole('button', { name: 'Feature' });
  }

  // Actions
  async goto() {
    await super.goto('/new-feature');
  }

  async performAction() {
    await this.featureButton.click();
  }

  // Assertions
  async expectFeatureEnabled() {
    await expect(this.featureButton).toBeEnabled();
  }

  // State
  async isFeatureActive(): Promise<boolean> {
    return await this.featureButton.isEnabled();
  }
}
```