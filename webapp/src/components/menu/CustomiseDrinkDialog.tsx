import type { MenuCustomisations, MenuItem, OptionLevel, OrderLine } from '@bbt/shared';
import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../lib/money';
import { buildCartLine, unitPriceCents } from '../../store/lines';
import { CupIllustration } from './CupIllustration';
import './CustomiseDrinkDialog.css';

type CustomiseDrinkDialogProps = {
  /** The drink being customised, or null when closed. */
  item: MenuItem | null;
  customisations: MenuCustomisations;
  onAdd: (line: OrderLine) => void;
  onClose: () => void;
};

const defaultOf = (levels: OptionLevel[]): OptionLevel =>
  levels.find((level) => level.isDefault) ?? (levels[0] as OptionLevel);

/**
 * Sugar, ice, toppings and quantity for one drink.
 * A bottom sheet on phones, a centred modal from 768px, on the native dialog element.
 */
export function CustomiseDrinkDialog({
  item,
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
  const total = unitPriceCents(item, toppings) * quantity;

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
        <header className="customise__head">
          <CupIllustration colour={item.colour} pearls={item.pearls} size={64} />
          <div>
            <h2 id="customise-heading" className="customise__name">
              {item.name}
            </h2>
            <p className="customise__base">{formatPrice(item.priceCents)}</p>
          </div>
          <button type="button" className="customise__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <fieldset className="options">
          <legend className="options__legend">Sugar</legend>
          <div className="options__row">
            {customisations.sugarLevels.map((level) => (
              <label key={level.id} className="option">
                <input
                  type="radio"
                  name="sugar"
                  value={level.id}
                  checked={sugarId === level.id}
                  onChange={() => setSugarId(level.id)}
                />
                <span className="option__chip">{level.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="options">
          <legend className="options__legend">Ice</legend>
          <div className="options__row">
            {customisations.iceLevels.map((level) => (
              <label key={level.id} className="option">
                <input
                  type="radio"
                  name="ice"
                  value={level.id}
                  checked={iceId === level.id}
                  onChange={() => setIceId(level.id)}
                />
                <span className="option__chip">{level.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {customisations.toppings.length > 0 && (
          <fieldset className="options">
            <legend className="options__legend">Toppings</legend>
            <div className="options__list">
              {customisations.toppings.map((topping) => (
                <label key={topping.id} className="option option--wide">
                  <input
                    type="checkbox"
                    name="toppings"
                    value={topping.id}
                    checked={toppingIds.includes(topping.id)}
                    onChange={() => toggleTopping(topping.id)}
                  />
                  <span className="option__chip">
                    <span>{topping.name}</span>
                    <span className="option__price">+{formatPrice(topping.priceCents)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

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
    </dialog>
  );
}
