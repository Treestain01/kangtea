import { describe, expect, it } from 'vitest';
import { loadEnv, parseAllowedOrigins } from '../src/env.js';

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
  const url = 'postgresql://user:pw@db.example/kangtea?sslmode=require';

  it('applies development defaults when variables are absent', () => {
    expect(loadEnv({})).toEqual({
      ALLOWED_ORIGINS: 'http://localhost:5173',
      PORT: 3000,
      DATABASE_URL: undefined,
    });
  });

  it('reads STRIPE_SECRET_KEY and treats an empty value as unset', () => {
    expect(loadEnv({ STRIPE_SECRET_KEY: 'sk_test_x' }).STRIPE_SECRET_KEY).toBe('sk_test_x');
    expect(loadEnv({}).STRIPE_SECRET_KEY).toBeUndefined();
    expect(loadEnv({ STRIPE_SECRET_KEY: '' }).STRIPE_SECRET_KEY).toBeUndefined();
  });

  it('coerces PORT to a number', () => {
    expect(loadEnv({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a non numeric PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow();
  });

  it('keeps DATABASE_URL when set', () => {
    expect(loadEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('accepts the name the Vercel Neon integration installs', () => {
    expect(loadEnv({ KANG_TEA_DB_DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('prefers DATABASE_URL when both names are set', () => {
    const other = 'postgresql://other@db.example/other';
    expect(loadEnv({ DATABASE_URL: url, KANG_TEA_DB_DATABASE_URL: other }).DATABASE_URL).toBe(url);
  });

  it('treats an empty DATABASE_URL as unset', () => {
    expect(loadEnv({ DATABASE_URL: '' }).DATABASE_URL).toBeUndefined();
  });

  it('ignores unrelated variables', () => {
    expect(loadEnv({ HOME: '/tmp', PORT: '3000' })).toEqual({
      ALLOWED_ORIGINS: 'http://localhost:5173',
      PORT: 3000,
      DATABASE_URL: undefined,
    });
  });
});
