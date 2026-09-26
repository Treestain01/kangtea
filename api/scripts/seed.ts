import { loadSeed } from '../src/catalogue/seed';
import { seedDatabase } from '../src/db/seed';
import { runDbScript } from './lib';
import { migrateDatabase } from './migrate';

/** Migrates, then replaces the catalogue with `seed.json` from the repository root. */
await runDbScript({ action: 'Migrating and seeding the catalogue', confirm: true }, async (db) => {
  const seed = loadSeed();
  await migrateDatabase(db);
  await seedDatabase(db, seed);
  console.log(
    `Seeded ${seed.menu.categories.length} categories, ${seed.menu.items.length} items, ` +
      `${seed.menu.customisations.toppings.length} toppings and store ${seed.store.id}.`,
  );
});
