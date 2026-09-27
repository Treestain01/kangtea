import { z } from 'zod';

/** Stamps on one card. The tenth drink is free. */
export const STAMPS_PER_CARD = 10;

/** One pearl on the card: the drink that earned it, in its own colour. */
export const StampSchema = z.object({
  id: z.string().min(1),
  itemName: z.string().min(1),
  /** The drink's cup colour when the stamp was earned. Product content, like `MenuItem.colour`. */
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a 6 digit hex colour'),
  earnedAt: z.iso.datetime(),
});
export type Stamp = z.infer<typeof StampSchema>;

/**
 * The signed in person's loyalty state.
 * `stamps` are the pearls shown on the current card, oldest first, at most `STAMPS_PER_CARD`.
 * When `complete` is true the card is full and `available` is at least one; a redemption clears
 * it and the next drink starts a fresh card.
 */
export const LoyaltyCardSchema = z
  .object({
    stampsPerCard: z.literal(STAMPS_PER_CARD),
    /** Every stamp ever earned. */
    earned: z.number().int().nonnegative(),
    /** Free drinks used. */
    redeemed: z.number().int().nonnegative(),
    /** Free drinks waiting to be used: completed cards minus redemptions. */
    available: z.number().int().nonnegative(),
    complete: z.boolean(),
    stamps: z.array(StampSchema).max(STAMPS_PER_CARD),
  })
  .refine((card) => card.complete === card.available > 0, {
    message: 'complete must mean a free drink is available',
    path: ['complete'],
  });
export type LoyaltyCard = z.infer<typeof LoyaltyCardSchema>;

/** Sent when an order is collected. One stamp per drink, so quantity counts. */
export const EarnStampsRequestSchema = z.object({
  orderId: z.string().min(1),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        name: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
});
export type EarnStampsRequest = z.infer<typeof EarnStampsRequestSchema>;
