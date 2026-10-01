import type { MenuCustomisations, MenuItem, OptionLevel } from '@bbt/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestMotionAccess, useShake } from '../../lib/useShake';
import './menu.css';

/** How many cards light up before the pick lands, and how the pause between them grows. */
const SPIN_STEPS = 12;
const SPIN_START_MS = 60;
const SPIN_SLOWDOWN_MS = 22;

export type SurprisePick = {
  item: MenuItem;
  sugar: OptionLevel;
  ice: OptionLevel;
};

type SurpriseCardProps = {
  /** The drinks on screen, in grid order. The spin runs over these. */
  items: MenuItem[];
  customisations: MenuCustomisations;
  /** The card lit up mid spin, for the grid to highlight. */
  onHighlight: (itemId: string | null) => void;
  /** The drink and levels to open the customise sheet with. */
  onPick: (pick: SurprisePick) => void;
  /** Injectable randomness, for tests. Returns a number in [0, 1). */
  random?: () => number;
};

/** Motion is off when the person asked for it, and in environments without matchMedia (tests). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * "Can't decide?" Tap, or shake a phone, and the cards light up one after another until one is
 * picked with a random sugar and ice; the customise sheet then opens on it to confirm.
 */
export function SurpriseCard({
  items,
  customisations,
  onHighlight,
  onPick,
  random = Math.random,
}: SurpriseCardProps) {
  const [spinning, setSpinning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const choose = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;

  const spin = useCallback(() => {
    if (spinning || items.length === 0) return;
    const land = () => {
      const item = choose(items);
      onHighlight(item.id);
      onPick({
        item,
        sugar: choose(customisations.sugarLevels),
        ice: choose(customisations.iceLevels),
      });
      timers.current.push(
        setTimeout(() => {
          onHighlight(null);
          setSpinning(false);
        }, 800),
      );
    };
    setSpinning(true);
    if (prefersReducedMotion() || items.length === 1) {
      land();
      return;
    }
    let delay = 0;
    for (let step = 0; step < SPIN_STEPS; step += 1) {
      delay += SPIN_START_MS + step * SPIN_SLOWDOWN_MS;
      const index = step % items.length;
      timers.current.push(setTimeout(() => onHighlight(items[index]?.id ?? null), delay));
    }
    timers.current.push(setTimeout(land, delay + SPIN_START_MS));
    // choose reads the latest props through closure; the deps below are what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, items, customisations, onHighlight, onPick, random]);

  useShake(spin, !spinning);

  return (
    <section className="surprise" aria-labelledby="surprise-heading">
      <div className="surprise__text">
        <h3 id="surprise-heading" className="surprise__heading">
          Can't decide?
        </h3>
        <p className="surprise__note">Tap, or shake your phone, and we pick a drink for you.</p>
      </div>
      <button
        type="button"
        className="surprise__btn"
        disabled={spinning || items.length === 0}
        onClick={() => {
          void requestMotionAccess();
          spin();
        }}
      >
        Surprise me
      </button>
    </section>
  );
}
