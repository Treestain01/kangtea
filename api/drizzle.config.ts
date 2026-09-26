import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit reads this for `pnpm db:generate`, which diffs `src/db/schema.ts` against the
 * snapshots in `drizzle/meta` and writes a new SQL migration. It needs no database connection.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
});
