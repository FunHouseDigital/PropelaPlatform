import { Profiler } from 'react'

/**
 * DevProfiler - A React Profiler wrapper that only activates in development mode.
 * Logs render timing information for wrapped components.
 *
 * @param {Object} props
 * @param {string} props.id - Identifier for the profiled component
 * @param {React.ReactNode} props.children - Child components to profile
 * @param {Function} [props.onRenderCallback] - Optional custom callback for render data
 */
export function DevProfiler({ id, children, onRenderCallback }) {
  // In production, render children directly without profiling overhead
  if (!import.meta.env.DEV) {
    return children
  }

  function handleRender(
    profilerId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) {
    console.log(
      `[Profiler] ${profilerId} (${phase}): ${actualDuration.toFixed(2)}ms actual, ${baseDuration.toFixed(2)}ms base`
    )

    if (onRenderCallback) {
      onRenderCallback({
        id: profilerId,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      })
    }
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  )
}

export default DevProfiler
