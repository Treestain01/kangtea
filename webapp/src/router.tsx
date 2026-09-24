import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { AccountPage } from './pages/AccountPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderPage } from './pages/OrderPage';

/** Exported so tests can build a MemoryRouter over the same tree. */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'order', element: <OrderPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
