import type { Menu, MenuItem, OptionLevel, Topping } from '@bbt/shared';

/**
 * A drink build as a URL parameter, so a drink can be shared as a link that opens the customise
 * sheet pre-built: `<item>~<sugar>~<ice>~<topping>.<lots>,<topping>` with ids from the menu.
 * Example: `signature-fruit-tea~sugar-50~ice-less~boba.2,pudding`.
 */
export const BUILD_PARAM = 'build';

const FIELD = '~';
const TOPPING = ',';
const LOTS = '.';

export type Build = {
  item: MenuItem;
  sugar: OptionLevel;
  ice: OptionLevel;
  /** Topping id to lots. */
  toppings: Record<string, number>;
};

export type BuildInput = {
  item: MenuItem;
  sugar: OptionLevel;
  ice: OptionLevel;
  toppings: readonly { topping: Topping; quantity: number }[];
};

export function encodeBuild({ item, sugar, ice, toppings }: BuildInput): string {
  const lots = toppings
    .filter((choice) => choice.quantity > 0)
    .map((choice) =>
      choice.quantity > 1 ? `${choice.topping.id}${LOTS}${choice.quantity}` : choice.topping.id,
    )
    .join(TOPPING);
  return [item.id, sugar.id, ice.id, lots].join(FIELD);
}

/**
 * Reads a build back against the menu. Unknown drinks give null; an unknown sugar or ice falls back
 * to the default; unknown toppings are dropped and lots are capped at `maxLots`.
 */
export function decodeBuild(value: string, menu: Menu, maxLots = 3): Build | null {
  const [itemId = '', sugarId = '', iceId = '', lots = ''] = value.split(FIELD);
  const item = menu.items.find((candidate) => candidate.id === itemId);
  if (!item) return null;
  const level = (levels: OptionLevel[], id: string) =>
    levels.find((candidate) => candidate.id === id) ??
    levels.find((candidate) => candidate.isDefault) ??
    (levels[0] as OptionLevel);
  const toppings: Record<string, number> = {};
  for (const part of lots.split(TOPPING).filter(Boolean)) {
    const [id = '', count = '1'] = part.split(LOTS);
    if (!menu.customisations.toppings.some((topping) => topping.id === id)) continue;
    const quantity = Math.min(maxLots, Math.max(1, Number.parseInt(count, 10) || 1));
    toppings[id] = quantity;
  }
  return {
    item,
    sugar: level(menu.customisations.sugarLevels, sugarId),
    ice: level(menu.customisations.iceLevels, iceId),
    toppings,
  };
}

/** The full link for a build, on this site's own origin. */
export function buildUrl(build: BuildInput, origin: string): string {
  const url = new URL('/menu', origin);
  url.searchParams.set(BUILD_PARAM, encodeBuild(build));
  return url.toString();
}
