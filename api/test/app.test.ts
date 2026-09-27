import { HealthResponseSchema } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/create-app.js';
import { createUnavailableAccounts } from '../src/accounts/unavailable.js';
import { createSeedCatalogue, loadSeed } from '../src/catalogue/seed.js';

const app = createApp(
  { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined },
  { catalogue: createSeedCatalogue(loadSeed()), accounts: createUnavailableAccounts() },
);

describe('GET /health', () => {
  it('returns a response that satisfies the shared contract', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const parsed = HealthResponseSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
  });

  it('allows a configured origin', async () => {
    const res = await app.request('/health', { headers: { Origin: 'http://localhost:5173' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('does not allow an unknown origin', async () => {
    const res = await app.request('/health', { headers: { Origin: 'https://evil.example' } });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('unknown routes', () => {
  it('returns JSON 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});
