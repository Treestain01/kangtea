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
import {
  buildCartLine,
  MAX_TOPPING_QUANTITY,
  unitPriceCents,
  type ToppingChoice,
} from '../../store/lines';
import { LiveCup } from '../cup/LiveCup';
import { flyCup } from '../cup/fly';
import { ToppingArt } from '../cup/ToppingArt';
import './CustomiseDrinkDialog.css';

type CustomiseDrinkDialogProps = {
  /** The drink being customised, or null when closed. */
  item: MenuItem | null;
  /** Category name shown beside the drink name. */
  categoryName?: string;
  customisations: MenuCustomisations;
  onAdd: (line: OrderLine) => void;
  onClose: () => void;
};

const TAG_LABELS: Record<MenuItemTag, string> = {
  'best-seller': 'Best seller',
  recommended: 'Recommended',
  new: 'New',
};

const defaultOf = (levels: OptionLevel[]): OptionLevel =>
  levels.find((level) => level.isDefault) ?? (levels[0] as OptionLevel);

/** Topping id to how many lots of it. Absent means none. */
type ToppingCounts = Record<string, number>;

/**
 * Sugar, ice, toppings and quantity for one drink, as a tall bottom sheet built around the live cup.
 * The cup fills the middle of the sheet with a sugar dial on its left and an ice dial on its right;
 * toppings sit in a swipeable tray beneath it and drop in when tapped.
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
  const stageCupRef = useRef<HTMLDivElement>(null);
  const [sugarId, setSugarId] = useState(defaultOf(customisations.sugarLevels).id);
  const [iceId, setIceId] = useState(defaultOf(customisations.iceLevels).id);
  const [toppingCounts, setToppingCounts] = useState<ToppingCounts>({});
  const [quantity, setQuantity] = useState(1);

  // Reset the choices and open or close the dialog whenever the drink changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item) {
      setSugarId(defaultOf(customisations.sugarLevels).id);
      setIceId(defaultOf(customisations.iceLevels).id);
      setToppingCounts({});
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
  // Menu order, so the readout and the line list toppings the way the menu does.
  const toppings: ToppingChoice[] = customisations.toppings
    .filter((topping) => (toppingCounts[topping.id] ?? 0) > 0)
    .map((topping) => ({ topping, quantity: toppingCounts[topping.id] ?? 0 }));
  const unit = unitPriceCents(item, toppings);
  const total = unit * quantity;
  const tag = item.tags[0];
  const meta = [item.description, categoryName].filter(Boolean).join(' · ');
  const stageStyle = { '--tea': item.colour } as CSSProperties;
  const choices = [
    `${sugar.name} sugar`,
    ice.name,
    ...toppings.map(
      (choice) => `${choice.topping.name}${choice.quantity > 1 ? ` ×${choice.quantity}` : ''}`,
    ),
  ].join(' · ');

  const changeTopping = (id: string, delta: number) =>
    setToppingCounts((current) => {
      const next = Math.min(MAX_TOPPING_QUANTITY, Math.max(0, (current[id] ?? 0) + delta));
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });

  const add = () => {
    // The built cup arcs into the Order tab while the sheet closes. Decorative; never awaited.
    if (stageCupRef.current) void flyCup(stageCupRef.current);
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
        <header className="head">
          <div className="head__text">
            <h2 id="customise-heading" className="head__name">
              {item.name}
            </h2>
            {(meta || tag) && (
              <p className="head__meta">
                {tag && <span className="head__tag">{TAG_LABELS[tag]}</span>}
                {meta}
              </p>
            )}
          </div>
          <p className="head__price">{formatPrice(item.priceCents)}</p>
          <button type="button" className="customise__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="builder">
          <div className="stage" style={stageStyle}>
            <LevelDial
              legend="Sugar"
              name="sugar"
              side="left"
              levels={customisations.sugarLevels}
              selectedId={sugarId}
              onSelect={setSugarId}
            />
            <div className="stage__cup" ref={stageCupRef}>
              <LiveCup
                colour={item.colour}
                sugar={sugar}
                ice={ice}
                toppings={toppings}
                label={`${item.name} as you have built it`}
              />
            </div>
            <LevelDial
              legend="Ice"
              name="ice"
              side="right"
              levels={customisations.iceLevels}
              selectedId={iceId}
              onSelect={setIceId}
            />
          </div>

          {customisations.toppings.length > 0 && (
            <div className="tray" role="group" aria-labelledby="customise-toppings">
              <div className="tray__head">
                <h3 id="customise-toppings" className="tray__legend">
                  Toppings
                </h3>
                <p className="tray__hint">
                  Tap to drop one in, up to {MAX_TOPPING_QUANTITY} of each.
                </p>
              </div>
              <ul className="tray__list">
                {customisations.toppings.map((topping) => (
                  <ToppingToken
                    key={topping.id}
                    topping={topping}
                    colour={item.colour}
                    count={toppingCounts[topping.id] ?? 0}
                    onAdd={() => changeTopping(topping.id, 1)}
                    onRemove={() => changeTopping(topping.id, -1)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="customise__fixed">
          <section className="readout" aria-label="Order summary">
            <p className="readout__line">
              <strong className="readout__item">
                {quantity} × {item.name}
              </strong>
              <span className="readout__choices"> · {choices}</span>
            </p>
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

type ToppingTokenProps = {
  topping: Topping;
  colour: string;
  count: number;
  onAdd: () => void;
  onRemove: () => void;
};

/**
 * One topping in the tray. The face is a button that drops a lot into the cup each tap; a badge
 * shows how many lots are on the drink and a small "−" appears once there is one to take away.
 */
