import type { MenuItem } from '@bbt/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrinkGrid } from './DrinkGrid';

const base: MenuItem = {
  id: 'a',
  categoryId: 'milk-tea',
  name: 'A',
  priceCents: 700,
  currency: 'AUD',
  tags: [],
  colour: '#B07A45',
  pearls: false,
};

describe('DrinkGrid', () => {
  it('renders one card per item', () => {
    render(
      <DrinkGrid
        items={[base, { ...base, id: 'b', name: 'B' }, { ...base, id: 'c', name: 'C' }]}
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('list', { name: 'Drinks' })).toBeInTheDocument();
  });

  it('explains an empty category', () => {
    render(<DrinkGrid items={[]} />);
    expect(screen.getByText('No drinks in this category yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
