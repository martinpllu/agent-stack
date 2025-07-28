import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Admin Users page
 */
export class AdminUsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Page elements
   */
  get usersTable() {
    return this.page.locator('[data-testid="users-table"]');
  }

  get userRows() {
    return this.page.locator('[data-testid="user-row"]');
  }

  get createUserButton() {
    return this.page.getByRole('button', { name: 'Create User' });
  }

  get searchInput() {
    return this.page.locator('input[placeholder*="Search users"]');
  }

  get roleFilter() {
    return this.page.locator('[data-testid="role-filter"]');
  }

  get statusFilter() {
    return this.page.locator('[data-testid="status-filter"]');
  }

  // User form elements
  get userDialog() {
    return this.page.locator('[role="dialog"]');
  }

  get emailInput() {
    return this.page.locator('input[name="email"]');
  }

  get nameInput() {
    return this.page.locator('input[name="name"]');
  }

  get roleSelect() {
    return this.page.locator('select[name="role"]');
  }

  get saveUserButton() {
    return this.page.getByRole('button', { name: 'Save User' });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Page actions
   */
  async goto() {
    await super.goto('/admin/users');
  }

  async createUser(userData: {
    email: string;
    name?: string;
    role?: 'admin' | 'user';
  }) {
    await this.createUserButton.click();
    await this.userDialog.waitFor({ state: 'visible' });

    await this.emailInput.fill(userData.email);
    
    if (userData.name) {
      await this.nameInput.fill(userData.name);
    }

    if (userData.role) {
      await this.roleSelect.selectOption(userData.role);
    }

    await this.saveUserButton.click();
    await this.userDialog.waitFor({ state: 'hidden' });
  }

  async searchUsers(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce delay
  }

  async filterByRole(role: 'all' | 'admin' | 'user') {
    await this.roleFilter.selectOption(role);
  }

  async filterByStatus(status: 'all' | 'active' | 'inactive') {
    await this.statusFilter.selectOption(status);
  }

  getUserRow(email: string): Locator {
    return this.userRows.filter({ hasText: email });
  }

  async editUser(email: string) {
    const userRow = this.getUserRow(email);
    await userRow.getByRole('button', { name: 'Edit' }).click();
    await this.userDialog.waitFor({ state: 'visible' });
  }

  async deleteUser(email: string) {
    const userRow = this.getUserRow(email);
    await userRow.getByRole('button', { name: 'Delete' }).click();
    
    // Handle confirmation dialog
    await this.page.getByRole('button', { name: 'Confirm Delete' }).click();
  }

  async toggleUserStatus(email: string) {
    const userRow = this.getUserRow(email);
    await userRow.getByRole('switch', { name: 'Toggle status' }).click();
  }

  async changeUserRole(email: string, newRole: 'admin' | 'user') {
    await this.editUser(email);
    await this.roleSelect.selectOption(newRole);
    await this.saveUserButton.click();
    await this.userDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Assertions
   */
  async expectUserCount(count: number) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const users = document.querySelectorAll('[data-testid="user-row"]');
        return users.length === expectedCount;
      },
      count
    );
  }

  async expectUserVisible(email: string) {
    await this.getUserRow(email).waitFor({ state: 'visible' });
  }

  async expectUserNotVisible(email: string) {
    await this.getUserRow(email).waitFor({ state: 'hidden' });
  }

  async expectUserHasRole(email: string, role: string) {
    const userRow = this.getUserRow(email);
    await userRow.locator(`[data-testid="user-role-${role}"]`).waitFor({ state: 'visible' });
  }

  async expectUserIsActive(email: string) {
    const userRow = this.getUserRow(email);
    await userRow.locator('[data-testid="user-status-active"]').waitFor({ state: 'visible' });
  }

  async expectUserIsInactive(email: string) {
    const userRow = this.getUserRow(email);
    await userRow.locator('[data-testid="user-status-inactive"]').waitFor({ state: 'visible' });
  }

  /**
   * State checks
   */
  async getUserCount(): Promise<number> {
    const users = await this.userRows.all();
    return users.length;
  }

  async getUserDetails(email: string): Promise<{
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
  }> {
    const userRow = this.getUserRow(email);
    
    return {
      email: await userRow.locator('[data-testid="user-email"]').textContent() || '',
      name: await userRow.locator('[data-testid="user-name"]').textContent() || '',
      role: await userRow.locator('[data-testid^="user-role-"]').getAttribute('data-testid') || '',
      status: await userRow.locator('[data-testid^="user-status-"]').getAttribute('data-testid') || '',
      createdAt: await userRow.locator('[data-testid="user-created-at"]').textContent() || '',
    };
  }

  async isUserActive(email: string): Promise<boolean> {
    const userRow = this.getUserRow(email);
    const statusElement = userRow.locator('[data-testid^="user-status-"]');
    const status = await statusElement.getAttribute('data-testid');
    return status === 'user-status-active';
  }
}