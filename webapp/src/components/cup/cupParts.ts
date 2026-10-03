import type { Garnish, OptionLevel, Topping } from '@bbt/shared';
import type { ToppingChoice } from '../../store/lines';

/**
 * How menu data becomes cup art. The rules and numbers here mirror `src/assets/art/README.md`.
 *
 * Colours in this file are product colours (tapioca, cream, topping tints), fixed in both themes
 * like the drink colours in seed.json. `src/theme/tokens.test.ts` exempts this file for that reason;
 * the cup outline, lid and straw still take theme tokens in LiveCup.css.
 */

/** The cup's own coordinate space, shared with the symbols in cup-parts.svg. */
export const CUP = {
  width: 120,
  height: 200,
  /** The tea's top edge with nothing on the surface. */
  liquidTop: 44,
  /** Leaves room above the lid for the straw and steam. */
  viewBox: '0 -14 120 214',
  /** The inside of the cup, the same path as `#kt-cup-inner` in cup-parts.svg. The tea is clipped to it. */
  innerPath: 'M22 36 H98 L88 187 Q86.5 194 79 194 H41 Q33.5 194 32 187 Z',
} as const;

/**
 * The fixed simulation step in milliseconds. Matter scales velocities by the ratio of consecutive
 * deltas, so the step never varies. Lives here so LiveCup can import it without pulling the engine in.
 */
export const FRAME_MS = 1000 / 60;

export const PRODUCT_COLOURS = {
  /** A generic milk tea, for cups that stand for no drink in particular: loaders, the empty cup, 404. */
  tea: '#b07a45',
  pearl: '#33261f',
  cream: '#f7f0e3',
  ice: '#ffffff',
  brulee: '#c9812c',
  pudding: '#f2b84b',
  coconutJelly: '#ffffff',
  teaJelly: '#c99a4f',
  waterChestnut: '#f2e0c0',
  barley: '#c9a86a',
  taro: '#b48fd0',
  orangeSlice: '#f08c28',
  lemonSlice: '#e8d44d',
} as const;

/**
 * The product colour variables the cup parts read.
 * Shared by the live cup and the topping icons so a pearl looks the same in both.
 */
export function productColourVars(): Record<string, string> {
  return {
    '--pearl': PRODUCT_COLOURS.pearl,
    '--pearl-mini': PRODUCT_COLOURS.pearl,
    '--foam': PRODUCT_COLOURS.cream,
    '--ice': PRODUCT_COLOURS.ice,
    '--brulee': PRODUCT_COLOURS.brulee,
    '--pudding': PRODUCT_COLOURS.pudding,
    '--taro': PRODUCT_COLOURS.taro,
    '--orange-slice': PRODUCT_COLOURS.orangeSlice,
    '--lemon-slice': PRODUCT_COLOURS.lemonSlice,
  };
}

/** One physical body in the cup. `key` is stable across renders so the diff can keep or drop it. */
export interface PieceSpec {
  key: string;
  symbol: string;
  size: number;
  /** The physics body's diameter when the art fills less of its box than usual (mini pearls). */
  bodySize?: number;
  shape: 'circle' | 'box';
  kind: 'sink' | 'ice';
  tint?: string;
}

/** A layer painted on the surface rather than dropped in. */
export interface CapSpec {
  symbol: 'kt-foam-cap' | 'kt-brulee';
  /** How far the tea drops to make room, in cup units. */
  drop: number;
  /** Placement in the cup space: the symbol's surface line sits on the liquid top. */
  x: number;
  width: number;
  height: number;
  surfaceLine: number;
}

type ToppingArt =
  | {
      kind: 'sink';
      symbol: string;
      /** Symbols cycled piece by piece, for combos that pour several things in together. */
      mix?: readonly string[];
      size: number;
      shape: 'circle' | 'box';
      perLot: number;
      tint?: string;
    }
  | { kind: 'cap'; cap: CapSpec }
  | { kind: 'wall'; symbol: string; perLot: number };

/** A citrus slice leaning on the cup wall: drawn in place, translucent, never a physics body. */
export interface WallSpec {
  key: string;
  symbol: string;
  x: number;
  y: number;
  size: number;
}

/**
 * Slice centres, alternating walls down the cup, reused top to bottom as slices accumulate.
 * Sized like the slices in the shop photography: around half the cup's width, clipped by the walls.
 */
const WALL_SLOTS = [
  { x: 39, y: 92, size: 56 },
  { x: 82, y: 124, size: 52 },
  { x: 36, y: 150, size: 48 },
  { x: 84, y: 76, size: 48 },
  { x: 34, y: 118, size: 46 },
  { x: 86, y: 160, size: 46 },
  { x: 42, y: 68, size: 46 },
  { x: 80, y: 148, size: 46 },
  { x: 60, y: 98, size: 46 },
] as const;

