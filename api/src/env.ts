import { existsSync } from 'node:fs';
import { z } from 'zod';

/**
 * The Vercel Neon integration installs its variables with the `KANG_TEA_DB_` prefix chosen when the
 * database was connected. The api reads that name as well as the plain one, so no duplicate variable
 * has to be maintained by hand on Vercel.
 */
export const DATABASE_URL_KEYS = ['DATABASE_URL', 'KANG_TEA_DB_DATABASE_URL'] as const;

const EnvSchema = z.object({
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Postgres connection string. Absent means "serve the catalogue from seed.json". */
  DATABASE_URL: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parses and validates environment variables. The only place that reads process.env. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const databaseUrl = DATABASE_URL_KEYS.map((key) => source[key]).find(
    (value) => value !== undefined && value !== '',
  );
  return EnvSchema.parse({
    ALLOWED_ORIGINS: source.ALLOWED_ORIGINS,
    PORT: source.PORT,
    DATABASE_URL: databaseUrl,
  });
}

/**
 * Loads `.env` from the current directory into process.env when the file exists.
 * Local entrypoints (dev server, scripts) call this; Vercel sets variables itself.
 */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

/** Turns the comma separated ALLOWED_ORIGINS value into a clean list. */
export function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
