import type { Page, Locator } from '@playwright/test';

/**
 * Base Page Object Model that other pages extend
 */
export class BasePage {
  constructor(public readonly page: Page) {}

  /**
   * Common navigation elements
   */
  get navBar() {
    return this.page.locator('nav');
  }

  get userMenu() {
    return this.page.locator('[data-testid="user-menu"]');
  }

  get signOutButton() {
    return this.page.getByRole('menuitem', { name: 'Sign out' });
  }

  /**
   * Common page elements
   */
  get pageTitle() {
    return this.page.locator('h1').first();
  }

  get loadingSpinner() {
    return this.page.locator('[data-testid="loading-spinner"]');
  }

  get errorMessage() {
    return this.page.locator('[role="alert"]');
  }

  get successMessage() {
    return this.page.locator('[data-testid="success-message"]');
  }

  /**
   * Common actions
   */
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.loadingSpinner.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async getPageTitleText(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.userMenu.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    if (await this.isLoggedIn()) {
      await this.userMenu.click();
      await this.signOutButton.click();
      await this.page.waitForURL('**/auth/login');
    }
  }

  async expectErrorMessage(text: string) {
    await this.errorMessage.filter({ hasText: text }).waitFor({ state: 'visible' });
  }

  async expectSuccessMessage(text: string) {
    await this.successMessage.filter({ hasText: text }).waitFor({ state: 'visible' });
  }

  async expectPageTitle(title: string) {
    await this.pageTitle.filter({ hasText: title }).waitFor({ state: 'visible' });
  }

  /**
   * Form helpers
   */
  async fillForm(formData: Record<string, string>) {
    for (const [name, value] of Object.entries(formData)) {
      const field = this.page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
      await field.fill(value);
    }
  }

  async submitForm(buttonText = 'Submit') {
    await this.page.getByRole('button', { name: buttonText }).click();
  }

  /**
   * Wait helpers
   */
  async waitForNavigation() {
    await this.page.waitForNavigation();
  }

  async waitForToastAndDismiss(text?: string) {
    const toast = text 
      ? this.page.locator('[role="alert"]', { hasText: text })
      : this.page.locator('[role="alert"]');
    await toast.waitFor({ state: 'visible' });
    await toast.waitFor({ state: 'hidden', timeout: 10000 });
  }
}