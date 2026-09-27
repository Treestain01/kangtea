import { LoyaltyError, type LoyaltyProvider } from './types.js';

/** Stands in when there is no database: every call answers 503 rather than crashing. */
export function createUnavailableLoyalty(): LoyaltyProvider {
  const fail = () =>
    Promise.reject(new LoyaltyError('unavailable', 'Loyalty needs a database. Set DATABASE_URL.'));
  return { card: fail, earn: fail, redeem: fail };
}
