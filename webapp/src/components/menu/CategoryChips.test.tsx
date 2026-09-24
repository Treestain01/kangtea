import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryChips } from './CategoryChips';

const categories = [
  { id: 'fruit-tea', name: 'Fruit Tea', sortOrder: 2 },
  { id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 },
  { id: 'milk-foam', name: 'Milk Foam', sortOrder: 1 },
];

describe('CategoryChips', () => {
  it('renders All first, then categories in display order', () => {
    render(<CategoryChips categories={categories} selected={null} onSelect={() => {}} />);
    const names = screen.getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['All', 'Milk Tea', 'Milk Foam', 'Fruit Tea']);
  });

  it('marks the selected chip as pressed', () => {
    render(<CategoryChips categories={categories} selected="milk-foam" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Milk Foam' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen category, and null for All', () => {
    const onSelect = vi.fn();
    render(<CategoryChips categories={categories} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fruit Tea' }));
    expect(onSelect).toHaveBeenCalledWith('fruit-tea');
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
