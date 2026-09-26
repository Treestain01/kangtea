import { existsSync } from 'node:fs';
import { z } from 'zod';

const EnvSchema = z.object({
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Postgres connection string. Absent means "serve the catalogue from seed.json". */
  DATABASE_URL: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parses and validates environment variables. The only place that reads process.env. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
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
