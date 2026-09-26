import { wipeDatabase } from '../src/db/wipe.js';
import { runDbScript } from './lib.js';

/** Drops everything in the database. Run `pnpm db:seed` afterwards to rebuild it. */
await runDbScript(
  { action: 'Wiping every table and migration record', confirm: true },
  wipeDatabase,
);
