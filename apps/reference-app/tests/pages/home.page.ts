import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Home page
 */
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Page elements
   */
  get welcomeMessage() {
    return this.page.locator('[data-testid="welcome-message"]');
  }

  get getStartedButton() {
    return this.page.getByRole('button', { name: 'Get Started' });
  }

  get tasksLink() {
    return this.page.getByRole('link', { name: 'Tasks' });
  }

  get adminLink() {
    // Admin link is in the navigation menu, only visible for admin users
    return this.page.locator('nav').getByRole('link', { name: 'Admin' });
  }

  get profileLink() {
    return this.page.getByRole('link', { name: 'Profile' });
  }

  get quickActions() {
    return this.page.locator('[data-testid="quick-actions"]');
  }

  get recentActivity() {
    return this.page.locator('[data-testid="recent-activity"]');
  }

  get dashboardStats() {
    return this.page.locator('[data-testid="dashboard-stats"]');
  }

  /**
   * Page actions
   */
  async goto() {
    await super.goto('/');
  }

  async navigateToTasks() {
    await this.tasksLink.click();
    await this.page.waitForURL('**/tasks');
  }

  async navigateToAdmin() {
    await this.adminLink.click();
    await this.page.waitForURL('**/admin/**');
  }

  async navigateToProfile() {
    await this.profileLink.click();
    await this.page.waitForURL('**/user');
  }

  async clickGetStarted() {
    await this.getStartedButton.click();
  }

  /**
   * Assertions
   */
  async expectWelcomeMessage(text: string) {
    await this.welcomeMessage.filter({ hasText: text }).waitFor({ state: 'visible' });
  }

  async expectQuickActionsVisible() {
    await this.quickActions.waitFor({ state: 'visible' });
  }

  async expectRecentActivityVisible() {
    await this.recentActivity.waitFor({ state: 'visible' });
  }

  async expectDashboardStatsVisible() {
    await this.dashboardStats.waitFor({ state: 'visible' });
  }

  /**
   * State checks
   */
  async isAdminLinkVisible(): Promise<boolean> {
    return await this.adminLink.isVisible();
  }

  async getStatValue(statName: string): Promise<string> {
    const stat = this.page.locator(`[data-testid="stat-${statName}"]`);
    return await stat.textContent() || '';
  }

  async getRecentActivityCount(): Promise<number> {
    const items = await this.recentActivity.locator('[data-testid="activity-item"]').all();
    return items.length;
  }
}