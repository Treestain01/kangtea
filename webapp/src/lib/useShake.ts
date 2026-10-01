import { useEffect } from 'react';

/** Total acceleration, in m/s², above which a movement counts as a shake. Gravity alone is about 9.8. */
const SHAKE_THRESHOLD = 24;
/** Minimum gap between two shakes, so one vigorous shake fires once. */
const SHAKE_GAP_MS = 1500;

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Calls `onShake` when the device is shaken. Listens only where the browser reports motion; on
 * iOS that needs `requestMotionAccess()` from a tap first. Everywhere else this is silent.
 */
export function useShake(onShake: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    let last = 0;
    const handle = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (force > SHAKE_THRESHOLD && Date.now() - last > SHAKE_GAP_MS) {
        last = Date.now();
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
