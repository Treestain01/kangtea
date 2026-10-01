import { useCallback, useEffect, useRef, useState } from 'react';

export type PourPhase = 'rest' | 'empty' | 'filling' | 'done';

/** The pour's beats in milliseconds: empty the cup, fill it and drop the pieces, lid on, then hand over. */
export const POUR = { start: 50, lid: 750, after: 400 } as const;

function motionAllowed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Runs a cup through a pour: empty, filling, lidded, then calls `then`. Drive a `StaticCup` from the
 * phase: `level` 0 while empty, `lid` off until done, `drop` while pouring. Where nothing can animate
 * `then` runs at once, so a reorder is never slower than a tap.
 */
export function usePour(): {
  phase: PourPhase;
  pouring: boolean;
  pour: (then: () => void | Promise<void>) => void;
} {
  const [phase, setPhase] = useState<PourPhase>('rest');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pour = useCallback(
    (then: () => void | Promise<void>) => {
      if (phase !== 'rest') return;
      if (!motionAllowed()) {
        // Synchronous when it can be, so a reorder in a test or under reduced motion is immediate.
        const result = then();
        if (result) void result;
        return;
      }
      const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
      setPhase('empty');
      later(POUR.start, () => setPhase('filling'));
      later(POUR.start + POUR.lid, () => setPhase('done'));
      later(POUR.start + POUR.lid + POUR.after, () => {
        void Promise.resolve(then()).then(() => setPhase('rest'));
      });
    },
    [phase],
  );

  return { phase, pouring: phase !== 'rest', pour };
}

/** StaticCup props for a pour phase. */
export function cupPropsFor(phase: PourPhase): { level: number; lid: boolean; drop: boolean } {
  return {
    level: phase === 'empty' ? 0 : 1,
    lid: phase === 'rest' || phase === 'done',
    drop: phase !== 'rest',
  };
}
