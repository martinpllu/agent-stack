/**
 * Central export for all Page Object Models
 */

export { BasePage } from './base.page';
export { LoginPage } from './login.page';
export { HomePage } from './home.page';
export { TasksPage } from './tasks.page';
export { AdminUsersPage } from './admin-users.page';

/**
 * Factory function to create all page objects for a test
 */
import type { Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { HomePage } from './home.page';
import { TasksPage } from './tasks.page';
import { AdminUsersPage } from './admin-users.page';

export function createPageObjects(page: Page) {
  return {
    login: new LoginPage(page),
    home: new HomePage(page),
    tasks: new TasksPage(page),
    adminUsers: new AdminUsersPage(page),
  };
}

/**
 * Type for the page objects collection
 */
export type PageObjects = ReturnType<typeof createPageObjects>;