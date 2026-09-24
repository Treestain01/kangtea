import { NavLink } from 'react-router';
import { useCart, useOrders } from '../../store/hooks';
import { activeOrder } from '../../store/orders';
import { KangTeaLogo } from '../brand/KangTeaLogo';
import './TabBar.css';

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  order: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 4h10l-1 16H8zM9 8h6" />
      <path d="M13 2v3" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
};

/**
 * Primary navigation. A fixed bottom bar on phones, a left sidebar from 1024px.
 * The Order tab carries the cart count, or a dot while an order is in progress.
 */
export function TabBar() {
  const cart = useCart();
  const orders = useOrders();
  const inProgress = activeOrder(orders) !== null;
  const cartCount = cart.length;

  const tabClass = ({ isActive }: { isActive: boolean }) => `tab${isActive ? ' tab--active' : ''}`;

  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar__brand" aria-hidden="true">
        <KangTeaLogo size={64} />
      </div>
      <NavLink to="/" end className={tabClass}>
        {icons.home}
        <span className="tab__label">Home</span>
      </NavLink>
      <NavLink to="/menu" className={tabClass}>
        {icons.menu}
        <span className="tab__label">Menu</span>
      </NavLink>
      <NavLink to="/order" className={(state) => `${tabClass(state)} tab--order`}>
        <span className="tab__icon">
          {icons.order}
          {inProgress && <span className="tab__dot" data-testid="order-dot" />}
          {!inProgress && cartCount > 0 && (
            <span className="tab__badge" aria-hidden="true">
              {cartCount}
            </span>
          )}
        </span>
        <span className="tab__label">Order</span>
        {cartCount > 0 && !inProgress && (
          <span className="visually-hidden">, {cartCount} in your cart</span>
        )}
        {inProgress && <span className="visually-hidden">, order in progress</span>}
      </NavLink>
      <NavLink to="/history" className={tabClass}>
        {icons.history}
        <span className="tab__label">History</span>
      </NavLink>
      <NavLink to="/account" className={tabClass}>
        {icons.account}
        <span className="tab__label">Account</span>
      </NavLink>
    </nav>
  );
}
