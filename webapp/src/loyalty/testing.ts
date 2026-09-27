import { STAMPS_PER_CARD, type LoyaltyCard, type Stamp } from '@bbt/shared';
import { ApiError } from '../api/client';
import type { LoyaltyClient } from './LoyaltyClient';

/** An in memory `LoyaltyClient` with the api's card rules, for page tests. */
export function createFakeLoyaltyClient(colourOf: (itemId: string) => string = () => '#6B4A3A') {
  const stamps: (Stamp & { key: string })[] = [];
  let redeemed = 0;
  let counter = 0;

  const card = (): LoyaltyCard => {
    const earned = stamps.length;
    const completed = Math.floor(earned / STAMPS_PER_CARD);
    const available = Math.max(0, completed - redeemed);
    const complete = available > 0;
    const shown = complete ? redeemed : completed;
    return {
      stampsPerCard: STAMPS_PER_CARD,
      earned,
      redeemed,
      available,
      complete,
      stamps: stamps
        .slice(shown * STAMPS_PER_CARD, shown * STAMPS_PER_CARD + STAMPS_PER_CARD)
        .map((s) => ({ id: s.id, itemName: s.itemName, colour: s.colour, earnedAt: s.earnedAt })),
    };
  };

  const client: LoyaltyClient = {
    async card() {
      return card();
    },
    async earn(_token, request) {
      request.lines.forEach((line, index) => {
        for (let n = 0; n < line.quantity; n += 1) {
          const key = `${request.orderId}:${index}:${n}`;
          if (stamps.some((s) => s.key === key)) continue;
          counter += 1;
          stamps.push({
            key,
            id: `stamp-${counter}`,
            itemName: line.name,
            colour: colourOf(line.itemId),
            earnedAt: new Date(Date.UTC(2026, 8, 27, 1, 0, counter)).toISOString(),
          });
        }
      });
      return card();
    },
    async redeem() {
      if (card().available < 1) throw new ApiError(409, 'No free drink to use yet');
      redeemed += 1;
      return card();
    },
  };

  return { client, card, stamps };
}
