import { createPostgresAccounts } from './accounts/postgres.js';
import { createUnavailableAccounts } from './accounts/unavailable.js';
import { createPostgresCatalogue } from './catalogue/postgres.js';
import { createSeedCatalogue, loadSeed } from './catalogue/seed.js';
import type { AppDeps } from './create-app.js';
import { connect } from './db/client.js';
import type { Env } from './env.js';
import { createPostgresLoyalty } from './loyalty/postgres.js';
import { createUnavailableLoyalty } from './loyalty/unavailable.js';
import { createStripePayments } from './payments/stripe.js';
import { createUnavailablePayments } from './payments/unavailable.js';

/**
 * Builds everything the routes read from and write to, over one database connection.
 * Without `DATABASE_URL` the catalogue comes from `seed.json` and accounts are unavailable.
 * Without `STRIPE_SECRET_KEY` payments are unavailable and ordering stays free of charge.
 */
export function createDeps(env: Env): AppDeps {
  const payments = env.STRIPE_SECRET_KEY
    ? createStripePayments(env.STRIPE_SECRET_KEY)
    : createUnavailablePayments();
  if (!env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY is not set. Payments are off; /payments answers 503.');
  }
  if (!env.DATABASE_URL) {
    console.warn(
      'DATABASE_URL is not set. Serving the catalogue from seed.json; accounts are off.',
    );
    return {
      catalogue: createSeedCatalogue(loadSeed()),
      accounts: createUnavailableAccounts(),
      loyalty: createUnavailableLoyalty(),
      payments,
    };
  }
  const { db } = connect(env.DATABASE_URL);
  return {
    catalogue: createPostgresCatalogue(db),
    accounts: createPostgresAccounts(db),
    loyalty: createPostgresLoyalty(db),
    payments,
  };
}
