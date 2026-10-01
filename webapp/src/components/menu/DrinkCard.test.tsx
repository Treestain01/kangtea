import type { MenuItem } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrinkCard } from './DrinkCard';

const signature: MenuItem = {
  id: 'signature-milk-tea',
  categoryId: 'milk-tea',
  name: 'Signature Milk Tea',
  description: 'House black tea with fresh milk and pearls',
  priceCents: 750,
  currency: 'AUD',
  tags: ['best-seller'],
  colour: '#B07A45',
  pearls: true,
};

describe('DrinkCard', () => {
  it('shows the name, description, price and tag', () => {
    render(<DrinkCard item={signature} />);
    expect(screen.getByRole('article', { name: 'Signature Milk Tea' })).toBeInTheDocument();
    expect(screen.getByText('House black tea with fresh milk and pearls')).toBeInTheDocument();
    expect(screen.getByText('$7.50')).toBeInTheDocument();
    expect(screen.getByText('Best seller')).toBeInTheDocument();
  });

  it('omits the tag and description when the item has none', () => {
    render(<DrinkCard item={{ ...signature, tags: [], description: undefined }} />);
    expect(screen.queryByText('Best seller')).not.toBeInTheDocument();
    expect(screen.queryByText(/House black tea/)).not.toBeInTheDocument();
  });

  it('labels a new item', () => {
    render(<DrinkCard item={{ ...signature, tags: ['new'] }} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('is a button that opens customisation for the item', () => {
    const onOpen = vi.fn();
    render(<DrinkCard item={signature} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Customise Signature Milk Tea' }));
    expect(onOpen).toHaveBeenCalledWith(signature);
  });

  it('draws the drink as its cup, with pearls when the menu says so', () => {
    const { rerender } = render(<DrinkCard item={signature} />);
    expect(document.querySelectorAll('svg.staticcup use[href="#kt-pearl"]').length).toBeGreaterThan(
      0,
    );
    rerender(<DrinkCard item={{ ...signature, pearls: false }} />);
    expect(document.querySelectorAll('svg.staticcup use[href="#kt-pearl"]')).toHaveLength(0);
  });

  it('lights up when highlighted', () => {
    render(<DrinkCard item={signature} highlighted />);
    expect(screen.getByRole('article')).toHaveClass('drink--highlighted');
  });

  it('has no button without a handler', () => {
    render(<DrinkCard item={signature} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
