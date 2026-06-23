// @ts-check

/**
 * Login Page Object Model
 * Stub for future authentication flow.
 * Currently the app has no auth - this is a placeholder for when auth is added.
 */
export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Login Form (future implementation)
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole('button', { name: /log in|sign in/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });

    // Error States
    this.errorMessage = page.locator('[data-testid="login-error"]');

    // Registration
    this.registerLink = page.getByRole('link', { name: /register|sign up/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
  }
}
