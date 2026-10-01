import type { Menu, MenuItem } from '@bbt/shared';

const TAG_PRIORITY: Record<string, number> = { 'best-seller': 0, recommended: 1, new: 2 };

/** Drinks to feature on the home screen: tagged items first (best sellers, then recommended, then new), topped up in menu order. */
export function popularItems(menu: Menu, limit = 6): MenuItem[] {
  const tagged = menu.items
    .filter((item) => item.tags.length > 0)
    .sort((a, b) => (TAG_PRIORITY[a.tags[0] ?? ''] ?? 9) - (TAG_PRIORITY[b.tags[0] ?? ''] ?? 9));
  const rest = menu.items.filter((item) => item.tags.length === 0);
  return [...tagged, ...rest].slice(0, limit);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The drink that pours itself on Home today: the recommended drinks from the board in turn, one per
 * day, falling back to best sellers and then the whole menu. Same drink all day, a new one tomorrow.
 */
export function drinkOfTheDay(menu: Menu, date: Date = new Date()): MenuItem | null {
  const pool =
    menu.items.filter((item) => item.tags.includes('recommended')).length > 0
      ? menu.items.filter((item) => item.tags.includes('recommended'))
      : menu.items.filter((item) => item.tags.includes('best-seller')).length > 0
        ? menu.items.filter((item) => item.tags.includes('best-seller'))
        : menu.items;
  if (pool.length === 0) return null;
  const day = Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / DAY_MS);
  return pool[day % pool.length] ?? null;
}

/** Case-insensitive match on name and description. An empty query matches everything. */
export function matchesQuery(item: MenuItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    item.name.toLowerCase().includes(needle) ||
    (item.description?.toLowerCase().includes(needle) ?? false)
  );
}
