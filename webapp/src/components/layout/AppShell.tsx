import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { useStoreInfo } from '../../api/useStoreInfo';
import { openingStatus } from '../../lib/openingHours';
import { shellOrderMessage } from '../../lib/shellOrder';
import { cue, setSoundsEnabled } from '../../lib/sounds';
import { postToShell } from '../../platform';
import { KITCHEN_SCHEDULE } from '../../config';
import { tap } from '../cup/fly';
import { activeOrder } from '../../store/orders';
import { useOrders, usePreferences } from '../../store/hooks';
import { applyTheme } from '../../theme/theme';
import { isInIosShell } from '../../platform';
import { CupSprite } from '../cup/CupSprite';
import { FLY_TARGET_ATTRIBUTE } from '../cup/fly';
import { OrderPanel } from '../order/OrderPanel';
import { TabBar } from './TabBar';
import './AppShell.css';

/** How often evening mode checks the clock against the shop's hours. */
const EVENING_CHECK_MS = 60_000;

/**
 * Page frame: hidden document heading, the routed page inside the app gutters, the tab bar,
 * and on desktop a persistent order panel on the right. Also keeps the document's theme and
 * the sounds switch in step with the device preferences and the shop's hours.
 */
export function AppShell() {
  const store = useStoreInfo();
  const preferences = usePreferences();
  const evening = useEvening(preferences.eveningMode, store);

  useLayoutEffect(() => {
    applyTheme(preferences.theme, document.documentElement, { evening });
  }, [preferences.theme, evening]);

  useEffect(() => {
    setSoundsEnabled(preferences.sounds);
  }, [preferences.sounds]);

  // The kitchen's moments happen once, here, whichever panels are mounted: a pour as making
  // starts, a click and a haptic as the drink is ready, and the iOS shell's Live Activity follows
  // the active order (ADR 0021). A browser ignores the posts.
  const orders = useOrders();
  const active = activeOrder(orders);
  const status = active?.status ?? null;
  const activeKey = active ? `${active.id}:${status}` : null;
  const previousStatus = useRef(status);
  const hadActive = useRef(false);
  useEffect(() => {
    if (previousStatus.current !== status) {
      if (status === 'making') cue('pour');
      if (status === 'ready') {
        cue('lid');
        tap('success');
      }
    }
    previousStatus.current = status;
    if (active) {
      postToShell(shellOrderMessage(active, store, KITCHEN_SCHEDULE));
      hadActive.current = true;
    } else if (hadActive.current) {
      postToShell({ type: 'orderEnded' });
      hadActive.current = false;
    }
    // activeKey captures the id and status; active itself changes identity on every store write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, store]);

  return (
    <>
      <CupSprite />
      <h1 className="visually-hidden">Kang Tea</h1>
      <main className="app">
        <Outlet />
        {isInIosShell() && <p className="shell-note">Running inside the Kang Tea iOS app.</p>}
      </main>
      <aside className="orderpanel" aria-label="Your order" {...{ [FLY_TARGET_ATTRIBUTE]: '' }}>
        <OrderPanel compact />
      </aside>
      <TabBar store={store} />
    </>
  );
}

/** True while evening mode is on and the shop is closed, checked once a minute. */
function useEvening(enabled: boolean, store: ReturnType<typeof useStoreInfo>): boolean {
  const closed = () => (store ? openingStatus(store).kind !== 'open' : false);
  const [isClosed, setIsClosed] = useState(closed);
  useEffect(() => {
    setIsClosed(closed());
    if (!enabled || !store) return;
    const timer = setInterval(() => setIsClosed(closed()), EVENING_CHECK_MS);
    return () => clearInterval(timer);
    // closed reads store, which is in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, store]);
  return enabled && isClosed;
}
