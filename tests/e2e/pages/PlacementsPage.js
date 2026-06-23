// @ts-check

/**
 * Placements Page Object Model
 * Provides selectors and actions for the placement tracker page.
 */
export class PlacementsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Pipeline Columns
    this.pipelineColumns = page.locator('[data-testid="placement-column"]');
    this.matchingColumn = page.locator('[data-testid="placement-column-matching"]');
    this.interviewColumn = page.locator('[data-testid="placement-column-interview"]');
    this.offerColumn = page.locator('[data-testid="placement-column-offer"]');
    this.onboardingColumn = page.locator('[data-testid="placement-column-onboarding"]');
    this.activeColumn = page.locator('[data-testid="placement-column-active"]');
    this.completedColumn = page.locator('[data-testid="placement-column-completed"]');

    // Placement Cards
    this.placementCards = page.locator('[data-testid="placement-card"]');
    this.placementCardNurseNames = page.locator('[data-testid="placement-card"] [data-testid="nurse-name"]');
    this.placementCardFacilities = page.locator('[data-testid="placement-card"] [data-testid="facility-name"]');

    // Actions
    this.addPlacementButton = page.getByRole('button', { name: /add placement|new placement/i });
    this.placementDetailModal = page.locator('[data-testid="placement-detail-modal"]');
    this.placementModalClose = page.locator('[data-testid="placement-modal-close"]');

    // Filters
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.facilityFilter = page.locator('[data-testid="facility-filter"]');
    this.searchInput = page.getByPlaceholder(/search placements/i);
  }

  async goto() {
    await this.page.goto('/placements');
  }

  async getColumnCount() {
    return this.pipelineColumns.count();
  }

  async getPlacementCardCount() {
    return this.placementCards.count();
  }

  async getCardsInColumn(columnTestId) {
    return this.page.locator(`[data-testid="${columnTestId}"] [data-testid="placement-card"]`).count();
  }

  async clickPlacementCard(index = 0) {
    await this.placementCards.nth(index).click();
  }

  async closePlacementModal() {
    await this.placementModalClose.click();
  }

  async clickAddPlacement() {
    await this.addPlacementButton.click();
  }

  async searchPlacements(query) {
    await this.searchInput.fill(query);
  }

  async dragPlacementToColumn(cardIndex, targetColumnTestId) {
    const card = this.placementCards.nth(cardIndex);
    const targetColumn = this.page.locator(`[data-testid="${targetColumnTestId}"]`);
    await card.dragTo(targetColumn);
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
  }
}
