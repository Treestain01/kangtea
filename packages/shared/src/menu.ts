import { z } from 'zod';

export const MenuCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Display order, ascending. */
  sortOrder: z.number().int().nonnegative(),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const MenuItemTagSchema = z.enum(['best-seller', 'new']);
export type MenuItemTag = z.infer<typeof MenuItemTagSchema>;

export const MenuItemSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  /** Whole cents, so arithmetic never touches floating point. */
  priceCents: z.number().int().nonnegative(),
  currency: z.literal('AUD'),
  tags: z.array(MenuItemTagSchema),
  /** Tint for the cup illustration. Product content, not a UI token. */
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a 6 digit hex colour'),
  /** Whether the illustration shows pearls at the bottom of the cup. */
  pearls: z.boolean(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuSchema = z
  .object({
    categories: z.array(MenuCategorySchema).min(1),
    items: z.array(MenuItemSchema),
  })
  .refine(
    (menu) => {
      const known = new Set(menu.categories.map((category) => category.id));
      return menu.items.every((item) => known.has(item.categoryId));
    },
    { message: 'every item must reference a listed category', path: ['items'] },
  );
export type Menu = z.infer<typeof MenuSchema>;
