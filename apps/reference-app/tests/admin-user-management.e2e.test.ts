import { test, expect } from '@playwright/test';
import { createPageObjects, type PageObjects } from './pages';
import { createTestUsers, startCodeCapture } from './auth-test-utils';
import { TestDataFactory } from './data-test-utils';
import { testData } from './test-utils';
import { captureDebugInfo } from './test-helpers/debug-on-failure';
import { loginAsAdmin, loginUser } from './test-helpers/login-helper';

/**
 * E2E tests for Admin User Management
 * Demonstrates:
 * - Role-based access control testing
 * - Admin-specific functionality
 * - Complex user interactions
 * - Permission testing
 */

// Test fixtures
let pages: PageObjects;
let dataFactory: TestDataFactory;
let codeCapture: ReturnType<typeof startCodeCapture>;

// Test users
const adminUser = {
  email: testData.generateEmail('admin-test'),
  isAdmin: true,
};

const regularUser = {
  email: testData.generateEmail('regular-test'),
  isAdmin: false,
};

test.describe('Admin User Management', () => {
  test.beforeAll(async () => {
    dataFactory = new TestDataFactory();
    
    // Create test users
    await createTestUsers([adminUser, regularUser]);
    
    // Start code capture
    codeCapture = startCodeCapture();
  });

  test.afterAll(async () => {
    await dataFactory.cleanup();
    codeCapture.stop();
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureDebugInfo(page, testInfo);
  });

  test.describe('Access Control', () => {
    test('admin should access user management page', async ({ page }) => {
      // Arrange
      pages = createPageObjects(page);
      
      // Act - Login as admin
      await loginAsAdmin(page, adminUser.email, codeCapture);

      // Navigate to admin area
      await pages.home.navigateToAdmin();

      // Assert
      await expect(page).toHaveURL(/.*\/admin\/users/);
      await pages.adminUsers.expectPageTitle('User Management');
      await expect(pages.adminUsers.usersTable).toBeVisible();
    });

    test('regular user should not see admin link', async ({ page }) => {
      // Arrange
      pages = createPageObjects(page);
      
      // Act - Login as regular user
      await loginUser(page, {
        email: regularUser.email,
        codeCapture,
        expectedRedirect: '/'
      });

      // Assert - Admin link should not be visible for non-admin users
      await expect(pages.home.adminLink).not.toBeVisible();
      
      // Try to access admin URL directly
      await page.goto('/admin/users');
      
      // Should redirect to login page (as per handleAuthError)
      await expect(page).toHaveURL(/.*\/auth\/login/);
    });
  });

  test.describe('User Management Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin before each test
      pages = createPageObjects(page);
      await loginAsAdmin(page, adminUser.email, codeCapture);
      
      // Navigate to admin users page
      await pages.adminUsers.goto();
      await expect(page).toHaveURL(/.*\/admin\/users/);
    });

    test('should display existing users', async ({ page }) => {
      // Assert - Check that both users are visible in the table
      const adminRow = page.locator(`tr[data-testid="user-row"]:has-text("${adminUser.email}")`);
      const regularRow = page.locator(`tr[data-testid="user-row"]:has-text("${regularUser.email}")`);
      
      await expect(adminRow).toBeVisible();
      await expect(regularRow).toBeVisible();
      
      // Verify admin user shows as admin
      await expect(adminRow).toContainText('Admin');
      await expect(adminRow).toContainText('Validated');
      
      // Verify regular user shows as user
      await expect(regularRow).toContainText('User');
      await expect(regularRow).toContainText('Validated');
      
      // Admin should not have action buttons (can't modify self)
      const adminButtons = adminRow.locator('button');
      await expect(adminButtons).toHaveCount(0);
      
      // Regular user should have action buttons
      const regularButtons = regularRow.locator('button');
      await expect(regularButtons).toHaveCount(2); // Make Admin + Delete
    });

    test.skip('should create a new user', async ({ page }) => {
      // SKIPPED: Admin page doesn't have create user functionality
      // Users are created through the signup flow
    });

    test.skip('should edit user details', async ({ page }) => {
      // SKIPPED: Admin page doesn't have edit user functionality
      // Only toggle admin status and delete are available
    });

    test('should change user role', async ({ page }) => {
      // Arrange
      const roleUser = {
        email: testData.generateEmail('role-change'),
        role: 'user' as const,
      };
      await dataFactory.createUser(roleUser);
      await page.reload();

      // Act - Find the user row and click Make Admin
      const userRow = page.locator(`tr[data-testid="user-row"]:has-text("${roleUser.email}")`);
      await expect(userRow).toBeVisible();
      
      // Should initially show as User
      await expect(userRow).toContainText('User');
      
      // Click Make Admin button
      await userRow.locator('button:has-text("Make Admin")').click();
      
      // Wait for page to update
      await page.waitForLoadState('networkidle');

      // Assert - User should now be admin
      await expect(userRow).toContainText('Admin');
      await expect(userRow.locator('button:has-text("Remove Admin")')).toBeVisible();
    });

    test.skip('should toggle user status', async ({ page }) => {
      // SKIPPED: Admin page doesn't have status toggle
      // Users can only be validated (one-way operation)
    });

    test('should delete a user', async ({ page }) => {
      // Arrange
      const deleteUser = {
        email: testData.generateEmail('delete-user'),
        role: 'user' as const,
      };
      await dataFactory.createUser(deleteUser);
      await page.reload();
      
      // Find the user row
      const userRow = page.locator(`tr[data-testid="user-row"]:has-text("${deleteUser.email}")`);
      await expect(userRow).toBeVisible();

      // Act - Click Delete button
      await userRow.locator('button:has-text("Delete")').click();
      
      // Wait for deletion to complete
      await page.waitForLoadState('networkidle');

      // Assert - User should no longer be visible
      await expect(userRow).not.toBeVisible();
    });
  });

  test.describe.skip('Search and Filter', () => {
    // SKIPPED: Admin page doesn't have search/filter functionality
    test.beforeEach(async ({ page }) => {
      // Create test data
      const testUsers = [
        { email: testData.generateEmail('search-admin'), role: 'admin' as const },
        { email: testData.generateEmail('search-user1'), role: 'user' as const },
        { email: testData.generateEmail('search-user2'), role: 'user' as const },
        { email: testData.generateEmail('different'), role: 'user' as const },
      ];

      for (const user of testUsers) {
        await dataFactory.createUser(user);
      }

      // Login as admin
      pages = createPageObjects(page);
      await pages.login.goto();
      await pages.login.requestLoginCode(adminUser.email);
      const code = await codeCapture.getCode(adminUser.email);
      await pages.login.verifyCode(code);
      await page.waitForURL('**/');
      await pages.adminUsers.goto();
    });

    test('should search users by email', async ({ page }) => {
      // Act
      await pages.adminUsers.searchUsers('search-user');

      // Assert
      await pages.adminUsers.expectUserVisible('search-user1');
      await pages.adminUsers.expectUserVisible('search-user2');
      await pages.adminUsers.expectUserNotVisible('different');
      await pages.adminUsers.expectUserNotVisible('search-admin');
    });

    test('should filter users by role', async ({ page }) => {
      // Act - Filter admins
      await pages.adminUsers.filterByRole('admin');
      
      // Assert
      const adminCount = await pages.adminUsers.getUserCount();
      const adminRows = await pages.adminUsers.userRows.all();
      
      for (const row of adminRows) {
        await expect(row.locator('[data-testid^="user-role-admin"]')).toBeVisible();
      }

      // Act - Filter regular users
      await pages.adminUsers.filterByRole('user');
      
      // Assert
      const userRows = await pages.adminUsers.userRows.all();
      for (const row of userRows) {
        await expect(row.locator('[data-testid^="user-role-user"]')).toBeVisible();
      }
    });

    test('should combine search and filter', async ({ page }) => {
      // Act
      await pages.adminUsers.searchUsers('search');
      await pages.adminUsers.filterByRole('user');

      // Assert
      await pages.adminUsers.expectUserVisible('search-user1');
      await pages.adminUsers.expectUserVisible('search-user2');
      await pages.adminUsers.expectUserNotVisible('search-admin');
      await pages.adminUsers.expectUserNotVisible('different');
    });
  });

  test.describe('Validation and Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      pages = createPageObjects(page);
      await loginAsAdmin(page, adminUser.email, codeCapture);
      await pages.adminUsers.goto();
    });

    test.skip('should validate email format', async ({ page }) => {
      // SKIPPED: No create user functionality
    });

    test.skip('should prevent duplicate emails', async ({ page }) => {
      // SKIPPED: No create user functionality
    });

    test('should prevent self-deletion', async ({ page }) => {
      // Act - Find admin's own row
      const adminRow = page.locator(`tr[data-testid="user-row"]:has-text("${adminUser.email}")`);
      await expect(adminRow).toBeVisible();
      
      // Assert - Admin should not have any action buttons for their own account
      const deleteButtons = adminRow.locator('button:has-text("Delete")');
      await expect(deleteButtons).toHaveCount(0);
    });
  });
});