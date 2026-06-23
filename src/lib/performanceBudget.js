/**
 * Performance budget configuration.
 * Defines thresholds for Core Web Vitals and bundle size limits.
 */
export const PERFORMANCE_BUDGET = {
  // Core Web Vitals thresholds (in milliseconds unless noted)
  metrics: {
    LCP: 2500, // Largest Contentful Paint < 2.5s
    FID: 100, // First Input Delay < 100ms
    CLS: 0.1, // Cumulative Layout Shift < 0.1 (unitless)
    TTFB: 800, // Time to First Byte < 800ms
    INP: 200, // Interaction to Next Paint < 200ms
  },

  // Bundle size limits (in bytes)
  bundleSize: {
    totalMaxBytes: 500_000, // 500KB total JS budget
    chunkMaxBytes: 200_000, // 200KB per chunk max
    initialLoadMaxBytes: 150_000, // 150KB initial load budget
    vendorReactMaxBytes: 150_000, // 150KB for React vendor chunk
    vendorRechartsMaxBytes: 200_000, // 200KB for Recharts vendor chunk
    vendorLucideMaxBytes: 100_000, // 100KB for Lucide icons chunk
    vendorDndMaxBytes: 50_000, // 50KB for DnD Kit chunk
    vendorRouterMaxBytes: 30_000, // 30KB for Router chunk
  },

  // Resource timing budgets
  resourceTiming: {
    maxDNSLookupMs: 50,
    maxTCPConnectionMs: 100,
    maxTLSNegotiationMs: 100,
    maxResourceDownloadMs: 500,
  },
}

/**
 * Check if a metric value is within budget.
 *
 * @param {string} metricName - Name of the metric (LCP, FID, CLS, TTFB, INP)
 * @param {number} value - The measured value
 * @returns {{ withinBudget: boolean, threshold: number, value: number }}
 */
export function checkMetricBudget(metricName, value) {
  const threshold = PERFORMANCE_BUDGET.metrics[metricName]
  if (threshold === undefined) {
    return { withinBudget: true, threshold: null, value }
  }
  return {
    withinBudget: value <= threshold,
    threshold,
    value,
  }
}

export default PERFORMANCE_BUDGET
