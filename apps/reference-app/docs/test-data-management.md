# Test Data Management Guide

This guide covers best practices for managing test data in E2E tests, ensuring tests are reliable, isolated, and maintainable.

## Core Principles

1. **Test Isolation**: Each test should create its own data
2. **Automatic Cleanup**: All test data should be cleaned up after tests
3. **Unique Data**: Use unique identifiers to avoid conflicts
4. **Predictable State**: Tests should start from a known state

## Test Data Factory

The `TestDataFactory` class provides centralized test data management:

```typescript
import { TestDataFactory } from './data-test-utils';

const dataFactory = new TestDataFactory();

// Always clean up in afterAll
test.afterAll(async () => {
  await dataFactory.cleanup();
});
```

## Creating Test Users

### Basic User Creation

```typescript
// Create a single user
const { userId, email } = await dataFactory.createUser({
  email: testData.generateEmail('test'),
  role: 'user',
  password: 'optional-password'
});

// Create an admin user
const admin = await dataFactory.createUser({
  email: testData.generateEmail('admin'),
  role: 'admin'
});
```

### Bulk User Creation

```typescript
// Create multiple users at once
const users = await dataFactory.createUsers([
  { email: 'user1@test.com', role: 'user' },
  { email: 'user2@test.com', role: 'user' },
  { email: 'admin@test.com', role: 'admin' }
]);
```

### User Creation with Authentication

```typescript
test.describe('Authenticated Tests', () => {
  let testUser: { email: string; isAdmin: boolean };
  let codeCapture: ReturnType<typeof startCodeCapture>;

  test.beforeAll(async () => {
    // Create user for authentication
    testUser = {
      email: testData.generateEmail('auth-test'),
      isAdmin: false
    };
    
    await createTestUsers([testUser]);
    codeCapture = startCodeCapture();
  });

  test.beforeEach(async ({ page }) => {
    // Login with test user
    const pages = createPageObjects(page);
    await pages.login.goto();
    await pages.login.requestLoginCode(testUser.email);
    const code = await codeCapture.getCode(testUser.email);
    await pages.login.verifyCode(code);
  });

  test.afterAll(async () => {
    codeCapture.stop();
  });
});
```

## Generating Test Data

### Unique Identifiers

Always use unique identifiers to avoid conflicts between tests:

```typescript
// Generate unique email
const email = testData.generateEmail('feature-test');
// Result: feature-test_1234567890_abc123@example.com

// Generate unique string
const taskTitle = testData.generateString('Task', 10);
// Result: Task_1234567890_abcdefghij

// Generate task with unique data
const task = testData.generateTask({
  title: testData.generateString('Weekly Report'),
  priority: 'high'
});
```

### Test Data Patterns

```typescript
// Pattern 1: Descriptive prefixes
const adminEmail = testData.generateEmail('admin-user-mgmt');
const taskOwnerEmail = testData.generateEmail('task-owner');

// Pattern 2: Test-specific data
test('should handle special characters', async () => {
  const task = testData.generateTask({
    title: 'Task with émojis 🎉 and spëcial chars',
    description: 'Testing <script>alert("xss")</script>'
  });
});

// Pattern 3: Boundary testing
const longTitle = testData.generateString('Task', 255);
const emptyDescription = '';
```

## Database Seeding

### Standard Test Data

For tests that need a populated environment:

```typescript
test.beforeAll(async () => {
  // Seed standard test data
  await seed.standard();
  // Creates:
  // - admin@test.com (admin)
  // - user1@test.com (user)
  // - user2@test.com (user)
  // - Sample tasks
});

test.afterAll(async () => {
  // Clear all test data
  await seed.clear();
});
```

### Custom Seeding

```typescript
// Minimal seeding for quick tests
await seed.minimal();

// Custom seeding
async function seedCustomData() {
  const factory = new TestDataFactory();
  
  // Create users
  const users = await factory.createUsers([
    { email: 'manager@test.com', role: 'admin' },
    { email: 'employee1@test.com', role: 'user' },
    { email: 'employee2@test.com', role: 'user' }
  ]);
  
  // Create related tasks
  for (const user of users) {
    await factory.createTask({
      title: `Task for ${user.email}`,
      assignedTo: user.email
    });
  }
  
  return factory;
}
```

