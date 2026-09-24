import { describe, expect, it } from 'vitest';
import { AccountSchema } from '../src/index';

const account = {
  displayName: 'Tristan',
  email: 'tristan@example.com',
  phone: '0400 000 000',
  marketingOptIn: false,
  createdAt: '2026-09-24T02:00:00.000Z',
};

describe('AccountSchema', () => {
  it('accepts a full profile', () => {
    expect(AccountSchema.safeParse(account).success).toBe(true);
  });

  it('accepts a profile with only a name', () => {
    const minimal = {
      displayName: 'T',
      marketingOptIn: true,
      createdAt: account.createdAt,
    };
    expect(AccountSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects a blank display name', () => {
    expect(AccountSchema.safeParse({ ...account, displayName: '   ' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(AccountSchema.safeParse({ ...account, email: 'nope' }).success).toBe(false);
  });

  it('rejects a phone that is too short', () => {
    expect(AccountSchema.safeParse({ ...account, phone: '123' }).success).toBe(false);
  });

  it('trims the display name', () => {
    expect(AccountSchema.parse({ ...account, displayName: '  Tristan  ' }).displayName).toBe(
      'Tristan',
    );
  });
});
