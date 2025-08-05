import { execSync } from 'child_process';
import type { Page } from '@playwright/test';

/**
 * Test data generation utilities
 */
export const testData = {
  /**
   * Generate a unique email for testing
   */
  generateEmail: (prefix = 'test'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}_${timestamp}_${random}@example.com`;
  },

  /**
   * Generate a unique string for testing
   */
  generateString: (prefix = 'test', length = 8): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 2 + length);
    return `${prefix}_${timestamp}_${random}`;
  },

  /**
   * Generate test task data
   */
  generateTask: (overrides: Partial<{ title: string; description: string; priority: 'low' | 'medium' | 'high' }> = {}) => {
    return {
      title: overrides.title || testData.generateString('Task'),
      description: overrides.description || 'Test task description',
      priority: overrides.priority || 'medium' as const,
    };
  },
};

/**
 * Database utilities for test setup and cleanup
 */
export const db = {
  /**
   * Reset database to a clean state
   */
  reset: async (): Promise<void> => {
    console.log('Resetting database...');
    try {
      execSync('tsx scripts/reset-db.ts --force', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
    } catch (error) {
      console.warn('Database reset failed (script may not exist yet):', error);
    }
  },

  /**
   * Run a SQL query for test setup
   */
  query: async (sql: string): Promise<void> => {
    try {
      execSync(`tsx scripts/sql-query.ts --query "${sql}"`, {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  },

  /**
   * Clean up test data by email pattern
   */
  cleanupByEmail: async (emailPattern: string): Promise<void> => {
    const sql = `DELETE FROM users WHERE email LIKE '${emailPattern}%'`;
    await db.query(sql);
  },
};

/**
 * Navigation utilities for Playwright tests
 */
export const navigation = {
  /**
   * Navigate to a page and wait for it to be fully loaded
   */
  goto: async (page: Page, path: string): Promise<void> => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  },

  /**
   * Navigate to the home page
   */
  gotoHome: async (page: Page): Promise<void> => {
    await navigation.goto(page, '/');
  },

  /**
   * Navigate to the login page
   */
  gotoLogin: async (page: Page): Promise<void> => {
    await navigation.goto(page, '/auth/login');
  },

  /**
   * Navigate to the admin dashboard
   */
  gotoAdmin: async (page: Page): Promise<void> => {
    await navigation.goto(page, '/admin');
  },

  /**
   * Navigate to the tasks page
   */
  gotoTasks: async (page: Page): Promise<void> => {
    await navigation.goto(page, '/tasks');
  },
};

/**
 * Common test actions
 */
export const actions = {
  /**
   * Fill and submit a form
   */
  fillAndSubmitForm: async (
    page: Page,
    formData: Record<string, string>,
    submitButtonText = 'Submit'
  ): Promise<void> => {
    for (const [field, value] of Object.entries(formData)) {
      const input = page.locator(`input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`);
      await input.fill(value);
    }
    await page.getByRole('button', { name: submitButtonText }).click();
  },

  /**
   * Wait for and dismiss a toast notification
   */
  waitForToast: async (page: Page, text?: string): Promise<void> => {
    const toast = text 
      ? page.locator('[role="alert"]', { hasText: text })
      : page.locator('[role="alert"]');
    await toast.waitFor({ state: 'visible' });
    await toast.waitFor({ state: 'hidden', timeout: 10000 });
  },

  /**
   * Click a button and wait for navigation
   */
  clickAndNavigate: async (page: Page, buttonText: string): Promise<void> => {
    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('button', { name: buttonText }).click(),
    ]);
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn: async (page: Page): Promise<boolean> => {
    try {
      await page.locator('[data-testid="user-menu"]').waitFor({ 
        state: 'visible', 
        timeout: 1000 
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Log out the current user
   */
  logout: async (page: Page): Promise<void> => {
    if (await actions.isLoggedIn(page)) {
      await page.locator('[data-testid="user-menu"]').click();
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
      await page.waitForURL('/auth/login');
    }
  },
};

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert that a page has a specific title
   */
  expectPageTitle: async (page: Page, title: string): Promise<void> => {
    await page.locator('h1', { hasText: title }).waitFor({ state: 'visible' });
  },

  /**
   * Assert that an element contains text
   */
  expectText: async (page: Page, text: string): Promise<void> => {
    await page.locator(`text="${text}"`).waitFor({ state: 'visible' });
  },

  /**
   * Assert that a form has an error
   */
  expectFormError: async (page: Page, errorText: string): Promise<void> => {
    await page.locator('[role="alert"]', { hasText: errorText }).waitFor({ state: 'visible' });
  },

  /**
   * Assert that user is on a specific page
   */
  expectPath: async (page: Page, path: string): Promise<void> => {
    await page.waitForURL(path);
  },
};

/**
 * Test fixtures and setup
 */
export const fixtures = {
  /**
   * Create a test context with common setup
   */
  createContext: async (options: { 
    authenticated?: boolean; 
    isAdmin?: boolean;
    userData?: any;
  } = {}): Promise<any> => {
    // This would be expanded based on your test framework
    return {
      authenticated: options.authenticated || false,
      isAdmin: options.isAdmin || false,
      userData: options.userData || null,
    };
  },
};

/**
 * Wait utilities
 */
export const wait = {
  /**
   * Wait for a specific amount of time
   */
  forTime: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Wait for an element to be visible
   */
  forElement: async (page: Page, selector: string, timeout = 30000): Promise<void> => {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
  },

  /**
   * Wait for an element to be hidden
   */
  forElementHidden: async (page: Page, selector: string, timeout = 30000): Promise<void> => {
    await page.locator(selector).waitFor({ state: 'hidden', timeout });
  },
};