/** How many slices a drink's innate garnish leans on the walls. */
const GARNISH_SLICES = 3;

const FOAM: CapSpec = {
  symbol: 'kt-foam-cap',
  drop: 16,
  x: 0,
  width: 120,
  height: 40,
  surfaceLine: 30,
};
const BRULEE: CapSpec = {
  symbol: 'kt-brulee',
  drop: 6,
  x: 0,
  width: 120,
  height: 16,
  surfaceLine: 6,
};

const sink = (
  symbol: string,
  size: number,
  shape: 'circle' | 'box',
  perLot: number,
  extra: { mix?: readonly string[]; tint?: string } = {},
): ToppingArt => ({ kind: 'sink', symbol, size, shape, perLot, ...extra });

/**
 * Picks the art for a topping from its name, so a renamed or new topping still gets something sensible.
 * A lot's body count is sized so one serving piles two to three rows deep across the cup floor,
 * the 25 to 35 cup units that two to three real centimetres come to.
 * Mini pearls are the exception: a serving is a deep heap of them, three times that count.
 */
export function artForTopping(topping: Topping): ToppingArt {
  const name = topping.name.toLowerCase();
  const has = (word: string) => name.includes(word);
  if (has('slice'))
    return {
      kind: 'wall',
      symbol: has('lemon') ? 'kt-lemon-slice' : 'kt-orange-slice',
      perLot: 2,
    };
  if (has('foam')) return { kind: 'cap', cap: FOAM };
  if (has('brulee') || has('brûlée')) return { kind: 'cap', cap: BRULEE };
  if (has('ice cream')) return sink('kt-ice-cream-scoop', 40, 'circle', 1);
  if (has('pudding')) return sink('kt-pudding', 30, 'box', 1);
  if (has('taro')) return sink('kt-taro-ball', 14, 'circle', 10);
  if (has('agar')) return sink('kt-agar-ball', 13, 'circle', 10);
  if (has('popping')) {
    return sink('kt-popping-ball', 14, 'circle', 10, {
      tint: has('barley') ? PRODUCT_COLOURS.barley : PRODUCT_COLOURS.waterChestnut,
    });
  }
  if (has('jelly')) {
    // Grass jelly is as dark as the tapioca; tea jelly a light honey amber.
    const tint = has('grass')
      ? PRODUCT_COLOURS.pearl
      : has('coconut')
        ? PRODUCT_COLOURS.coconutJelly
        : PRODUCT_COLOURS.teaJelly;
    // "Boba, Mini Pearls & Grass Jelly": pearls, mini pearls and jelly cubes in turn.
    if (has('boba') || has('pearl'))
      return sink('kt-pearl', 14, 'circle', 12, {
        mix: ['kt-pearl', 'kt-pearl-mini', 'kt-jelly-cube'],
        tint,
      });
    return sink('kt-jelly-cube', 16, 'box', 8, { tint });
  }
  if (has('mixed'))
    return sink('kt-pearl', 14, 'circle', 10, { mix: ['kt-pearl', 'kt-pearl-mini'] });
  if (has('mini')) return sink('kt-pearl-mini', 12, 'circle', 36);
  return sink('kt-pearl', 14, 'circle', 10);
}

/** Bodies for every lot of every chosen topping, in menu order. */
export function piecesFor(toppings: readonly ToppingChoice[]): PieceSpec[] {
  const specs: PieceSpec[] = [];
  for (const { topping, quantity } of toppings) {
    const art = artForTopping(topping);
    if (art.kind !== 'sink') continue;
    for (let lot = 0; lot < quantity; lot += 1) {
      for (let n = 0; n < art.perLot; n += 1) {
        const symbol = art.mix ? (art.mix[n % art.mix.length] ?? art.symbol) : art.symbol;
        const size =
          symbol === 'kt-pearl-mini' ? 12 : symbol === 'kt-jelly-cube' && art.mix ? 14 : art.size;
        specs.push({
          key: `${topping.id}:${lot}:${n}`,
          symbol,
          size,
          // The mini pearl's circle fills just over half its box, so its body is sized to the art.
          ...(symbol === 'kt-pearl-mini' ? { bodySize: 8 } : {}),
          shape: symbol === 'kt-jelly-cube' || symbol === 'kt-pudding' ? 'box' : 'circle',
          kind: 'sink',
          ...(art.tint ? { tint: art.tint } : {}),
        });
      }
    }
  }
  return specs;
}

/** How much further the tea drops for each foam lot past the first. */
const FOAM_LOT_DROP = 14;

