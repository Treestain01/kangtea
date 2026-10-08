import { z } from 'zod';
import { FreeDrinkSchema, OrderLineSchema } from './order.js';

/** Kang Tea charges in Australian dollars only; Stripe wants the lowercase ISO code. */
export const PAYMENT_CURRENCY = 'aud';

/**
 * What the webapp sends to open a payment: the cart as it stands and the total it showed.
 * The api prices the lines itself from the catalogue and refuses when the totals disagree,
 * so the client never dictates an amount.
 */
export const PaymentIntentRequestSchema = z.object({
  lines: z.array(OrderLineSchema).min(1),
  expectedTotalCents: z.number().int().positive(),
  /** Claiming the loyalty free drink; the api checks the card before honouring it. */
  freeDrink: FreeDrinkSchema.optional(),
});
export type PaymentIntentRequest = z.infer<typeof PaymentIntentRequestSchema>;

export const PaymentIntentResponseSchema = z.object({
  paymentIntentId: z.string().min(1),
  clientSecret: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.literal(PAYMENT_CURRENCY),
});
export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>;

/** Stripe's statuses the webapp distinguishes; anything newer maps onto `other`. */
export const PaymentStatusSchema = z.enum([
  'succeeded',
  'processing',
  'requires_payment_method',
  'requires_action',
  'canceled',
  'other',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/**
 * The intent as Stripe reports it, read back by the api at verification time.
 * `fromKangTea` is whether the intent's metadata carries our tag, so a foreign intent is refused.
 */
export const PaymentStatusResponseSchema = z.object({
  paymentIntentId: z.string().min(1),
  status: PaymentStatusSchema,
  amountCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  fromKangTea: z.boolean(),
});
export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>;
