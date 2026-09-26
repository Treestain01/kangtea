import { sql } from 'drizzle-orm';
import type { Db } from './client';

/**
 * Drops every table, type and migration record so the database is as new.
 * `public` is recreated empty; `drizzle` holds the migration journal and goes with it.
 */
export async function wipeDatabase(db: Db): Promise<void> {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
}