## Data Cleanup Strategies

### Automatic Cleanup

The TestDataFactory automatically tracks created entities:

```typescript
const factory = new TestDataFactory();

// All created data is tracked
await factory.createUser({ email: 'test@example.com' });
await factory.createTask({ title: 'Test Task' });

// Single cleanup call removes everything
await factory.cleanup();
```

### Manual Cleanup

For specific cleanup needs:

```typescript
// Clean up by email pattern
await db.cleanupByEmail('test-prefix');

// Custom SQL cleanup
await db.query(`
  DELETE FROM tasks 
  WHERE created_at < NOW() - INTERVAL '1 hour'
  AND title LIKE 'test_%'
`);
```

### Test-Specific Cleanup

```typescript
test('should handle deletion', async ({ page }) => {
  const email = testData.generateEmail('delete-test');
  
  try {
    await dataFactory.createUser({ email });
    // ... test deletion
  } finally {
    // Ensure cleanup even if test fails
    await db.query(`DELETE FROM users WHERE email = '${email}'`);
  }
});
```

## Data Validation

### Checking Data State

```typescript
// Verify user exists
const exists = await validate.userExists('test@example.com');
expect(exists).toBe(true);

// Verify task exists
const taskExists = await validate.taskExists(taskId);
expect(taskExists).toBe(true);

// Check data state before test
test('should update existing user', async () => {
  const email = 'existing@test.com';
  
  // Ensure user exists
  if (!await validate.userExists(email)) {
    await dataFactory.createUser({ email });
  }
  
  // ... proceed with test
});
```

## Best Practices

### 1. Use Descriptive Test Data

```typescript
// ✅ Good - Clear what the test is doing
const blockedUser = await factory.createUser({
  email: testData.generateEmail('blocked-user'),
  metadata: { status: 'blocked' }
});

// ❌ Bad - Generic data
const user1 = await factory.createUser({
  email: 'test1@example.com'
});
```

### 2. Isolate Test Data

```typescript
// ✅ Good - Each test has unique data
test.describe('Feature A', () => {
  const featureAEmail = testData.generateEmail('feature-a');
});

test.describe('Feature B', () => {
  const featureBEmail = testData.generateEmail('feature-b');
});

// ❌ Bad - Shared data between tests
const sharedEmail = 'shared@test.com';
```

### 3. Clean Up Immediately

```typescript
// ✅ Good - Cleanup in afterAll
test.afterAll(async () => {
  await dataFactory.cleanup();
});

// ❌ Bad - No cleanup
test('creates data', async () => {
  await createUser({ email: 'never-cleaned@test.com' });
});
```

### 4. Handle Cleanup Failures

```typescript
test.afterAll(async () => {
  try {
    await dataFactory.cleanup();
  } catch (error) {
    console.error('Cleanup failed:', error);
    // Log but don't fail the test suite
  }
});
```

### 5. Document Test Data Requirements

```typescript
/**
 * Tests for user permission system
 * 
 * Test data requirements:
 * - Admin user with full permissions
 * - Regular user with limited permissions  
 * - Blocked user with no permissions
 */
test.describe('User Permissions', () => {
  // ... tests
});
```

## Troubleshooting

### Data Conflicts

If tests fail due to data conflicts:

1. Ensure unique identifiers using `testData.generate*` methods
2. Check for proper cleanup in afterAll hooks
3. Look for hardcoded test data that might conflict
4. Consider adding timestamps to data

### Cleanup Failures

If cleanup fails:

1. Check database permissions
2. Verify the cleanup scripts exist
3. Look for foreign key constraints
4. Consider manual database cleanup

### Performance Issues

For slow test data creation:

1. Create data in parallel when possible
2. Use minimal data sets
3. Consider data factories for complex scenarios
4. Reuse non-conflicting data when appropriate