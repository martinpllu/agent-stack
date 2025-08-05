import type { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Login page
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Page elements
   */
  get emailInput() {
    return this.page.locator('input[name="email"]');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Send Verification Code' });
  }

  get verificationCodeInput() {
    return this.page.locator('input[name="code"]');
  }

  get verifyButton() {
    return this.page.getByRole('button', { name: 'Verify' });
  }

  get resendCodeButton() {
    return this.page.getByRole('button', { name: 'Resend code' });
  }

  get backToLoginLink() {
    return this.page.getByRole('link', { name: 'Back to login' });
  }

  get loginForm() {
    return this.page.locator('form').filter({ has: this.emailInput });
  }

  get verificationForm() {
    return this.page.locator('form').filter({ has: this.verificationCodeInput });
  }

  /**
   * Page actions
   */
  async goto() {
    await super.goto('/auth/login');
  }

  async enterEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submitEmail() {
    await this.submitButton.click();
  }

  async requestLoginCode(email: string) {
    await this.enterEmail(email);
    await this.submitEmail();
    await this.waitForVerificationForm();
  }

  async enterVerificationCode(code: string) {
    await this.verificationCodeInput.fill(code);
  }

  async submitVerificationCode() {
    await this.verifyButton.click();
  }

  async verifyCode(code: string) {
    await this.enterVerificationCode(code);
    await this.submitVerificationCode();
  }

  async resendCode() {
    await this.resendCodeButton.click();
  }

  async goBackToLogin() {
    await this.backToLoginLink.click();
  }

  /**
   * Complete login flow
   */
  async login(email: string, code: string) {
    await this.goto();
    await this.requestLoginCode(email);
    await this.verifyCode(code);
  }

  /**
   * Assertions
   */
  async waitForLoginForm() {
    await this.loginForm.waitFor({ state: 'visible' });
  }

  async waitForVerificationForm() {
    await this.verificationForm.waitFor({ state: 'visible' });
  }

  async expectLoginFormVisible() {
    await this.waitForLoginForm();
  }

  async expectVerificationFormVisible() {
    await this.waitForVerificationForm();
  }

  async expectEmailInputHasValue(email: string) {
    await this.page.waitForFunction(
      (expectedEmail) => {
        const input = document.querySelector('input[name="email"]') as HTMLInputElement;
        return input?.value === expectedEmail;
      },
      email
    );
  }

  /**
   * State checks
   */
  async isOnLoginStep(): Promise<boolean> {
    return await this.loginForm.isVisible();
  }

  async isOnVerificationStep(): Promise<boolean> {
    return await this.verificationForm.isVisible();
  }
}