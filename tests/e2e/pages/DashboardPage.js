// @ts-check

/**
 * Dashboard Page Object Model
 * Provides selectors and actions for the main dashboard page.
 */
export class DashboardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // KPI Cards
    this.kpiCards = page.locator('[data-testid="kpi-card"]');
    this.totalNursesKpi = page.locator('text=Total Nurses').locator('..');
    this.activePlacementsKpi = page.locator('text=Active Placements').locator('..');
    this.complianceRateKpi = page.locator('text=Compliance Rate').locator('..');
    this.revenueKpi = page.locator('text=Revenue').locator('..');

    // Charts
    this.pipelineChart = page.locator('[data-testid="pipeline-chart"]');
    this.placementTrendChart = page.locator('[data-testid="placement-trend-chart"]');
    this.complianceChart = page.locator('[data-testid="compliance-chart"]');
    this.chartContainer = page.locator('.recharts-wrapper');

    // Quick Actions
    this.quickActionButtons = page.locator('[data-testid="quick-action"]');
    this.addNurseButton = page.getByRole('button', { name: /add nurse/i });
    this.newPlacementButton = page.getByRole('button', { name: /new placement/i });

    // Navigation
    this.sidebar = page.locator('nav');
    this.header = page.locator('header');
  }

  async goto() {
    await this.page.goto('/');
  }

  async getKpiValue(kpiName) {
    const card = this.page.locator(`text=${kpiName}`).locator('..');
    return card.locator('[data-testid="kpi-value"]').textContent();
  }

  async getChartCount() {
    return this.chartContainer.count();
  }

  async clickQuickAction(actionName) {
    await this.page.getByRole('button', { name: new RegExp(actionName, 'i') }).click();
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
  }
}
