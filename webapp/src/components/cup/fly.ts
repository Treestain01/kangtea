/**
 * Small flights between parts of the page: a cup arcing from the sheet into the Order tab, a pearl
 * dropping from the kitchen cup onto the loyalty card. Each clones or draws a node, animates it with
 * the Web Animations API in a fixed layer over the page, and removes it when it lands.
 *
 * Every flight resolves immediately when the person prefers reduced motion, when the browser has
 * no animations, or when no target is on screen, so callers never wait on decoration.
 */

import { postToShell } from '../../platform';

export const FLY_TARGET_ATTRIBUTE = 'data-fly-target';

const FLIGHT_MS = 650;
const PEARL_MS = 600;

function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return typeof Element.prototype.animate === 'function';
}

function isOnScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** The visible element marked as where things fly to: the Order tab on phones, the panel on desktop. */
export function findFlyTarget(root: ParentNode = document): Element | null {
  const candidates = Array.from(root.querySelectorAll(`[${FLY_TARGET_ATTRIBUTE}]`));
  return candidates.find(isOnScreen) ?? null;
}

type Point = { x: number; y: number };

function centre(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function layer(): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  element.style.position = 'fixed';
  element.style.left = '0';
  element.style.top = '0';
  element.style.zIndex = '1000';
  element.style.pointerEvents = 'none';
  document.body.appendChild(element);
  return element;
}

function arc(
  element: HTMLElement,
  from: Point,
  to: Point,
  options: { duration: number; startScale: number; endScale: number; lift: number },
): Promise<void> {
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - options.lift };
  const at = (point: Point, scale: number) =>
    `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) scale(${scale})`;
  const animation = element.animate(
    [
      { transform: at(from, options.startScale), opacity: 1 },
      { transform: at(mid, (options.startScale + options.endScale) / 2), opacity: 1, offset: 0.5 },
      { transform: at(to, options.endScale), opacity: 0.3 },
    ],
    { duration: options.duration, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
  );
  return animation.finished.then(
    () => element.remove(),
    () => element.remove(),
  );
}

/**
 * Clones the cup drawn in `source` (the element or the first svg inside it) and flies it into the
 * fly target. Resolves when it lands; null when nothing will move, so callers can stay synchronous.
 */
export function flyCup(source: Element, width = 56): Promise<void> | null {
  const svg = source instanceof SVGSVGElement ? source : source.querySelector('svg');
  const target = findFlyTarget();
  if (!svg || !target || !motionAllowed()) return null;
  const wrapper = layer();
  wrapper.style.width = `${width}px`;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('role');
  clone.style.width = '100%';
  clone.style.height = 'auto';
  wrapper.appendChild(clone);
  return arc(wrapper, centre(svg.getBoundingClientRect()), centre(target.getBoundingClientRect()), {
    duration: FLIGHT_MS,
    startScale: 1,
    endScale: 0.2,
    lift: 90,
  });
}

/** Drops a pearl from `source` onto `target`. Resolves when it lands; null when nothing will move. */
export function flyPearl(source: Element, target: Element, colour: string): Promise<void> | null {
  if (!motionAllowed()) return null;
  const pearl = layer();
  pearl.style.width = '16px';
  pearl.style.height = '16px';
  pearl.style.borderRadius = '50%';
  pearl.style.background = colour;
  const from = source.getBoundingClientRect();
  return arc(
    pearl,
    { x: from.left + from.width / 2, y: from.top + from.height * 0.75 },
    centre(target.getBoundingClientRect()),
    { duration: PEARL_MS, startScale: 1, endScale: 1, lift: 60 },
  );
}

/** A short haptic tap where the platform offers one: the iOS shell's bridge, or the Vibration API. */
export function tap(style: 'light' | 'medium' | 'success' = 'medium'): void {
  if (postToShell({ type: 'haptic', style })) return;
  try {
    navigator.vibrate?.(style === 'light' ? 10 : 20);
  } catch {
    // No haptics here.
  }
}
