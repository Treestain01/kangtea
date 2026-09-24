import type { Order } from '@bbt/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { menuItemFixture } from '../../store/testing';
import { PopularRow } from './PopularRow';
import { SearchBar } from './SearchBar';
import { UsualCard } from './UsualCard';

describe('SearchBar', () => {
  it('reports the trimmed text on submit when uncontrolled', () => {
    const onSubmit = vi.fn();
    render(<SearchBar onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox', { name: 'Search drinks' });
    fireEvent.change(input, { target: { value: '  matcha ' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(onSubmit).toHaveBeenCalledWith('matcha');
  });

  it('reflects a controlled value and reports every change', () => {
    const onChange = vi.fn();
    render(<SearchBar value="taro" onChange={onChange} />);
    const input = screen.getByRole('searchbox', { name: 'Search drinks' });
    expect(input).toHaveValue('taro');
    fireEvent.change(input, { target: { value: 'taro m' } });
    expect(onChange).toHaveBeenCalledWith('taro m');
  });
});

describe('UsualCard', () => {
  const order: Order = {
    id: 'o1',
    storeId: 's',
    lines: [
      {
        itemId: 'signature-milk-tea',
        name: 'Signature Milk Tea',
        unitPriceCents: 830,
        quantity: 1,
        customisations: [
          { name: 'Sugar', value: '50%' },
          { name: 'Ice', value: 'Less ice' },
          { name: 'Topping', value: 'Pearls' },
        ],
      },
      {
        itemId: 'matcha-latte',
        name: 'Matcha Latte',
        unitPriceCents: 790,
        quantity: 1,
        customisations: [],
      },
    ],
    totalCents: 1620,
    status: 'collected',
    placedAt: '2026-09-20T02:00:00.000Z',
    updatedAt: '2026-09-20T03:00:00.000Z',
    pickupCode: 'ABCD',
  };

  it('names the first drink, counts the rest, shows its choices and the total', () => {
    render(<UsualCard order={order} onReorder={vi.fn()} />);
    expect(screen.getByText('Signature Milk Tea + 1 more')).toBeInTheDocument();
    expect(screen.getByText('50% · Less ice · Pearls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder · $16.20' })).toBeInTheDocument();
  });

  it('reorders the order', () => {
    const onReorder = vi.fn();
    render(<UsualCard order={order} onReorder={onReorder} />);
    fireEvent.click(screen.getByRole('button', { name: /Reorder/ }));
    expect(onReorder).toHaveBeenCalledWith(order);
  });
});

describe('PopularRow', () => {
  it('lists compact cards with a link to the full menu', () => {
    const onOpen = vi.fn();
    render(
      <MemoryRouter>
        <PopularRow
          items={[menuItemFixture(), menuItemFixture({ id: 'm', name: 'Matcha Latte' })]}
          onOpen={onOpen}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Popular now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See the full menu' })).toHaveAttribute(
      'href',
      '/menu',
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Customise Matcha Latte' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }));
  });
});
