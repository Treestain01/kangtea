import type { LoyaltyCard } from '@bbt/shared';

/** One pearl to record. `key` makes earning idempotent: the same order never stamps twice. */
export interface StampInput {
  key: string;
  itemId: string;
  itemName: string;
  colour: string;
}

/**
 * Where loyalty stamps live. Like `AccountsProvider`, this is the seam for moving the data
 * somewhere else; routes and the webapp only know this interface and the shared contract.
 */
export interface LoyaltyProvider {
  card(userId: string): Promise<LoyaltyCard>;
  /** Records stamps, skipping any whose key already exists, and returns the card afterwards. */
  earn(userId: string, stamps: readonly StampInput[]): Promise<LoyaltyCard>;
  /** Uses one free drink. Throws `LoyaltyError('nothing-to-redeem')` when none is available. */
  redeem(userId: string): Promise<LoyaltyCard>;
}

export type LoyaltyErrorCode = 'nothing-to-redeem' | 'unavailable';

export class LoyaltyError extends Error {
  constructor(
    readonly code: LoyaltyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LoyaltyError';
  }
}
