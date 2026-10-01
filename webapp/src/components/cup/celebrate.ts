import { PRODUCT_COLOURS } from './cupParts';

/** How many pearls fall when a card fills. */
const PEARL_COUNT = 28;
const FALL_MS = 900;
const SPREAD_MS = 700;
const STAGGER_MS = 500;

const COLOURS = [
  PRODUCT_COLOURS.pearl,
  PRODUCT_COLOURS.brulee,
  PRODUCT_COLOURS.taro,
  PRODUCT_COLOURS.cream,
];

function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return typeof Element.prototype.animate === 'function';
}

/**
 * Rains pearls down the inside of `card` once, for the moment a loyalty card fills. The card must be
 * positioned and clip its overflow. Resolves when the last pearl lands; null when nothing will move.
 */
export function rainPearls(
  card: HTMLElement,
  random: () => number = Math.random,
): Promise<void> | null {
  if (!motionAllowed()) return null;
  const width = card.clientWidth;
  const height = card.clientHeight;
  const flights: Promise<unknown>[] = [];
  for (let i = 0; i < PEARL_COUNT; i += 1) {
    const pearl = document.createElement('span');
    pearl.setAttribute('aria-hidden', 'true');
    pearl.style.cssText = `position:absolute;top:-20px;left:${random() * width}px;width:12px;height:12px;border-radius:50%;pointer-events:none;background:${COLOURS[i % COLOURS.length]}`;
    card.appendChild(pearl);
    const animation = pearl.animate(
      [
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
        {
          transform: `translateY(${height + 40}px) rotate(${(random() - 0.5) * 300}deg)`,
          opacity: 0.9,
        },
      ],
      {
        duration: FALL_MS + random() * SPREAD_MS,
        delay: random() * STAGGER_MS,
        easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)',
        fill: 'forwards',
      },
    );
    flights.push(
      animation.finished.then(
        () => pearl.remove(),
        () => pearl.remove(),
      ),
    );
  }
  return Promise.all(flights).then(() => undefined);
}
