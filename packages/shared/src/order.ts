import { z } from 'zod';

/** A chosen option on a line, for example size Large. Empty until ordering supports options. */
export const CustomisationSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
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
  })
  .refine((order) => order.totalCents === orderLinesTotalCents(order.lines), {
    message: 'totalCents must equal the sum of line prices',
    path: ['totalCents'],
  });
export type Order = z.infer<typeof OrderSchema>;
