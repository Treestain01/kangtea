import type { OrderLine } from '@bbt/shared';
import { useEffect, useId, useRef, type CSSProperties } from 'react';
import type { ToppingChoice } from '../../store/lines';
import {
  CUP,
  PRODUCT_COLOURS,
  capsFor,
  iceCubeCount,
  liquidTopFor,
  piecesFor,
  productColourVars,
  showsSteam,
  teaColourMix,
  type PieceSpec,
} from './cupParts';
import './StaticCup.css';

type Customisation = OrderLine['customisations'][number];

type StaticCupProps = {
  /** The drink colour from the menu. */
  colour: string;
  /** The line's choices: sugar, ice and toppings. A plain drink has none. */
  customisations?: readonly Customisation[];
  /** Draw pearls even without a topping line, for drinks the menu says come with them. */
  pearls?: boolean;
  /** How full the cup is, 0 to 1. The kitchen pours from 0. */
  level?: number;
  /** Whether the lid is on. The kitchen puts it on when the drink is ready. */
  lid?: boolean;
  /** Pieces that appear drop in from above rather than sitting where they land. */
  drop?: boolean;
  /** Names the cup for assistive technology. Without it the cup is decorative. */
  label?: string;
  className?: string;
};

/** Where pieces pile: three rows from the floor up, centre out, in cup units. */
const FLOOR_Y = 194;
const ROW_HEIGHT = 13;
const SLOT_XS = [
  [60, 48, 72, 36, 84],
  [54, 66, 42, 78],
  [60, 48, 72],
];
const MAX_PIECES = SLOT_XS.flat().length;

const PEARLS_WITH_THE_DRINK: ToppingChoice = {
  topping: { id: 'pearls', name: 'Pearls', priceCents: 0 },
  quantity: 1,
};

function choicesFrom(customisations: readonly Customisation[]): ToppingChoice[] {
  return customisations
    .filter((choice) => choice.name === 'Topping')
    .map((choice) => ({
      topping: { id: choice.value, name: choice.value, priceCents: 0 },
      quantity: choice.quantity ?? 1,
    }));
}

function levelNamed(customisations: readonly Customisation[], name: string) {
  const value = customisations.find((choice) => choice.name === name)?.value;
  return value ? { name: value } : null;
}

/**
 * A cup drawn from a line's choices with no physics: the tea tinted by its sugar, ice under the
 * surface, caps on top and up to a dozen pieces piled at the bottom. Used wherever a drink is shown
 * at rest: menu cards, Your usual, cart rows, the kitchen and the taste portrait.
 */
export function StaticCup({
  colour,
  customisations = [],
  pearls = false,
  level = 1,
  lid = true,
  drop = false,
  label,
  className,
}: StaticCupProps) {
  const clipId = useId();
  const sugar = levelNamed(customisations, 'Sugar');
  const ice = levelNamed(customisations, 'Ice');
  const toppings = choicesFrom(customisations);
  const chosen = toppings.length === 0 && pearls ? [PEARLS_WITH_THE_DRINK] : toppings;
  const caps = capsFor(chosen);
  const pieces = piecesFor(chosen).slice(0, MAX_PIECES);
  const cubes = ice ? iceCubeCount(ice) : 0;
  const restingTop = liquidTopFor(caps);
  const liquidTop = restingTop + (1 - Math.min(1, Math.max(0, level))) * (CUP.height - restingTop);
  const empty = level <= 0;

  // Pieces that were not there on the previous render get the drop animation.
  const seen = useRef<Set<string>>(new Set());
  const fresh = pieces.filter((piece) => !seen.current.has(piece.key)).map((piece) => piece.key);
  useEffect(() => {
    if (!empty) pieces.forEach((piece) => seen.current.add(piece.key));
  });

  const style = {
    '--tea': `color-mix(in srgb, ${colour} ${teaColourMix(sugar ?? { name: '100%' })}%, ${PRODUCT_COLOURS.coconutJelly})`,
    ...productColourVars(colour),
  } as CSSProperties;

  return (
    <svg
      className={`staticcup${className ? ` ${className}` : ''}`}
      viewBox={CUP.viewBox}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={CUP.innerPath} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect
          className="staticcup__liquid"
          x="18"
          y={liquidTop}
          width="84"
          height={Math.max(0, CUP.height - liquidTop)}
          fill="var(--tea)"
        />
        {!empty &&
          pieces.map((piece, index) => (
            <Piece
              key={piece.key}
              spec={piece}
              index={index}
              dropping={drop && fresh.includes(piece.key)}
            />
          ))}
        {!empty &&
          Array.from({ length: cubes }, (_, n) => (
            <use
              key={`ice-${n}`}
              href="#kt-ice-cube"
              x={[36, 72, 50, 62][n] ?? 60}
              y={restingTop + 6 + (n > 1 ? 14 : 0)}
              width="18"
              height="18"
            />
          ))}
        {!empty &&
          caps.map((cap) => (
            <use
              key={cap.symbol}
              href={`#${cap.symbol}`}
              x={cap.x}
              y={liquidTop - cap.surfaceLine}
              width={cap.width}
              height={cap.height}
            />
          ))}
      </g>
      <use href="#kt-tea-sheen" width={CUP.width} height={CUP.height} />
      <use href="#kt-cup-body" width={CUP.width} height={CUP.height} />
      <use
        href="#kt-cup-lid"
        width={CUP.width}
        height={CUP.height}
        className={`staticcup__lid${lid ? '' : ' staticcup__lid--off'}`}
      />
      {ice && showsSteam(ice) && !empty && (
        <use href="#kt-steam" width={CUP.width} height={CUP.height} />
      )}
      <use href="#kt-straw" width={CUP.width} height={CUP.height} />
    </svg>
  );
}

function Piece({ spec, index, dropping }: { spec: PieceSpec; index: number; dropping: boolean }) {
  const row = index < 5 ? 0 : index < 9 ? 1 : 2;
  const x = SLOT_XS[row]?.[index - (row === 0 ? 0 : row === 1 ? 5 : 9)] ?? 60;
  const y = FLOOR_Y - ROW_HEIGHT * row - spec.size / 2;
  const style = {
    ...(spec.tint ? { '--jelly': spec.tint, '--popping': spec.tint } : {}),
    '--delay': `calc(var(--motion-fast) * ${(index % 5) * 0.4})`,
  } as CSSProperties;
  return (
    <use
      href={`#${spec.symbol}`}
      x={x - spec.size / 2}
      y={y}
      width={spec.size}
      height={spec.size}
      className={dropping ? 'staticcup__piece--drop' : undefined}
      style={style}
    />
  );
}
