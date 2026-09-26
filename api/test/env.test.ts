import { describe, expect, it } from 'vitest';
import { loadEnv, parseAllowedOrigins } from '../src/env';

describe('parseAllowedOrigins', () => {
  it('splits on commas and trims whitespace', () => {
    expect(parseAllowedOrigins('http://a.test, https://b.test ,http://c.test')).toEqual([
      'http://a.test',
      'https://b.test',
      'http://c.test',
    ]);
  });

  it('drops empty entries', () => {
    expect(parseAllowedOrigins('http://a.test,,')).toEqual(['http://a.test']);
  });
});

describe('loadEnv', () => {
  it('applies development defaults when variables are absent', () => {
    expect(loadEnv({})).toEqual({
      ALLOWED_ORIGINS: 'http://localhost:5173',
      PORT: 3000,
      DATABASE_URL: undefined,
    });
  });

  it('coerces PORT to a number', () => {
    expect(loadEnv({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a non numeric PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow();
  });

  it('keeps DATABASE_URL when set', () => {
    const url = 'postgresql://user:pw@db.example/kangtea?sslmode=require';
    expect(loadEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('treats an empty DATABASE_URL as unset', () => {
    expect(loadEnv({ DATABASE_URL: '' }).DATABASE_URL).toBeUndefined();
  });
});
