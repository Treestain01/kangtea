import { describe, expect, it } from 'vitest';
import {
  AccountUpdateSchema,
  AuthSessionSchema,
  SignInRequestSchema,
  SignUpRequestSchema,
} from '../src/index.js';

describe('SignUpRequestSchema', () => {
  it('normalises the email and keeps the display name rules', () => {
    const parsed = SignUpRequestSchema.parse({
      email: '  Tristan@Example.com ',
      password: 'correct horse',
      displayName: '  Tristan ',
    });
    expect(parsed.email).toBe('tristan@example.com');
    expect(parsed.displayName).toBe('Tristan');
  });

  it('rejects a short password with a readable message', () => {
    const result = SignUpRequestSchema.safeParse({
      email: 't@example.com',
      password: 'short',
      displayName: 'T',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Use at least 8 characters');
    }
  });

  it('rejects a malformed email', () => {
    expect(
      SignInRequestSchema.safeParse({ email: 'nope', password: 'correct horse' }).success,
    ).toBe(false);
  });
});

describe('AccountUpdateSchema', () => {
  it('does not let a person change their email or creation date', () => {
    expect(Object.keys(AccountUpdateSchema.shape).sort()).toEqual([
      'displayName',
      'marketingOptIn',
      'phone',
    ]);
  });
});

describe('AuthSessionSchema', () => {
  it('carries the token, expiry, user and account', () => {
    const result = AuthSessionSchema.safeParse({
      token: 'opaque',
      expiresAt: '2026-10-27T00:00:00.000Z',
      user: { id: 'u1', email: 't@example.com', createdAt: '2026-09-27T00:00:00.000Z' },
      account: {
        displayName: 'Tristan',
        email: 't@example.com',
        marketingOptIn: false,
        createdAt: '2026-09-27T00:00:00.000Z',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty token', () => {
    const result = AuthSessionSchema.safeParse({
      token: '',
      expiresAt: '2026-10-27T00:00:00.000Z',
      user: { id: 'u1', email: 't@example.com', createdAt: '2026-09-27T00:00:00.000Z' },
      account: { displayName: 'T', marketingOptIn: false, createdAt: '2026-09-27T00:00:00.000Z' },
    });
    expect(result.success).toBe(false);
  });
});
