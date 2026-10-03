import { useEffect, useRef } from 'react';

/** Total acceleration, in m/s², above which a movement counts as a shake. Gravity alone is about 9.8. */
const SHAKE_THRESHOLD = 28;
/** Minimum gap between two shakes, so one vigorous shake fires once and settling the phone does not fire again. */
const SHAKE_GAP_MS = 2500;

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Calls `onShake` when the device is shaken. Listens only where the browser reports motion; on
 * iOS that needs `requestMotionAccess()` from a tap first. Everywhere else this is silent.
 */
export function useShake(onShake: () => void, enabled = true): void {
  // The last shake lives in a ref so re-subscribing (a new onShake identity) cannot reset the gap
  // and let the phone, still moving from the first shake, fire again and again.
  const last = useRef(0);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    const handle = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (force > SHAKE_THRESHOLD && Date.now() - last.current > SHAKE_GAP_MS) {
        last.current = Date.now();
        onShake();
      }
    };
    window.addEventListener('devicemotion', handle);
    return () => window.removeEventListener('devicemotion', handle);
  }, [onShake, enabled]);
}

/** Asks iOS for motion events. Must run inside a tap. A no-op where no permission is needed. */
export async function requestMotionAccess(): Promise<void> {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
  const motion = window.DeviceMotionEvent as unknown as MotionPermission;
  if (typeof motion.requestPermission !== 'function') return;
  try {
    await motion.requestPermission();
  } catch {
    // Declined or unavailable: the button still works.
  }
}
