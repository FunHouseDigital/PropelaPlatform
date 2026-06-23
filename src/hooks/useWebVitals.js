import { useEffect, useRef } from 'react'
import { onLCP, onCLS, onTTFB, onINP } from 'web-vitals'

/**
 * Custom hook that tracks Core Web Vitals metrics using the web-vitals library.
 * Registers callbacks for LCP, CLS, TTFB, and INP metrics and optionally
 * logs them in development mode and creates Performance API marks/measures.
 *
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onReport] - Optional callback invoked with each metric report.
 *   Receives a web-vitals Metric object with properties: name, value, rating, id, delta, entries.
 * @returns {void} This hook does not return a value; it registers side effects only.
 */
export function useWebVitals(options = {}) {
  const { onReport } = options
  const onReportRef = useRef(onReport)

  useEffect(() => {
    onReportRef.current = onReport
  }, [onReport])

  useEffect(() => {
    const isDev = import.meta.env.DEV

    function handleMetric(metric) {
      if (isDev) {
        console.log(
          `[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`
        )
      }

      // Add performance marks for each metric
      try {
        performance.mark(`web-vitals-${metric.name}-${metric.id}`)
        performance.measure(
          `web-vitals-${metric.name}`,
          {
            start: performance.timeOrigin,
            duration: metric.value,
          }
        )
      } catch {
        // Silently ignore if Performance API is not fully supported
      }

      if (onReportRef.current) {
        onReportRef.current(metric)
      }
    }

    onLCP(handleMetric)
    onCLS(handleMetric)
    onTTFB(handleMetric)
    onINP(handleMetric)
  }, [])
}

/**
 * Utility to create performance marks and measures for critical operations.
 * Returns an object with start() and end() methods to bracket the operation.
 * In development mode, logs the measured duration to the console.
 *
 * @param {string} operationName - Name of the operation to measure
 * @returns {{ start: () => void, end: () => void }} Object with start/end functions
 *   to bracket the measured operation
 */
export function createPerformanceMark(operationName) {
  const markStart = `${operationName}-start`
  const markEnd = `${operationName}-end`

  return {
    start() {
      performance.mark(markStart)
    },
    end() {
      performance.mark(markEnd)
      performance.measure(operationName, markStart, markEnd)

      if (import.meta.env.DEV) {
        const entries = performance.getEntriesByName(operationName)
        const latest = entries[entries.length - 1]
        if (latest) {
          console.log(
            `[Performance] ${operationName}: ${latest.duration.toFixed(2)}ms`
          )
        }
      }
    },
  }
}

export default useWebVitals
