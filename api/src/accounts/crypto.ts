import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** `scrypt$<salt>$<key>`, both base64url. The prefix lets a future scheme coexist. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

/** Constant time comparison against a stored hash. Unknown schemes never verify. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 256 bits of randomness, URL safe. Sent to the client once and never stored as is. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** What the database keeps instead of the token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
