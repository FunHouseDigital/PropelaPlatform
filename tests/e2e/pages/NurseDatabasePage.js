// @ts-check

/**
 * Nurse Database Page Object Model
 * Provides selectors and actions for the nurse database/pipeline page.
 */
export class NurseDatabasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Search
    this.searchInput = page.getByPlaceholder(/search/i);

    // Filter Panel
    this.filterPanel = page.locator('[data-testid="filter-panel"]');
    this.filterToggle = page.getByRole('button', { name: /filter/i });
    this.pipelineStageFilters = page.locator('[data-testid="pipeline-stage-filter"] input[type="checkbox"]');

    // View Toggles
    this.galleryViewButton = page.getByRole('button', { name: /gallery/i });
    this.pipelineViewButton = page.getByRole('button', { name: /pipeline/i });

    // Nurse Cards (Gallery View)
    this.nurseCards = page.locator('[data-testid="nurse-card"]');
    this.nurseCardNames = page.locator('[data-testid="nurse-card"] [data-testid="nurse-name"]');

    // Pipeline View
    this.pipelineColumns = page.locator('[data-testid="pipeline-column"]');
    this.pipelineColumnHeaders = page.locator('[data-testid="pipeline-column-header"]');

    // Nurse Detail Modal
    this.nurseModal = page.locator('[data-testid="nurse-modal"]');
    this.nurseModalClose = page.locator('[data-testid="nurse-modal-close"]');
    this.nurseModalName = page.locator('[data-testid="nurse-modal-name"]');

    // Sorting
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"]');
  }

  async goto() {
    await this.page.goto('/nurses');
  }

  async searchNurse(name) {
    await this.searchInput.fill(name);
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async selectGalleryView() {
    await this.galleryViewButton.click();
  }

  async selectPipelineView() {
    await this.pipelineViewButton.click();
  }

  async clickNurseCard(index = 0) {
    await this.nurseCards.nth(index).click();
  }

  async closeNurseModal() {
    await this.nurseModalClose.click();
  }

  async getNurseCount() {
    return this.nurseCards.count();
  }

  async toggleFilter(stageName) {
    const checkbox = this.page.getByLabel(new RegExp(stageName, 'i'));
    await checkbox.click();
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
  }
}
