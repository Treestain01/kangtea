import { connect } from '../db/client.js';
import type { Env } from '../env.js';
import { createPostgresCatalogue } from './postgres.js';
import { createSeedCatalogue, loadSeed } from './seed.js';
import type { Catalogue } from './types.js';

export type { Catalogue } from './types.js';

/** Postgres when `DATABASE_URL` is set, otherwise the committed seed from memory. */
export function createCatalogue(env: Env): Catalogue {
  if (env.DATABASE_URL) {
    return createPostgresCatalogue(connect(env.DATABASE_URL).db);
  }
  console.warn('DATABASE_URL is not set. Serving the catalogue from seed.json.');
  return createSeedCatalogue(loadSeed());
}