/**
 * The foam cap for a number of lots: every lot past the first drops the tea another `FOAM_LOT_DROP`.
 * The live cup draws the foam itself from the drop (see `foamBandFor`); the symbol's height and
 * surface line only place the static cup's cap and size the tray token.
 */
function foamFor(quantity: number): CapSpec {
  return { ...FOAM, drop: FOAM.drop + FOAM_LOT_DROP * Math.max(0, quantity - 1) };
}

/** How far the foam band rises above where the tea would rest without it. */
const FOAM_LIP = 2;

/**
 * The thickness of the live cup's foam band, zero without foam. The band's bottom edge sits exactly
 * on the lowered tea (`liquidTopFor`) and its top edge stays at `CUP.liquidTop - FOAM_LIP` whatever
 * the quantity, so more foam expands the same band downward and it never overlaps the tea.
 */
export function foamBandFor(caps: readonly CapSpec[]): number {
  const foam = caps.find((cap) => cap.symbol === 'kt-foam-cap');
  return foam ? foam.drop + FOAM_LIP : 0;
}

/**
 * Slices leaning on the cup walls: the drink's innate garnish first, then every lot of a slice
 * topping, each taking the next wall slot so they spread down the cup in a stable order.
 */
export function wallPiecesFor(toppings: readonly ToppingChoice[], garnish?: Garnish): WallSpec[] {
  const slices: { key: string; symbol: string }[] = [];
  if (garnish) {
    const symbol = garnish === 'lemon' ? 'kt-lemon-slice' : 'kt-orange-slice';
    for (let n = 0; n < GARNISH_SLICES; n += 1) slices.push({ key: `garnish:${n}`, symbol });
  }
  for (const { topping, quantity } of toppings) {
    const art = artForTopping(topping);
    if (art.kind !== 'wall') continue;
    for (let lot = 0; lot < quantity; lot += 1) {
      for (let n = 0; n < art.perLot; n += 1) {
        slices.push({ key: `${topping.id}:${lot}:${n}`, symbol: art.symbol });
      }
    }
  }
  return slices.map((slice, index) => {
    const slot = WALL_SLOTS[index % WALL_SLOTS.length] as (typeof WALL_SLOTS)[number];
    // A second pass over the slots nudges down a little so stacked slices stay distinguishable.
    const nudge = Math.floor(index / WALL_SLOTS.length) * 6;
    return {
      ...slice,
      x: slot.x - slot.size / 2,
      y: slot.y - slot.size / 2 + nudge,
      size: slot.size,
    };
  });
}

/** Surface layers for the chosen toppings, brulee under foam. Foam thickens with its quantity. */
export function capsFor(toppings: readonly ToppingChoice[]): CapSpec[] {
  const caps = toppings
    .map(({ topping, quantity }) => ({ art: artForTopping(topping), quantity }))
    .filter(
      (entry): entry is { art: { kind: 'cap'; cap: CapSpec }; quantity: number } =>
        entry.art.kind === 'cap',
    )
    .map(({ art, quantity }) => (art.cap.symbol === 'kt-foam-cap' ? foamFor(quantity) : art.cap));
  return [...caps].sort((a, b) => a.drop - b.drop);
}

/** Where the tea's top edge sits once the caps have taken their room. */
export function liquidTopFor(caps: readonly CapSpec[]): number {
  return CUP.liquidTop + Math.max(0, ...caps.map((cap) => cap.drop));
}

/**
 * Cubes for an ice level, from its name: warm and no ice give none, little gives two, less gives
 * three, anything else (standard) four.
 */
export function iceCubeCount(level: Pick<OptionLevel, 'name'>): number {
  const name = level.name.toLowerCase();
  if (name.includes('warm') || name.includes('hot') || name.includes('no ')) return 0;
  if (name.includes('little') || name.includes('light')) return 2;
  if (name.includes('less')) return 3;
  return 4;
}

export function showsSteam(level: Pick<OptionLevel, 'name'>): boolean {
  const name = level.name.toLowerCase();
  return name.includes('warm') || name.includes('hot');
}

export function icePieces(level: OptionLevel): PieceSpec[] {
  return Array.from({ length: iceCubeCount(level) }, (_, n) => ({
    key: `ice:${n}`,
    symbol: 'kt-ice-cube',
    size: 18,
    shape: 'box',
    kind: 'ice',
  }));
}

/** Percentage of the drink colour in the tea: 0% sugar is 55% colour and 45% white, 100% sugar is the colour as given. */
export function teaColourMix(level: Pick<OptionLevel, 'name'>): number {
  const percent = Number.parseInt(level.name, 10);
  const sugar = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 100;
  return Math.round(55 + 45 * (sugar / 100));
}
