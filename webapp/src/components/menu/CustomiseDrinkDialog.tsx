import type {
  MenuCustomisations,
  MenuItem,
  MenuItemTag,
  OptionLevel,
  OrderLine,
  Topping,
} from '@bbt/shared';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatPrice } from '../../lib/money';
import {
  buildCartLine,
  MAX_TOPPING_QUANTITY,
  unitPriceCents,
  type ToppingChoice,
} from '../../store/lines';
import { LiveCup } from '../cup/LiveCup';
import { flyCup, tap } from '../cup/fly';
import { cue } from '../../lib/sounds';
import { buildUrl } from '../../lib/build';
import { describeShareOutcome, shareDrink } from '../../lib/share';
import { ToppingArt } from '../cup/ToppingArt';
import './CustomiseDrinkDialog.css';

type CustomiseDrinkDialogProps = {
  /** The drink being customised, or null when closed. */
  item: MenuItem | null;
  /** Category name shown beside the drink name. */
  categoryName?: string;
  customisations: MenuCustomisations;
  /** Where to start instead of the defaults: Surprise me's levels, or a shared build. Keep the object stable. */
  initial?: { sugarId?: string; iceId?: string; toppings?: Record<string, number> };
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
  initial,
  onAdd,
  onClose,
}: CustomiseDrinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageCupRef = useRef<HTMLDivElement>(null);
  const [sugarId, setSugarId] = useState(defaultOf(customisations.sugarLevels).id);
  const [iceId, setIceId] = useState(defaultOf(customisations.iceLevels).id);
  const [toppingCounts, setToppingCounts] = useState<ToppingCounts>({});
  const [quantity, setQuantity] = useState(1);
  const [shareStatus, setShareStatus] = useState('');
  const [sharing, setSharing] = useState(false);

  // Reset the choices and open or close the dialog whenever the drink changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item) {
      setSugarId(initial?.sugarId ?? defaultOf(customisations.sugarLevels).id);
      setIceId(initial?.iceId ?? defaultOf(customisations.iceLevels).id);
      setToppingCounts(initial?.toppings ?? {});
      setQuantity(1);
      setShareStatus('');
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [item, customisations, initial]);

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

  const changeTopping = (id: string, delta: number) => {
    if (delta > 0 && (toppingCounts[id] ?? 0) < MAX_TOPPING_QUANTITY) {
      cue('drop');
      tap('light');
    }
    setToppingCounts((current) => {
      const next = Math.min(MAX_TOPPING_QUANTITY, Math.max(0, (current[id] ?? 0) + delta));
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
  };

  const share = async () => {
    setSharing(true);
    setShareStatus('');
    const url = buildUrl({ item, sugar, ice, toppings }, window.location.origin);
    const svg = stageCupRef.current?.querySelector('svg');
    const image = svg
      ? await import('../../lib/cupImage').then(({ renderCupImage }) =>
          renderCupImage(svg, { brand: 'KANG TEA', name: item.name, details: choices }),
        )
      : null;
    const outcome = await shareDrink({
      title: `${item.name} at Kang Tea`,
      text: `${item.name}, ${choices}. Tap the link to build it.`,
      url,
      image,
    });
    setShareStatus(describeShareOutcome(outcome));
    setSharing(false);
  };

  const add = () => {
    // The built cup arcs into the Order tab while the sheet closes. Decorative; never awaited.
    if (stageCupRef.current) void flyCup(stageCupRef.current);
    cue('pour');
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
          <button
            type="button"
            className="customise__close"
            aria-label="Share this drink"
            disabled={sharing}
            onClick={() => void share()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
              <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
            </svg>
          </button>
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
                garnish={item.garnish}
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
              shortLabels
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
              <TrayScroller>
                {customisations.toppings.map((topping) => (
                  <ToppingToken
                    key={topping.id}
                    topping={topping}
                    count={toppingCounts[topping.id] ?? 0}
                    onAdd={() => changeTopping(topping.id, 1)}
                    onRemove={() => changeTopping(topping.id, -1)}
                  />
                ))}
              </TrayScroller>
            </div>
          )}
        </div>

        <div className="customise__fixed">
          <p className="visually-hidden" role="status">
            {shareStatus}
          </p>
          <section className="readout" aria-label="Order summary">
            <p className="readout__line">
              <strong className="readout__item">
                {quantity} × {item.name}
              </strong>
              <span className="readout__choices"> · {choices}</span>
              {shareStatus && <span className="readout__status"> · {shareStatus}</span>}
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

/** How far an arrow tap scrolls the tray, as a share of its visible width. */
const TRAY_PAGE = 0.8;

/**
 * The topping tray with an arrow at whichever edge still has tokens beyond it, so the swipe is
 * discoverable. Tapping an arrow scrolls a page. The arrows are decorative for assistive technology;
 * the list itself is reachable by keyboard.
 */
function TrayScroller({ children }: { children: React.ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const max = list.scrollWidth - list.clientWidth;
      setEdges({ left: list.scrollLeft > 4, right: max - list.scrollLeft > 4 });
    };
    measure();
    list.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(list);
    return () => {
      list.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, []);

  const page = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * list.clientWidth * TRAY_PAGE, behavior: 'smooth' });
  };

  const scrollerClass = [
    'tray__scroller',
    edges.left && 'tray__scroller--start',
    edges.right && 'tray__scroller--end',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={scrollerClass}>
      <ul className="tray__list" ref={listRef}>
        {children}
      </ul>
      {edges.left && (
        <button
          type="button"
          className="tray__arrow tray__arrow--left"
          aria-label="Earlier toppings"
          onClick={() => page(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          className="tray__arrow tray__arrow--right"
          aria-label="More toppings"
          onClick={() => page(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m10 6 6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

type ToppingTokenProps = {
  topping: Topping;
  count: number;
  onAdd: () => void;
  onRemove: () => void;
};

/**
 * One topping in the tray. The face is a button that drops a lot into the cup each tap; a badge
 * shows how many lots are on the drink and a small "−" appears once there is one to take away.
 */
function ToppingToken({ topping, count, onAdd, onRemove }: ToppingTokenProps) {
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
          <ToppingArt topping={topping} />
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
  /** Show only the first word of each level, so "Standard ice" reads "Standard" beside the cup. */
  shortLabels?: boolean;
};

/** "Standard ice" to "Standard": the first word carries the meaning next to the dial's legend. */
const firstWord = (name: string) => name.split(' ')[0] ?? name;

/**
 * A vertical stepped track of radio buttons beside the cup: the highest level at the top, labels on
 * the outer side, the chosen dot ringed and every dot below it filled so the track reads as a level.
 * A finger or pointer can also be dragged along the track; the stop under it is chosen as it moves.
 */
function LevelDial({
  legend,
  name,
  side,
  levels,
  selectedId,
  onSelect,
  shortLabels = false,
}: LevelDialProps) {
  const selectedIndex = Math.max(
    0,
    levels.findIndex((level) => level.id === selectedId),
  );
  const fill = levels.length > 1 ? (selectedIndex / (levels.length - 1)) * 100 : 0;
  const style = { '--fill': `${fill}%`, '--stops': levels.length } as CSSProperties;
  const selected = levels[selectedIndex] ?? levels[0];
  // Top of the dial is the most of it, so the menu's lowest-first order is reversed for display.
  const topDown = levels.map((level, index) => ({ level, index })).reverse();
  const label = (level: OptionLevel) => (shortLabels ? firstWord(level.name) : level.name);
  const stopsRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // The stop under the pointer, from the track's height split evenly between the stops.
  const chooseAt = (clientY: number) => {
    const stops = stopsRef.current;
    if (!stops) return;
    const rect = stops.getBoundingClientRect();
    if (rect.height <= 0) return;
    const row = Math.min(
      topDown.length - 1,
      Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * topDown.length)),
    );
    const next = topDown[row]?.level.id;
    if (next && next !== selectedId) onSelect(next);
  };
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    chooseAt(event.clientY);
  };
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) chooseAt(event.clientY);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <fieldset className={`dial dial--${side}`}>
      <legend className="dial__legend">{legend}</legend>
      <div
        className="dial__stops"
        style={style}
        ref={stopsRef}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
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
              aria-label={level.name}
              checked={selectedId === level.id}
              onChange={() => onSelect(level.id)}
            />
            <span className="dial__dot" aria-hidden="true" />
            <span className="dial__label">{label(level)}</span>
          </label>
        ))}
      </div>
      <p className="dial__value" aria-hidden="true">
        {selected ? label(selected) : ''}
      </p>
    </fieldset>
  );
}
