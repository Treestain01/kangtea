import type { Order } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { tasteFrom } from './taste';

const order = (id: string, status: Order['status'], lines: Order['lines']): Order => ({
  id,
  storeId: 's',
  lines,
  totalCents: 0,
  status,
  placedAt: '2026-09-20T02:00:00.000Z',
  updatedAt: '2026-09-20T03:00:00.000Z',
  pickupCode: 'ABCD',
});

const milkTea = (quantity: number, sugar: string, ice: string, toppings: string[] = []) => ({
  itemId: 'signature-milk-tea',
  name: 'Signature Milk Tea',
  unitPriceCents: 750,
  quantity,
  customisations: [
    { name: 'Sugar', value: sugar },
    { name: 'Ice', value: ice },
    ...toppings.map((value) => ({ name: 'Topping', value })),
  ],
});

describe('tasteFrom', () => {
  it('is null with no collected orders', () => {
    expect(tasteFrom([])).toBeNull();
    expect(tasteFrom([order('o1', 'ready', [milkTea(1, '50%', 'Less ice')])])).toBeNull();
  });

  it('finds the favourite drink and the usual sugar, ice and topping, weighted by quantity', () => {
    const taste = tasteFrom([
      order('o1', 'collected', [milkTea(2, '50%', 'Less ice', ['Pearls'])]),
      order('o2', 'collected', [
        milkTea(1, '100%', 'Normal ice', ['Pearls', 'Pudding']),
        {
          itemId: 'matcha-latte',
          name: 'Matcha Latte',
          unitPriceCents: 790,
          quantity: 1,
          customisations: [{ name: 'Sugar', value: '50%' }],
        },
      ]),
      order('o3', 'cancelled', [milkTea(5, '0%', 'Warm')]),
    ]);
    expect(taste).toEqual({
      orders: 2,
      drinks: 4,
      favourite: { itemId: 'signature-milk-tea', name: 'Signature Milk Tea', count: 3 },
      sugar: { value: '50%', count: 3 },
      ice: { value: 'Less ice', count: 2 },
      topping: { value: 'Pearls', count: 3 },
    });
  });

  it('leaves a habit null when no drink carried that kind of choice', () => {
    const taste = tasteFrom([
      order('o1', 'collected', [
        { itemId: 'x', name: 'X', unitPriceCents: 1, quantity: 1, customisations: [] },
      ]),
    ]);
    expect(taste?.sugar).toBeNull();
    expect(taste?.topping).toBeNull();
    expect(taste?.favourite.name).toBe('X');
  });
});
