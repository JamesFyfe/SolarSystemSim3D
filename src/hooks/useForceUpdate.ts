import { useCallback, useState } from 'react';

/** Returns a stable function that forces the calling component to re-render. */
export default function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((tick) => tick + 1), []);
}
