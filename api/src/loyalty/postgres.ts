import { LoyaltyCardSchema, STAMPS_PER_CARD, type LoyaltyCard } from '@bbt/shared';
import { randomUUID } from 'node:crypto';
import { asc, count, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { loyaltyRedemptions, loyaltyStamps } from '../db/schema.js';
import { LoyaltyError, type LoyaltyProvider } from './types.js';

/**
 * Stamps and redemptions in our own tables.
 *
 * The card shown is the oldest completed card that has not been redeemed, when there is one,
 * otherwise the card in progress. Cards are consecutive runs of ten stamps in earning order.
 */
export function createPostgresLoyalty(db: Db, now: () => Date = () => new Date()): LoyaltyProvider {
  async function card(userId: string): Promise<LoyaltyCard> {
    const [[earnedRow], [redeemedRow]] = await Promise.all([
      db.select({ n: count() }).from(loyaltyStamps).where(eq(loyaltyStamps.userId, userId)),
      db
        .select({ n: count() })
        .from(loyaltyRedemptions)
        .where(eq(loyaltyRedemptions.userId, userId)),
    ]);
    const earned = Number(earnedRow?.n ?? 0);
    const redeemed = Number(redeemedRow?.n ?? 0);
    const completed = Math.floor(earned / STAMPS_PER_CARD);
    const available = Math.max(0, completed - redeemed);
    const complete = available > 0;
    const shownCard = complete ? redeemed : completed;
    const rows = await db
      .select()
      .from(loyaltyStamps)
      .where(eq(loyaltyStamps.userId, userId))
      .orderBy(asc(loyaltyStamps.earnedAt), asc(loyaltyStamps.id))
      .offset(shownCard * STAMPS_PER_CARD)
      .limit(STAMPS_PER_CARD);
    return LoyaltyCardSchema.parse({
      stampsPerCard: STAMPS_PER_CARD,
      earned,
      redeemed,
      available,
      complete,
      stamps: rows.map((row) => ({
        id: row.id,
        itemName: row.itemName,
        colour: row.colour,
        earnedAt: row.earnedAt.toISOString(),
      })),
    });
  }

  return {
    card,

    async earn(userId, stamps) {
      if (stamps.length > 0) {
        // One millisecond apart, so a batch keeps its order on the card.
        const base = now().getTime();
        await db
          .insert(loyaltyStamps)
          .values(
            stamps.map((stamp, index) => ({
              id: randomUUID(),
              userId,
              stampKey: stamp.key,
              itemId: stamp.itemId,
              itemName: stamp.itemName,
              colour: stamp.colour,
              earnedAt: new Date(base + index),
            })),
          )
          .onConflictDoNothing({ target: [loyaltyStamps.userId, loyaltyStamps.stampKey] });
      }
      return card(userId);
    },

    async redeem(userId) {
      const current = await card(userId);
      if (current.available < 1) {
        throw new LoyaltyError('nothing-to-redeem', 'No free drink to use yet');
      }
      await db.insert(loyaltyRedemptions).values({ id: randomUUID(), userId, redeemedAt: now() });
      return card(userId);
    },
  };
}
