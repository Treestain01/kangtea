import { describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './client';

function fakeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe('fetchHealth', () => {
  it('returns the parsed health response', async () => {
    const body = { status: 'ok', service: 'bbt-api', timestamp: '2026-09-23T10:00:00.000Z' };
    await expect(fetchHealth(fakeFetch(200, body))).resolves.toEqual(body);
  });

  it('calls the /health endpoint on the configured API URL', async () => {
    const impl = fakeFetch(200, {
      status: 'ok',
      service: 'bbt-api',
      timestamp: '2026-09-23T10:00:00.000Z',
    });
    await fetchHealth(impl);
    expect(impl).toHaveBeenCalledWith('http://localhost:3000/health');
  });

  it('throws on a non 2xx status', async () => {
    await expect(fetchHealth(fakeFetch(503, {}))).rejects.toThrow('503');
  });

  it('throws when the body does not match the contract', async () => {
    await expect(fetchHealth(fakeFetch(200, { status: 'down' }))).rejects.toThrow();
  });
});
