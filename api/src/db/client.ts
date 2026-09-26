import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Any Drizzle Postgres database over our schema: the `pg` pool in production and scripts,
 * PGlite in tests. Everything in `src/db` and `src/catalogue` is written against this type.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbConnection {
  db: Db;
  /** Closes the pool. Scripts must call this or Node keeps running. */
  close: () => Promise<void>;
}

/** Opens a small pool to the database at `url`. Use the pooled Neon connection string. */
export function connect(url: string): DbConnection {
  const pool = new Pool({ connectionString: url, max: 5 });
  return { db: drizzle({ client: pool, schema }), close: () => pool.end() };
}

/** Where drizzle-kit writes migrations, resolved from this file so the cwd does not matter. */
export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
