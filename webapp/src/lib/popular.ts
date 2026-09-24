import type { Menu, MenuItem } from '@bbt/shared';

const TAG_PRIORITY: Record<string, number> = { 'best-seller': 0, new: 1 };

/** Drinks to feature on the home screen: tagged items first (best sellers before new), topped up in menu order. */
export function popularItems(menu: Menu, limit = 6): MenuItem[] {
  const tagged = menu.items
    .filter((item) => item.tags.length > 0)
    .sort((a, b) => (TAG_PRIORITY[a.tags[0] ?? ''] ?? 9) - (TAG_PRIORITY[b.tags[0] ?? ''] ?? 9));
  const rest = menu.items.filter((item) => item.tags.length === 0);
  return [...tagged, ...rest].slice(0, limit);
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
