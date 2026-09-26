import { wipeDatabase } from '../src/db/wipe';
import { runDbScript } from './lib';

/** Drops everything in the database. Run `pnpm db:seed` afterwards to rebuild it. */
await runDbScript(
  { action: 'Wiping every table and migration record', confirm: true },
  wipeDatabase,
);
