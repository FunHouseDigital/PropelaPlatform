import { useMemo, useState } from 'react';

function shallowEqual(prev, next) {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return false;
  }
  return true;
}

export function useMemoizedComputation(computeFn, deps) {
  // Use a counter as a stable signal for useMemo. Increment only when deps change.
  // We track previous deps via a state updater that compares shallowly.
  const [revision, setRevision] = useState(0);
  const [prevDeps, setPrevDeps] = useState(deps);

  if (!shallowEqual(prevDeps, deps)) {
    setPrevDeps(deps);
    setRevision((r) => r + 1);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeFn(), [revision]);
}
