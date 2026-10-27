import { useEffect, useState } from 'react';

/** Seconds remaining until `target` (Date or ISO string); null if no target. */
export function useCountdown(target) {
  const compute = () => (target ? Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)) : null);
  const [remaining, setRemaining] = useState(compute);
  useEffect(() => {
    setRemaining(compute());
    if (!target) return undefined;
    const t = setInterval(() => setRemaining(compute()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return remaining;
}
