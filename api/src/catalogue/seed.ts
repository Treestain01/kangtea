import { MenuSchema, StoreSchema } from '@bbt/shared';
import { z } from 'zod';
import seedJson from '../../../seed.json' with { type: 'json' };
import type { Catalogue } from './types';

/** Shape of `seed.json` at the repository root: the base template for the database. */
export const SeedSchema = z.object({
  store: StoreSchema,
  menu: MenuSchema,
});
export type Seed = z.infer<typeof SeedSchema>;

/** Parses the committed seed. Throws if someone has edited it into an invalid shape. */
export function loadSeed(): Seed {
  return SeedSchema.parse(seedJson);
}

/** Serves the seed from memory. Used when `DATABASE_URL` is not set, and in tests. */
export function createSeedCatalogue(seed: Seed): Catalogue {
  return {
    getStore: () => Promise.resolve(seed.store),
    getMenu: () => Promise.resolve(seed.menu),
  };
}
