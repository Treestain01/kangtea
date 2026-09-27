import { earnStamps, fetchLoyaltyCard, redeemFreeDrink } from '../api/client';
import type { LoyaltyClient } from './LoyaltyClient';

/** The pearl card held by our api. See api/knowledge/loyalty.md. */
export const apiLoyaltyClient: LoyaltyClient = {
  card: (token) => fetchLoyaltyCard(token),
  earn: (token, request) => earnStamps(token, request),
  redeem: (token) => redeemFreeDrink(token),
};
