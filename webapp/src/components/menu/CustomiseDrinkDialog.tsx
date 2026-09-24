import type {
  MenuCustomisations,
  MenuItem,
  MenuItemTag,
  OptionLevel,
  OrderLine,
  Topping,
} from '@bbt/shared';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatPrice } from '../../lib/money';
import { buildCartLine, unitPriceCents } from '../../store/lines';
import { CupIllustration } from './CupIllustration';
import './CustomiseDrinkDialog.css';

type CustomiseDrinkDialogProps = {
  /** The drink being customised, or null when closed. */
  item: MenuItem | null;
  /** Category name shown as the eyebrow above the drink name. */
  categoryName?: string;
  customisations: MenuCustomisations;
  onAdd: (line: OrderLine) => void;
  onClose: () => void;
};

const TAG_LABELS: Record<MenuItemTag, string> = {
  'best-seller': 'Best seller',
  new: 'New',
};

const defaultOf = (levels: OptionLevel[]): OptionLevel =>
  levels.find((level) => level.isDefault) ?? (levels[0] as OptionLevel);

/**
 * Sugar, ice, toppings and quantity for one drink, as a tall bottom sheet.
 * Built on the native dialog element so Escape, the backdrop and focus are the browser's.
 */
export function CustomiseDrinkDialog({
  item,
  categoryName,
  customisations,
  onAdd,
  onClose,
}: CustomiseDrinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sugarId, setSugarId] = useState(defaultOf(customisations.sugarLevels).id);
  const [iceId, setIceId] = useState(defaultOf(customisations.iceLevels).id);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Reset the choices and open or close the dialog whenever the drink changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item) {
      setSugarId(defaultOf(customisations.sugarLevels).id);
      setIceId(defaultOf(customisations.iceLevels).id);
      setToppingIds([]);
      setQuantity(1);
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [item, customisations]);

  if (!item) {
    return <dialog ref={dialogRef} className="customise" onClose={onClose} />;
  }

  const sugar =
    customisations.sugarLevels.find((level) => level.id === sugarId) ??
    defaultOf(customisations.sugarLevels);
  const ice =
    customisations.iceLevels.find((level) => level.id === iceId) ??
    defaultOf(customisations.iceLevels);
  const toppings = customisations.toppings.filter((topping) => toppingIds.includes(topping.id));
  const unit = unitPriceCents(item, toppings);
  const total = unit * quantity;
  const tag = item.tags[0];
  const heroStyle = { '--tea': item.colour } as CSSProperties;

  const toggleTopping = (id: string) =>
    setToppingIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );

  const add = () => {
    onAdd(buildCartLine(item, { sugar, ice, toppings, quantity }));
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="customise"
      aria-labelledby="customise-heading"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="customise__body">
        <button type="button" className="customise__close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <header className="hero" style={heroStyle}>
          <div className="hero__art">
            <CupIllustration colour={item.colour} pearls={item.pearls} size={96} />
          </div>
          <div className="hero__text">
            {tag && <span className="hero__tag">{TAG_LABELS[tag]}</span>}
            {categoryName && <p className="hero__eyebrow">{categoryName}</p>}
            <h2 id="customise-heading" className="hero__name">
              {item.name}
            </h2>
            {item.description && <p className="hero__description">{item.description}</p>}
            <p className="hero__price">{formatPrice(item.priceCents)}</p>
          </div>
        </header>

        <div className="customise__scroll">
          <LevelTrack
            legend="Sugar level"
            name="sugar"
            levels={customisations.sugarLevels}
            selectedId={sugarId}
            onSelect={setSugarId}
          />

          <LevelTrack
            legend="Ice level"
            name="ice"
            levels={customisations.iceLevels}
            selectedId={iceId}
            onSelect={setIceId}
          />

          {customisations.toppings.length > 0 && (
            <fieldset className="group">
              <legend className="group__legend">Add toppings</legend>
              <div className="tiles">
                {customisations.toppings.map((topping) => {
                  const selected = toppingIds.includes(topping.id);
                  return (
                    <label key={topping.id} className="tile">
                      <input
                        type="checkbox"
                        name="toppings"
                        value={topping.id}
                        checked={selected}
                        onChange={() => toggleTopping(topping.id)}
                      />
                      <span className="tile__face">
                        <span className="tile__art">
                          <ToppingIcon topping={topping} />
                        </span>
                        {selected && (
                          <span className="tile__badge" aria-hidden="true">
                            1
                          </span>
                        )}
                        <span className="tile__name">{topping.name}</span>
                        <span className="tile__price">+{formatPrice(topping.priceCents)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <div className="customise__fixed">
          <section className="summary" aria-label="Order summary">
            <div className="summary__row summary__row--head">
              <span className="summary__item">
                {quantity} × {item.name}
              </span>
              <span>{formatPrice(item.priceCents * quantity)}</span>
            </div>
            <p className="summary__choices">
              {sugar.name} sugar · {ice.name}
            </p>
            {toppings.map((topping) => (
              <div key={topping.id} className="summary__row summary__row--topping">
                <span>{topping.name}</span>
                <span>{formatPrice(topping.priceCents * quantity)}</span>
              </div>
            ))}
            <div className="summary__row summary__row--total">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
          </section>

          <div className="customise__foot">
            <div className="qty" role="group" aria-label="Quantity">
              <button
                type="button"
                className="qty__step"
                aria-label="One fewer"
                disabled={quantity <= 1}
                onClick={() => setQuantity((n) => Math.max(1, n - 1))}
              >
                −
              </button>
              <span className="qty__count" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className="qty__step"
                aria-label="One more"
                onClick={() => setQuantity((n) => n + 1)}
              >
                +
              </button>
            </div>
            <button type="button" className="customise__add" onClick={add}>
              Add to order · {formatPrice(total)}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

type LevelTrackProps = {
  legend: string;
  name: string;
  levels: OptionLevel[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/** A stepped track of radio buttons: dots on a line with labels beneath, the chosen one filled. */
function LevelTrack({ legend, name, levels, selectedId, onSelect }: LevelTrackProps) {
  const selectedIndex = Math.max(
    0,
    levels.findIndex((level) => level.id === selectedId),
  );
  const fill = levels.length > 1 ? (selectedIndex / (levels.length - 1)) * 100 : 0;
  const trackStyle = { '--fill': `${fill}%` } as CSSProperties;
  return (
    <fieldset className="group">
      <legend className="group__legend">{legend}</legend>
      <div className="track" style={trackStyle}>
        <span className="track__line" aria-hidden="true" />
        <span className="track__fill" aria-hidden="true" />
        {levels.map((level) => (
          <label key={level.id} className="track__stop">
            <input
              type="radio"
              name={name}
              value={level.id}
              checked={selectedId === level.id}
              onChange={() => onSelect(level.id)}
            />
            <span className="track__dot" aria-hidden="true" />
            <span className="track__label">{level.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Small drawn icon per topping. Decorative; the tile name carries the meaning. */
function ToppingIcon({ topping }: { topping: Topping }) {
  const common = { fill: 'currentColor', 'aria-hidden': true as const };
  switch (topping.id) {
    case 'pearls':
      return (
        <svg viewBox="0 0 48 48" {...common}>
          <circle cx="14" cy="30" r="7" />
          <circle cx="30" cy="32" r="7" />
          <circle cx="22" cy="18" r="7" />
          <circle cx="36" cy="18" r="6" />
        </svg>
      );
    case 'pudding':
      return (
        <svg viewBox="0 0 48 48" {...common}>
          <path d="M10 34c0-10 5-20 14-20s14 10 14 20a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" />
          <rect x="16" y="12" width="16" height="6" rx="3" opacity="0.6" />
        </svg>
      );
    case 'cheese-foam':
      return (
        <svg viewBox="0 0 48 48" {...common}>
          <path d="M12 34a8 8 0 0 1 2-15.7A10 10 0 0 1 33 16a8 8 0 0 1 3 18z" />
        </svg>
      );
    case 'red-bean':
      return (
        <svg viewBox="0 0 48 48" {...common}>
          <ellipse cx="16" cy="22" rx="7" ry="5" transform="rotate(-25 16 22)" />
          <ellipse cx="30" cy="20" rx="7" ry="5" transform="rotate(20 30 20)" />
          <ellipse cx="24" cy="32" rx="7" ry="5" transform="rotate(-5 24 32)" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" {...common}>
          <rect x="10" y="12" width="12" height="12" rx="3" />
          <rect x="26" y="18" width="12" height="12" rx="3" />
          <rect x="14" y="28" width="12" height="12" rx="3" opacity="0.7" />
        </svg>
      );
  }
}
