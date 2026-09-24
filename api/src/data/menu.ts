import type { Menu, MenuItem } from '@bbt/shared';

/**
 * Kang Tea menu.
 *
 * Categories and drink names come from the shop's public listings.
 * PRICES ARE PLACEHOLDERS. The only public prices are delivery platform prices, which carry a
 * markup, so these are plausible in-store figures that must be replaced with the real menu.
 * Colours tint the cup illustration and are product content, not UI tokens.
 */

const item = (
  categoryId: string,
  id: string,
  name: string,
  priceCents: number,
  colour: string,
  pearls: boolean,
  extra: Partial<Pick<MenuItem, 'description' | 'tags'>> = {},
): MenuItem => ({
  id,
  categoryId,
  name,
  priceCents,
  currency: 'AUD',
  tags: extra.tags ?? [],
  colour,
  pearls,
  ...(extra.description ? { description: extra.description } : {}),
});

export const menu: Menu = {
  categories: [
    { id: 'milk-tea', name: 'Milk Tea', sortOrder: 0 },
    { id: 'milk-foam', name: 'Milk Foam', sortOrder: 1 },
    { id: 'fruit-tea', name: 'Fruit Tea', sortOrder: 2 },
    { id: 'yakult', name: 'Yakult', sortOrder: 3 },
    { id: 'milo', name: 'Milo', sortOrder: 4 },
    { id: 'matcha', name: 'Matcha', sortOrder: 5 },
  ],
  items: [
    item('milk-tea', 'signature-milk-tea', 'Signature Milk Tea', 750, '#B07A45', true, {
      description: 'House black tea with fresh milk and pearls',
      tags: ['best-seller'],
    }),
    item('milk-tea', 'ruby-milk-tea', 'Ruby Milk Tea', 790, '#A2553B', true),
    item('milk-tea', 'jasmine-green-milk-tea', 'Jasmine Green Milk Tea', 750, '#B8C48A', false),
    item('milk-tea', 'black-tea-boba', 'Black Tea Boba', 720, '#6E4A2F', true),
    item(
      'milk-foam',
      'winter-melon-milk-foam',
      'Winter Melon Tea with Milk Foam',
      790,
      '#C9A86A',
      false,
      {
        tags: ['best-seller'],
      },
    ),
    item('milk-foam', 'oolong-milk-foam', 'Oolong Tea with Milk Foam', 790, '#A0743D', false),
    item('fruit-tea', 'signature-fruit-tea', 'Signature Fruit Tea', 890, '#E0912D', false, {
      description: 'Kiwi, pineapple, orange and passionfruit',
    }),
    item('fruit-tea', 'orange-green-tea', 'Orange Green Tea', 790, '#F0A640', false),
    item('fruit-tea', 'lychee-agar-green-tea', 'Lychee Agar Green Tea', 850, '#E8B7C0', false),
    item('yakult', 'orange-grapefruit-yakult', 'Orange Grapefruit Yakult', 920, '#F28C6A', false, {
      tags: ['new'],
    }),
    item('yakult', 'pineapple-yakult', 'Pineapple Yakult', 950, '#F2D06A', false),
    item('milo', 'iced-milo', 'Iced Milo', 690, '#6B4A3A', false),
    item('milo', 'milo-dinosaur', 'Milo Dinosaur', 790, '#5A3D30', false, {
      description: 'Iced Milo topped with a mountain of Milo powder',
    }),
    item('matcha', 'matcha-latte', 'Matcha Latte', 790, '#5F8F3E', false),
    item('matcha', 'strawberry-matcha-latte', 'Strawberry Matcha Latte', 850, '#7FA35A', false, {
      tags: ['new'],
    }),
  ],
};
