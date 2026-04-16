import { useEffect, useState } from "react";

/**
 * Animates a number from 0 to the target value over the given duration.
 * Returns the current animated value as a number.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const start = performance.now();

    function tick() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target, durationMs]);

  return current;
}
