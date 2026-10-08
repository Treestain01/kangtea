import { PAYMENT_CURRENCY } from '@bbt/shared';
import Stripe from 'stripe';
import { PaymentsError, type PaymentsProvider } from './types.js';

/**
 * The real provider over the official SDK. Payment methods are pinned to card for now, so the
 * Payment Element shows the card form whatever the Stripe dashboard enables; widen the allowed
 * list here (or switch to automatic_payment_methods) when wallets or redirects should appear.
 */
export function createStripePayments(secretKey: string): PaymentsProvider {
  const stripe = new Stripe(secretKey);
  return {
    async createIntent(amountCents, metadata) {
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: PAYMENT_CURRENCY,
        allowed_payment_method_types: ['card'],
        metadata,
      });
      if (!intent.client_secret) {
        throw new Error(`Stripe returned no client secret for ${intent.id}`);
      }
      return { id: intent.id, clientSecret: intent.client_secret };
    },
    async getIntent(id) {
      try {
        const intent = await stripe.paymentIntents.retrieve(id);
        return {
          id: intent.id,
          status: intent.status,
          amountCents: intent.amount,
          currency: intent.currency,
          metadata: intent.metadata ?? {},
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
          throw new PaymentsError('not-found', `No payment ${id}`);
        }
        throw error;
      }
    },
  };
}