function ToppingToken({ topping, colour, count, onAdd, onRemove }: ToppingTokenProps) {
  const atMax = count >= MAX_TOPPING_QUANTITY;
  return (
    <li className="token">
      <button
        type="button"
        className="token__face"
        aria-pressed={count > 0}
        aria-disabled={atMax || undefined}
        aria-label={`Add ${topping.name}, ${formatPrice(topping.priceCents)} each${
          count > 0 ? `, ${count} added` : ''
        }`}
        onClick={() => {
          if (!atMax) onAdd();
        }}
      >
        <span className="token__art">
          <ToppingArt topping={topping} colour={colour} />
        </span>
        {count > 0 && (
          <span className="token__badge" aria-hidden="true">
            ×{count}
          </span>
        )}
        <span className="token__name">{topping.name}</span>
        <span className="token__price">+{formatPrice(topping.priceCents)}</span>
      </button>
      {count > 0 && (
        <button
          type="button"
          className="token__remove"
          aria-label={`Remove one ${topping.name}`}
          onClick={onRemove}
        >
          <span className="token__remove-mark" aria-hidden="true">
            −
          </span>
        </button>
      )}
    </li>
  );
}

type LevelDialProps = {
  legend: string;
  name: string;
  side: 'left' | 'right';
  levels: OptionLevel[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/**
 * A vertical stepped track of radio buttons beside the cup: the highest level at the top, labels on
 * the outer side, the chosen dot ringed and every dot below it filled so the track reads as a level.
 */
function LevelDial({ legend, name, side, levels, selectedId, onSelect }: LevelDialProps) {
  const selectedIndex = Math.max(
    0,
    levels.findIndex((level) => level.id === selectedId),
  );
  const fill = levels.length > 1 ? (selectedIndex / (levels.length - 1)) * 100 : 0;
  const style = { '--fill': `${fill}%`, '--stops': levels.length } as CSSProperties;
  const selected = levels[selectedIndex] ?? levels[0];
  // Top of the dial is the most of it, so the menu's lowest-first order is reversed for display.
  const topDown = levels.map((level, index) => ({ level, index })).reverse();
  return (
    <fieldset className={`dial dial--${side}`}>
      <legend className="dial__legend">{legend}</legend>
      <div className="dial__stops" style={style}>
        <span className="dial__line" aria-hidden="true" />
        <span className="dial__fill" aria-hidden="true" />
        {topDown.map(({ level, index }) => (
          <label
            key={level.id}
            className={`dial__stop${index < selectedIndex ? ' dial__stop--passed' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={level.id}
              checked={selectedId === level.id}
              onChange={() => onSelect(level.id)}
            />
            <span className="dial__dot" aria-hidden="true" />
            <span className="dial__label">{level.name}</span>
          </label>
        ))}
      </div>
      <p className="dial__value" aria-hidden="true">
        {selected?.name}
      </p>
    </fieldset>
  );
}
