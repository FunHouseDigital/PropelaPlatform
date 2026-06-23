// @ts-check

/**
 * Documents Page Object Model
 * Provides selectors and actions for the document management page.
 */
export class DocumentsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Tab Navigation
    this.repositoryTab = page.getByRole('tab', { name: /repository/i });
    this.complianceTab = page.getByRole('tab', { name: /compliance/i });
    this.templatesTab = page.getByRole('tab', { name: /templates/i });
    this.verificationTab = page.getByRole('tab', { name: /verification/i });

    // Document Repository
    this.documentList = page.locator('[data-testid="document-list"]');
    this.documentItems = page.locator('[data-testid="document-item"]');
    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.documentSearchInput = page.getByPlaceholder(/search documents/i);

    // Compliance Checklist
    this.complianceChecklist = page.locator('[data-testid="compliance-checklist"]');
    this.complianceItems = page.locator('[data-testid="compliance-item"]');
    this.complianceProgress = page.locator('[data-testid="compliance-progress"]');

    // Verification Workflow
    this.verificationQueue = page.locator('[data-testid="verification-queue"]');
    this.verificationItems = page.locator('[data-testid="verification-item"]');
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });

    // Document Templates
    this.templateList = page.locator('[data-testid="template-list"]');
    this.templateItems = page.locator('[data-testid="template-item"]');
  }

  async goto() {
    await this.page.goto('/documents');
  }

  async switchToTab(tabName) {
    const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    await tab.click();
  }

  async searchDocuments(query) {
    await this.documentSearchInput.fill(query);
  }

  async clickUpload() {
    await this.uploadButton.click();
  }

  async getDocumentCount() {
    return this.documentItems.count();
  }

  async getComplianceItemCount() {
    return this.complianceItems.count();
  }

  async getVerificationQueueCount() {
    return this.verificationItems.count();
  }

  async approveDocument(index = 0) {
    await this.verificationItems.nth(index).locator('button', { hasText: /approve/i }).click();
  }

  async rejectDocument(index = 0) {
    await this.verificationItems.nth(index).locator('button', { hasText: /reject/i }).click();
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
  }
}
