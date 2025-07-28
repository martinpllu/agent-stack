# Test Utilities Reference

This document provides a comprehensive reference for all test utilities available in the codebase.

## General Test Utilities (`test-utils.ts`)

### Test Data Generation

```typescript
// Generate unique test email
const email = testData.generateEmail('prefix');
// Example: prefix_1234567890_abc123@example.com

// Generate unique string
const str = testData.generateString('prefix', 10);
// Example: prefix_1234567890_abcdefghij

// Generate task data
const task = testData.generateTask({
  title: 'Custom Title',
  description: 'Custom Description',
  priority: 'high'
});
```

### Navigation Utilities

```typescript
// Navigate to pages
await navigation.goto(page, '/custom-path');
await navigation.gotoHome(page);
await navigation.gotoLogin(page);
await navigation.gotoAdmin(page);
await navigation.gotoTasks(page);
```

### Common Actions

```typescript
// Form interactions
await actions.fillAndSubmitForm(page, {
  email: 'test@example.com',
  password: 'password123'
}, 'Submit');

// Wait for toast notifications
await actions.waitForToast(page, 'Success message');

// Authentication checks
const isLoggedIn = await actions.isLoggedIn(page);
await actions.logout(page);
```

### Assertions

```typescript
// Page assertions
await assertions.expectPageTitle(page, 'Expected Title');
await assertions.expectText(page, 'Expected text');
await assertions.expectFormError(page, 'Email is required');
await assertions.expectPath(page, '/expected-path');
```

### Wait Utilities

```typescript
// Wait for specific conditions
await wait.forTime(1000); // Wait 1 second
await wait.forElement(page, '[data-testid="element"]');
await wait.forElementHidden(page, '.loading-spinner');
```

## Authentication Utilities (`auth-test-utils.ts`)

### User Creation

```typescript
// Create single test user
await createTestUsers([{
  email: 'test@example.com',
  isAdmin: false
}]);

// Create multiple users
await createTestUsers([
  { email: 'admin@test.com', isAdmin: true },
  { email: 'user@test.com', isAdmin: false }
]);
```

### Verification Code Capture

```typescript
// Start code capture for development environment
const codeCapture = startCodeCapture();

// Get verification code for email
const code = await codeCapture.getCode('test@example.com');

// Stop capture when done
codeCapture.stop();
```

## Data Test Utilities (`data-test-utils.ts`)

### TestDataFactory

```typescript
// Initialize factory
const dataFactory = new TestDataFactory();

// Create user with tracking
const { userId, email } = await dataFactory.createUser({
  email: 'test@example.com',
  role: 'admin',
  password: 'optional-password'
});

// Create multiple users
const users = await dataFactory.createUsers([
  { email: 'user1@test.com', role: 'user' },
  { email: 'user2@test.com', role: 'admin' }
]);

// Clean up all created data
await dataFactory.cleanup();

// Get created entities for debugging
const { users, tasks } = dataFactory.getCreatedEntities();
```

### Database Seeding

```typescript
// Seed standard test data
await seed.standard();
// Creates: admin@test.com, user1@test.com, user2@test.com
// Plus sample tasks

// Seed minimal data
await seed.minimal();
// Creates: test@example.com

// Clear all test data
await seed.clear();
// Removes all test users and tasks
```

### Data Validation

```typescript
// Check if user exists
const exists = await validate.userExists('test@example.com');

// Check if task exists
const taskExists = await validate.taskExists('task_123');
```

### Test Environment

```typescript
// Check if environment is ready
const ready = await testEnv.isReady();

// Wait for environment
await testEnv.waitUntilReady(30000); // 30 second timeout
```

## Database Utilities

```typescript
// Reset database (if script exists)
await db.reset();

// Run SQL query
await db.query('DELETE FROM users WHERE email LIKE "test_%"');

// Clean up by email pattern
await db.cleanupByEmail('test_');
```

## Usage Examples

### Complete Test Setup

```typescript
test.describe('Feature Tests', () => {
  let dataFactory: TestDataFactory;
  let codeCapture: ReturnType<typeof startCodeCapture>;

  test.beforeAll(async () => {
    // Initialize utilities
    dataFactory = new TestDataFactory();
    codeCapture = startCodeCapture();
    
    // Create test data
    await dataFactory.createUser({
      email: testData.generateEmail('feature-test'),
      role: 'user'
    });
  });

  test.afterAll(async () => {
    // Clean up
    await dataFactory.cleanup();
    codeCapture.stop();
  });

  test('should perform action', async ({ page }) => {
    // Use utilities in test
    const email = testData.generateEmail('test');
    await navigation.gotoLogin(page);
    // ... rest of test
  });
});
```

### Custom Test Helpers

You can create custom helpers by combining utilities:

```typescript
async function loginAsAdmin(page: Page) {
  const adminEmail = testData.generateEmail('admin');
  
  await createTestUsers([{
    email: adminEmail,
    isAdmin: true
  }]);
  
  const codeCapture = startCodeCapture();
  await navigation.gotoLogin(page);
  await actions.fillAndSubmitForm(page, { email: adminEmail });
  
  const code = await codeCapture.getCode(adminEmail);
  await actions.fillAndSubmitForm(page, { code });
  
  codeCapture.stop();
  return adminEmail;
}
```