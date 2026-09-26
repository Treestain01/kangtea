import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPostgresCatalogue } from '../src/catalogue/postgres';
import { loadSeed } from '../src/catalogue/seed';
import { migrationsFolder } from '../src/db/client';
import * as schema from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';
import { wipeDatabase } from '../src/db/wipe';

/**
 * Runs the real migrations, seed, catalogue reads and wipe against PGlite, an in process
 * Postgres. What passes here is what `pnpm db:seed` and `pnpm db:wipe` do to Neon.
 */

const client = new PGlite();
const db = drizzle({ client, schema });
const seed = loadSeed();

async function tableNames(): Promise<string[]> {
  const result = await db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  );
  return result.rows.map((row) => row.table_name);
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
});

afterAll(async () => {
  await client.close();
});

describe('migrations', () => {
  it('create the catalogue tables', async () => {
    expect(await tableNames()).toEqual([
      'menu_categories',
      'menu_items',
      'option_levels',
      'stores',
      'toppings',
    ]);
  });
});

describe('seedDatabase and the Postgres catalogue', () => {
  it('round trips the seed through the database unchanged', async () => {
    await seedDatabase(db, seed);
    const catalogue = createPostgresCatalogue(db);
    await expect(catalogue.getStore()).resolves.toEqual(seed.store);
    await expect(catalogue.getMenu()).resolves.toEqual(seed.menu);
  });

  it('is idempotent: seeding again leaves the same catalogue', async () => {
    await seedDatabase(db, seed);
    await seedDatabase(db, seed);
    const catalogue = createPostgresCatalogue(db);
    await expect(catalogue.getMenu()).resolves.toEqual(seed.menu);
    const counted = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from menu_items`,
    );
    expect(Number(counted.rows[0]?.count)).toBe(seed.menu.items.length);
  });

  it('reports a missing store as an error rather than an empty object', async () => {
    await db.delete(schema.stores);
    await expect(createPostgresCatalogue(db).getStore()).rejects.toThrow(/no store/);
  });
});

describe('wipeDatabase', () => {
  it('removes every table and the migration journal, and migrations can run again', async () => {
    await wipeDatabase(db);
    expect(await tableNames()).toEqual([]);
    const journal = await db.execute<{ exists: boolean }>(
      sql`select exists(select 1 from information_schema.schemata where schema_name = 'drizzle') as exists`,
    );
    expect(journal.rows[0]?.exists).toBe(false);

    await migrate(db, { migrationsFolder });
    await seedDatabase(db, seed);
    await expect(createPostgresCatalogue(db).getMenu()).resolves.toEqual(seed.menu);
  });
});
