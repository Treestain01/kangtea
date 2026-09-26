import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { migrationsFolder, type Db } from '../src/db/client';
import { runDbScript } from './lib';

/** Applies every migration in `api/drizzle` that the database has not seen yet. */
export async function migrateDatabase(db: Db): Promise<void> {
  // The node-postgres migrator wants its own database type; ours is the common supertype.
  await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder });
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  await runDbScript({ action: 'Applying migrations' }, migrateDatabase);
}
