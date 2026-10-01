import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { PRODUCT_COLOURS } from '../components/cup/cupParts';
import { StaticCup } from '../components/cup/StaticCup';
import './NotFoundPage.css';

/** A tipped over cup for an address that is not on the menu, and a way back. */
export function NotFoundPage() {
  return (
    <section className="notfound" aria-labelledby="notfound-heading">
      <div
        className="notfound__spill"
        aria-hidden="true"
        style={{ '--tea': PRODUCT_COLOURS.tea } as CSSProperties}
      >
        <div className="notfound__cup">
          <StaticCup
            colour={PRODUCT_COLOURS.tea}
            lid={false}
            level={0.35}
            customisations={[{ name: 'Topping', value: 'Boba' }]}
          />
        </div>
        <span className="notfound__puddle" />
      </div>
      <h2 id="notfound-heading" className="notfound__heading">
        That page is not on the menu
      </h2>
      <p className="notfound__copy">
        <Link to="/" className="notfound__link">
          Back to the drinks
        </Link>
      </p>
    </section>
  );
}
