import type { Store } from '@bbt/shared';
import type { ReactNode } from 'react';
import { describeOpeningStatus, openingStatus } from '../../lib/openingHours';
import { KangTeaMark } from '../brand/KangTeaMark';
import './AppHeader.css';

type AppHeaderProps = {
  /** `null` while the store is still loading. */
  store: Store | null;
  /** Injectable clock for tests. */
  now?: Date;
  /** Sits beside the greeting on desktop and below it on phones, for example the search bar. */
  actions?: ReactNode;
};

/** Time of day greeting from the visitor's own clock. */
export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Brand row (phones only; the desktop sidebar carries the logo), the greeting,
 * where and when you can pick up, and an optional actions slot.
 */
export function AppHeader({ store, now = new Date(), actions }: AppHeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <KangTeaMark size={30} />
        <span className="header__wordmark" aria-hidden="true">
          KANGTEA
        </span>
      </div>
      <div className="header__row">
        <div className="header__text">
          <p className="header__greeting">
            {greetingFor(now.getHours()).split(' ')[0]}{' '}
            <i>{greetingFor(now.getHours()).split(' ').slice(1).join(' ')}</i>
          </p>
          {store ? (
            <p className="header__store">
              Pick up at <strong>{store.shortName}</strong>
              <span className="header__dot" aria-hidden="true">
                ·
              </span>
              {describeOpeningStatus(openingStatus(store, now))}
            </p>
          ) : (
            <p className="header__store header__store--loading">Finding your store</p>
          )}
        </div>
        {actions && <div className="header__actions">{actions}</div>}
      </div>
    </header>
  );
}
