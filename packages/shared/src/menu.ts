import { z } from 'zod';

export const MenuCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Display order, ascending. */
  sortOrder: z.number().int().nonnegative(),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

/** `recommended` is the cactus mark on the in-store board; `best-seller` leads Popular now. */
export const MenuItemTagSchema = z.enum(['best-seller', 'recommended', 'new']);
export type MenuItemTag = z.infer<typeof MenuItemTagSchema>;

/** Citrus slices the drink comes with, leaning on the cup walls. Not a topping; never removable. */
export const GarnishSchema = z.enum(['orange', 'lemon']);
export type Garnish = z.infer<typeof GarnishSchema>;

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
  /** Slices the illustration leans on the cup walls, for drinks that come with them. */
  garnish: GarnishSchema.optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

/** One choice in a single-select group such as sugar or ice. */
export const OptionLevelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isDefault: z.boolean(),
});
export type OptionLevel = z.infer<typeof OptionLevelSchema>;

const oneDefault = (levels: OptionLevel[]) =>
  levels.filter((level) => level.isDefault).length === 1;

const OptionLevelsSchema = z
  .array(OptionLevelSchema)
  .min(1)
  .refine(oneDefault, { message: 'exactly one level must be the default' });

/** An add-on with its own price, folded into the line's unit price when chosen. */
export const ToppingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});
export type Topping = z.infer<typeof ToppingSchema>;

/** Choices offered on every drink. Per-drink exceptions can be added later without breaking this shape. */
export const MenuCustomisationsSchema = z.object({
  sugarLevels: OptionLevelsSchema,
  iceLevels: OptionLevelsSchema,
  toppings: z.array(ToppingSchema),
});
export type MenuCustomisations = z.infer<typeof MenuCustomisationsSchema>;

export const MenuSchema = z
  .object({
    categories: z.array(MenuCategorySchema).min(1),
    items: z.array(MenuItemSchema),
    customisations: MenuCustomisationsSchema,
  })
  .refine(
    (menu) => {
      const known = new Set(menu.categories.map((category) => category.id));
      return menu.items.every((item) => known.has(item.categoryId));
    },
    { message: 'every item must reference a listed category', path: ['items'] },
  );
export type Menu = z.infer<typeof MenuSchema>;
