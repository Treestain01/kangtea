import { Navigate, useLocation } from 'react-router';
import { OrderPanel } from '../components/order/OrderPanel';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery';

/**
 * Current Order. On phones this is a page. On desktop the same panel is always on the right,
 * so the route sends you back to the menu, carrying any navigation state (the pay page's notice)
 * along so the side panel still shows it.
 */
export function OrderPage() {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const location = useLocation();
  if (desktop) {
    return <Navigate to="/" replace state={location.state} />;
  }
  return <OrderPanel />;
}
