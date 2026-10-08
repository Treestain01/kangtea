import {
  PAYMENT_CURRENCY,
  PaymentIntentRequestSchema,
  PaymentIntentResponseSchema,
  PaymentStatusResponseSchema,
  PaymentStatusSchema,
} from '@bbt/shared';
import { Hono, type Context } from 'hono';
import type { AccountsProvider } from '../accounts/types.js';
import type { Catalogue } from '../catalogue/types.js';
import type { LoyaltyProvider } from '../loyalty/types.js';
import { priceLines, PricingError } from '../payments/pricing.js';
import { PaymentsError, type PaymentsProvider } from '../payments/types.js';

/** The metadata tag that marks an intent as ours; verification refuses intents without it. */
const SOURCE_TAG = 'bbt';

function bearerToken(c: Context): string | null {
  const match = c.req.header('authorization')?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

async function jsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function handleError(c: Context, error: unknown): Response {
  if (error instanceof PaymentsError) {
    return c.json({ error: error.message }, error.code === 'not-found' ? 404 : 503);
  }
  if (error instanceof PricingError) {
    return c.json({ error: error.message }, 422);
  }
  throw error;
}

/**
 * Payment intents, priced on the server and verified against Stripe.
 * The client's expectedTotalCents is only ever compared, never charged.
 */
export const paymentsRoutes = (
  payments: PaymentsProvider,
  catalogue: Catalogue,
  accounts: AccountsProvider,
  loyalty: LoyaltyProvider,
) => {
  const routes = new Hono();

  routes.post('/intent', async (c) => {
    try {
      const parsed = PaymentIntentRequestSchema.safeParse(await jsonBody(c));
      if (!parsed.success) {
        return c.json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
      }
      const { lines, expectedTotalCents, freeDrink } = parsed.data;
      if (freeDrink) {
        const token = bearerToken(c);
        const me = token ? await accounts.resolve(token) : null;
        if (!me) return c.json({ error: 'Sign in to use the free drink' }, 401);
        const card = await loyalty.card(me.user.id);
        if (card.available < 1) return c.json({ error: 'No free drink on the card' }, 409);
      }
      const menu = await catalogue.getMenu();
      const totalCents = priceLines(menu, lines, freeDrink);
      if (totalCents <= 0) {
        return c.json({ error: 'Nothing to pay; place the order directly' }, 422);
      }
      if (totalCents !== expectedTotalCents) {
        return c.json(
          { error: 'The menu has changed; refresh and try again', serverTotalCents: totalCents },
          409,
        );
      }
      const store = await catalogue.getStore();
      const created = await payments.createIntent(totalCents, {
        source: SOURCE_TAG,
        storeId: store.id,
      });
      return c.json(
        PaymentIntentResponseSchema.parse({
          paymentIntentId: created.id,
          clientSecret: created.clientSecret,
          amountCents: totalCents,
          currency: PAYMENT_CURRENCY,
        }),
      );
    } catch (error) {
      return handleError(c, error);
    }
  });

  routes.get('/:id', async (c) => {
    try {
      const details = await payments.getIntent(c.req.param('id'));
      const known = PaymentStatusSchema.safeParse(details.status);
      return c.json(
        PaymentStatusResponseSchema.parse({
          paymentIntentId: details.id,
          status: known.success ? known.data : 'other',
          amountCents: details.amountCents,
          currency: details.currency,
          fromKangTea: details.metadata.source === SOURCE_TAG,
        }),
      );
    } catch (error) {
      return handleError(c, error);
    }
  });

  return routes;
};
