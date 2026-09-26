import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '../src/index.js';

const valid = {
  status: 'ok',
  service: 'bbt-api',
  timestamp: '2026-09-23T10:00:00.000Z',
};

describe('HealthResponseSchema', () => {
  it('accepts a valid health response', () => {
    expect(HealthResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(HealthResponseSchema.safeParse({ ...valid, status: 'down' }).success).toBe(false);
  });

  it('rejects a non ISO timestamp', () => {
    expect(HealthResponseSchema.safeParse({ ...valid, timestamp: 'yesterday' }).success).toBe(
      false,
    );
  });

  it('rejects a missing service', () => {
    const withoutService = { status: valid.status, timestamp: valid.timestamp };
    expect(HealthResponseSchema.safeParse(withoutService).success).toBe(false);
  });
});
