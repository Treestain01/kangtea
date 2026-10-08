import { PaymentsError, type PaymentsProvider } from './types.js';

/** Used when STRIPE_SECRET_KEY is unset: every call answers that payments are off. */
export function createUnavailablePayments(): PaymentsProvider {
  const refuse = () => {
    throw new PaymentsError('unavailable', 'Payments are not configured');
  };
  return { createIntent: async () => refuse(), getIntent: async () => refuse() };
}
