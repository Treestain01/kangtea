/** A PaymentIntent freshly created for a cart. The client secret goes to Stripe.js only. */
export interface CreatedIntent {
  id: string;
  clientSecret: string;
}

/** A PaymentIntent as the provider reports it at verification time. */
export interface IntentDetails {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, string>;
}

/**
 * Where payments happen. Like `AccountsProvider`, this is the seam: routes and tests only know
 * this interface, and the Stripe SDK lives behind it in `stripe.ts`.
 */
export interface PaymentsProvider {
  createIntent(amountCents: number, metadata: Record<string, string>): Promise<CreatedIntent>;
  /** Throws `PaymentsError('not-found')` for an id Stripe does not know. */
  getIntent(id: string): Promise<IntentDetails>;
}

export type PaymentsErrorCode = 'unavailable' | 'not-found';

export class PaymentsError extends Error {
  constructor(
    readonly code: PaymentsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentsError';
  }
}
