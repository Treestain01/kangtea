import { z } from 'zod';

/**
 * A chosen option on a line, for example Sugar 50% or Topping Pearls.
 * `quantity` is for options that can be added more than once (two lots of pearls); absent means one.
 */
export const CustomisationSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
});
export type Customisation = z.infer<typeof CustomisationSchema>;

/** One drink in a cart or order. Name and price are snapshots so past orders survive menu changes. */
export const OrderLineSchema = z.object({
  itemId: z.string().min(1),
  name: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().min(1),
  customisations: z.array(CustomisationSchema),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const OrderStatusSchema = z.enum(['received', 'making', 'ready', 'collected', 'cancelled']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Four uppercase letters or digits, shown to the customer when the order is ready. */
export const PickupCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{4}$/, 'expected four uppercase letters or digits');

/** Sum of unit price times quantity across lines, in cents. The one definition both sides use. */
export function orderLinesTotalCents(lines: readonly OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
}

/**
 * A loyalty free drink taken off an order: one unit of the line at `lineIndex`, worth `cents`,
 * which is the drink's base price without its toppings.
 */
export const FreeDrinkSchema = z.object({
  lineIndex: z.number().int().nonnegative(),
  cents: z.number().int().nonnegative(),
});
export type FreeDrink = z.infer<typeof FreeDrinkSchema>;

/** The order total: the lines, less the free drink when there is one. */
export function orderTotalCents(lines: readonly OrderLine[], freeDrink?: FreeDrink): number {
  return Math.max(0, orderLinesTotalCents(lines) - (freeDrink?.cents ?? 0));
}

export const OrderSchema = z
  .object({
    id: z.string().min(1),
    storeId: z.string().min(1),
    lines: z.array(OrderLineSchema).min(1),
    totalCents: z.number().int().nonnegative(),
    status: OrderStatusSchema,
    placedAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    pickupCode: PickupCodeSchema,
    freeDrink: FreeDrinkSchema.optional(),
  })
  .refine((order) => order.totalCents === orderTotalCents(order.lines, order.freeDrink), {
    message: 'totalCents must equal the sum of line prices less the free drink',
    path: ['totalCents'],
  })
  .refine(
    (order) =>
      order.freeDrink === undefined ||
      (order.freeDrink.lineIndex < order.lines.length &&
        order.freeDrink.cents <= (order.lines[order.freeDrink.lineIndex]?.unitPriceCents ?? 0)),
    { message: 'freeDrink must name a line and cost no more than one of it', path: ['freeDrink'] },
  );
export type Order = z.infer<typeof OrderSchema>;
