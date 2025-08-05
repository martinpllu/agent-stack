# Testing Overview

This application uses a comprehensive testing strategy with multiple layers of tests to ensure code quality and reliability.

## Testing Stack

- **Unit Tests**: Vitest for component and utility testing
- **E2E Tests**: Playwright for end-to-end testing
- **Page Object Model**: Structured test organization for maintainability

## Test Structure

```
tests/
├── pages/                 # Page Object Models
│   ├── base.page.ts      # Base page class
│   ├── login.page.ts     # Login page POM
│   ├── home.page.ts      # Home page POM
│   ├── tasks.page.ts     # Tasks page POM
│   └── admin-users.page.ts # Admin users POM
├── auth-test-utils.ts    # Authentication utilities
├── test-utils.ts         # General test utilities
├── data-test-utils.ts    # Test data management
└── *.e2e.test.ts        # E2E test files
```

## Key Principles

1. **Every code change must be verified with tests** - No feature is complete without tests
2. **Use Page Object Models** - Encapsulate page interactions for maintainability
3. **Create reusable utilities** - DRY principle for test code
4. **Clean test data** - Always clean up after tests
5. **Descriptive test names** - Tests should document behavior

## Running Tests

```bash
# Run all unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/tasks-management.e2e.test.ts
```

## Test Environment Setup

Before running tests, ensure:
1. SST dev server is running: `npx sst dev`
2. Database is accessible
3. Test users are created (handled automatically by test utilities)

**Note**: Check `.sst/log/web.log` for the actual port if tests fail to connect. The dev server may use a different port (e.g., 5175) if the default port is in use.

## Writing New Tests

See the following guides:
- [Unit Testing Guide](./test-unit-testing.md)
- [E2E Testing Guide](./test-e2e-guide.md)
- [Test Utilities Reference](./test-utilities.md)
- [Page Object Models Guide](./test-page-objects.md)
- [Test Data Management](./test-data-management.md)