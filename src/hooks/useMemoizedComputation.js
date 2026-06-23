import { useMemo } from 'react';

export function useMemoizedComputation(computeFn, deps) {
  const serializedDeps = JSON.stringify(deps);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeFn(), [serializedDeps]);
}
