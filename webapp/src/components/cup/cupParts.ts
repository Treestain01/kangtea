import type { OptionLevel, Topping } from '@bbt/shared';
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
  grassJelly: '#3d4a2c',
  coconutJelly: '#ffffff',
  teaJelly: '#8a5a3c',
  waterChestnut: '#f2e0c0',
  barley: '#c9a86a',
  taro: '#b48fd0',
} as const;

/**
 * The product colour variables the cup parts read, for a drink of the given colour.
 * Shared by the live cup and the topping icons so a pearl looks the same in both.
 */
export function productColourVars(colour: string): Record<string, string> {
  return {
    '--pearl': PRODUCT_COLOURS.pearl,
    '--pearl-mini': `color-mix(in srgb, ${colour} 60%, ${PRODUCT_COLOURS.pearl})`,
    '--foam': PRODUCT_COLOURS.cream,
    '--ice': PRODUCT_COLOURS.ice,
    '--brulee': PRODUCT_COLOURS.brulee,
    '--pudding': PRODUCT_COLOURS.pudding,
    '--taro': PRODUCT_COLOURS.taro,
  };
}

/** One physical body in the cup. `key` is stable across renders so the diff can keep or drop it. */
export interface PieceSpec {
  key: string;
  symbol: string;
  size: number;
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
      alt?: string;
      size: number;
      shape: 'circle' | 'box';
      perLot: number;
      tint?: string;
    }
  | { kind: 'cap'; cap: CapSpec };

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
  extra: { alt?: string; tint?: string } = {},
): ToppingArt => ({ kind: 'sink', symbol, size, shape, perLot, ...extra });

/** Picks the art for a topping from its name, so a renamed or new topping still gets something sensible. */
export function artForTopping(topping: Topping): ToppingArt {
  const name = topping.name.toLowerCase();
  const has = (word: string) => name.includes(word);
  if (has('foam')) return { kind: 'cap', cap: FOAM };
  if (has('brulee') || has('brûlée')) return { kind: 'cap', cap: BRULEE };
  if (has('ice cream')) return sink('kt-ice-cream-scoop', 40, 'circle', 1);
  if (has('pudding')) return sink('kt-pudding', 30, 'box', 1);
  if (has('taro')) return sink('kt-taro-ball', 14, 'circle', 5);
  if (has('agar')) return sink('kt-agar-ball', 13, 'circle', 5);
  if (has('popping')) {
    return sink('kt-popping-ball', 14, 'circle', 4, {
      tint: has('barley') ? PRODUCT_COLOURS.barley : PRODUCT_COLOURS.waterChestnut,
    });
  }
  if (has('jelly')) {
    const tint = has('grass')
      ? PRODUCT_COLOURS.grassJelly
      : has('coconut')
        ? PRODUCT_COLOURS.coconutJelly
        : PRODUCT_COLOURS.teaJelly;
    // "Boba, Mini Pearls & Grass Jelly": pearls with jelly cubes in between.
    if (has('boba') || has('pearl'))
      return sink('kt-pearl', 14, 'circle', 5, { alt: 'kt-jelly-cube', tint });
    return sink('kt-jelly-cube', 16, 'box', 4, { tint });
  }
  if (has('mixed')) return sink('kt-pearl', 14, 'circle', 5, { alt: 'kt-pearl-mini' });
  if (has('mini')) return sink('kt-pearl-mini', 12, 'circle', 5);
  return sink('kt-pearl', 14, 'circle', 5);
}

/** Bodies for every lot of every chosen topping, in menu order. */
export function piecesFor(toppings: readonly ToppingChoice[]): PieceSpec[] {
  const specs: PieceSpec[] = [];
  for (const { topping, quantity } of toppings) {
    const art = artForTopping(topping);
    if (art.kind !== 'sink') continue;
    for (let lot = 0; lot < quantity; lot += 1) {
      for (let n = 0; n < art.perLot; n += 1) {
        const symbol = art.alt && n % 2 ? art.alt : art.symbol;
        const size =
          symbol === 'kt-pearl-mini' ? 12 : symbol === 'kt-jelly-cube' && art.alt ? 14 : art.size;
        specs.push({
          key: `${topping.id}:${lot}:${n}`,
          symbol,
          size,
          shape: symbol === 'kt-jelly-cube' || symbol === 'kt-pudding' ? 'box' : 'circle',
          kind: 'sink',
          ...(art.tint ? { tint: art.tint } : {}),
        });
      }
    }
  }
  return specs;
}

/** Surface layers for the chosen toppings, brulee under foam. */
export function capsFor(toppings: readonly ToppingChoice[]): CapSpec[] {
  const caps = toppings
    .map(({ topping }) => artForTopping(topping))
    .filter((art): art is { kind: 'cap'; cap: CapSpec } => art.kind === 'cap')
    .map((art) => art.cap);
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
