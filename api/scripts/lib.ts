import { connect, type Db } from '../src/db/client';
import { loadDotEnv, loadEnv } from '../src/env';

interface ScriptOptions {
  /** What the script is about to do, shown with the target before running. */
  action: string;
  /** Destructive scripts refuse to run unless `--yes` is on the command line. */
  confirm?: boolean;
}

/** Host and database name from a connection string, never the password. */
export function describeTarget(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname}${parsed.pathname}`;
}

/**
 * Shared shape of every database script: load `.env`, require `DATABASE_URL`, print the target,
 * honour `--yes` for destructive actions, run, and always close the pool.
 */
export async function runDbScript(
  options: ScriptOptions,
  run: (db: Db) => Promise<void>,
): Promise<void> {
  loadDotEnv();
  const env = loadEnv();
  if (!env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Put it in api/.env or the environment.');
    process.exitCode = 1;
    return;
  }

  const target = describeTarget(env.DATABASE_URL);
  console.log(`${options.action} on ${target}`);
  if (options.confirm && !process.argv.includes('--yes')) {
    console.error('Refusing without --yes. Re-run with --yes once the target above is right.');
    process.exitCode = 1;
    return;
  }

  const connection = connect(env.DATABASE_URL);
  try {
    await run(connection.db);
    console.log('Done.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await connection.close();
  }
}
