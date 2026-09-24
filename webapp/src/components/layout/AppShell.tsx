import { Outlet } from 'react-router';
import { isInIosShell } from '../../platform';
import { TabBar } from './TabBar';

/** Page frame: hidden document heading, the routed page inside the app gutters, and the tab bar. */
export function AppShell() {
  return (
    <>
      <h1 className="visually-hidden">Kang Tea</h1>
      <main className="app">
        <Outlet />
        {isInIosShell() && <p className="shell-note">Running inside the Kang Tea iOS app.</p>}
      </main>
      <TabBar />
    </>
  );
}
