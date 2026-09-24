import type { Store } from '@bbt/shared';
import { describeOpeningStatus, openingStatus } from '../../lib/openingHours';
import { KangTeaLogo } from '../brand/KangTeaLogo';
import './AppHeader.css';

type AppHeaderProps = {
  /** `null` while the store is still loading. */
  store: Store | null;
  /** Injectable clock for tests. */
  now?: Date;
};

/** Time of day greeting from the visitor's own clock. */
export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Logo, greeting, and where and when you can pick up. */
export function AppHeader({ store, now = new Date() }: AppHeaderProps) {
  return (
    <header className="header">
      <KangTeaLogo size={56} className="header__logo" />
      <div className="header__text">
        <p className="header__greeting">{greetingFor(now.getHours())}</p>
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
    </header>
  );
}
