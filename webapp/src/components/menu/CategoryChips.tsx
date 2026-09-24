import type { MenuCategory } from '@bbt/shared';
import './menu.css';

export const ALL_CATEGORIES = null;

type CategoryChipsProps = {
  categories: MenuCategory[];
  /** Selected category id, or `null` for all drinks. */
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
};

/** Horizontal, scrollable filter for the drink grid. "All" comes first. */
export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const chips: { id: string | null; name: string }[] = [
    { id: ALL_CATEGORIES, name: 'All' },
    ...ordered.map((category) => ({ id: category.id, name: category.name })),
  ];

  return (
    <div className="chips" role="group" aria-label="Drink categories">
      {chips.map((chip) => (
        <button
          key={chip.id ?? 'all'}
          type="button"
          className="chip"
          aria-pressed={chip.id === selected}
          onClick={() => onSelect(chip.id)}
        >
          {chip.name}
        </button>
      ))}
    </div>
  );
}
