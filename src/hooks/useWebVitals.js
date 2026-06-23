import { useEffect, useRef } from 'react'
import { onLCP, onFID, onCLS, onTTFB, onINP } from 'web-vitals'

/**
 * Custom hook that tracks Core Web Vitals metrics using the web-vitals library.
 *
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onReport] - Optional callback invoked with each metric report
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
    onFID(handleMetric)
    onCLS(handleMetric)
    onTTFB(handleMetric)
    onINP(handleMetric)
  }, [])
}

/**
 * Utility to create performance marks and measures for critical operations.
 *
 * @param {string} operationName - Name of the operation to measure
 * @returns {{ start: Function, end: Function }} Object with start/end functions
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
