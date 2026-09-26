import { connect } from '../db/client';
import type { Env } from '../env';
import { createPostgresCatalogue } from './postgres';
import { createSeedCatalogue, loadSeed } from './seed';
import type { Catalogue } from './types';

export type { Catalogue } from './types';

/** Postgres when `DATABASE_URL` is set, otherwise the committed seed from memory. */
export function createCatalogue(env: Env): Catalogue {
  if (env.DATABASE_URL) {
    return createPostgresCatalogue(connect(env.DATABASE_URL).db);
  }
  console.warn('DATABASE_URL is not set. Serving the catalogue from seed.json.');
  return createSeedCatalogue(loadSeed());
}
