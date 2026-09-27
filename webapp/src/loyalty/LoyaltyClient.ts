import type { EarnStampsRequest, LoyaltyCard } from '@bbt/shared';

/**
 * How the webapp reads and changes the pearl card. Mirrors `AuthClient`: `apiLoyaltyClient` talks
 * to our api, and a different provider later means a different implementation here, nothing else.
 */
export interface LoyaltyClient {
  card(token: string): Promise<LoyaltyCard>;
  earn(token: string, request: EarnStampsRequest): Promise<LoyaltyCard>;
  redeem(token: string): Promise<LoyaltyCard>;
}
