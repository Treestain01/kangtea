import { Outlet } from 'react-router';
import { isInIosShell } from '../../platform';
import { OrderPanel } from '../order/OrderPanel';
import { TabBar } from './TabBar';
import './AppShell.css';

/**
 * Page frame: hidden document heading, the routed page inside the app gutters, the tab bar,
 * and on desktop a persistent order panel on the right.
 */
export function AppShell() {
  return (
    <>
      <h1 className="visually-hidden">Kang Tea</h1>
      <main className="app">
        <Outlet />
        {isInIosShell() && <p className="shell-note">Running inside the Kang Tea iOS app.</p>}
      </main>
      <aside className="orderpanel" aria-label="Your order">
        <OrderPanel compact />
      </aside>
      <TabBar />
    </>
  );
}
