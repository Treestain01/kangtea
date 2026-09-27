import {
  AccountSchema,
  AuthSessionSchema,
  MeResponseSchema,
  UserSchema,
  type Account,
  type AccountUpdate,
  type AuthSession,
  type MeResponse,
  type User,
} from '@bbt/shared';
import { randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
import { hashPassword, hashToken, newSessionToken, verifyPassword } from './crypto.js';
import { AccountsError, type AccountsProvider } from './types.js';

/** Sessions last this long from sign in. There is no sliding renewal yet. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type UserRow = typeof users.$inferSelect;

function toUser(row: UserRow): User {
  return UserSchema.parse({ id: row.id, email: row.email, createdAt: row.createdAt.toISOString() });
}

function toAccount(row: UserRow): Account {
  return AccountSchema.parse({
    displayName: row.displayName,
    email: row.email,
    ...(row.phone === null ? {} : { phone: row.phone }),
    marketingOptIn: row.marketingOptIn,
    createdAt: row.createdAt.toISOString(),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

/** Accounts and sessions in our own Postgres tables. Passwords are scrypt hashed, tokens SHA-256 hashed. */
export function createPostgresAccounts(
  db: Db,
  now: () => Date = () => new Date(),
): AccountsProvider {
  async function openSession(row: UserRow): Promise<AuthSession> {
    const token = newSessionToken();
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);
    await db.insert(sessions).values({
      tokenHash: hashToken(token),
      userId: row.id,
      createdAt,
      expiresAt,
    });
    return AuthSessionSchema.parse({
      token,
      expiresAt: expiresAt.toISOString(),
      user: toUser(row),
      account: toAccount(row),
    });
  }

  return {
    async signUp(input) {
      const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing) {
        throw new AccountsError('email-taken', 'That email is already registered');
      }
      const timestamp = now();
      const row: UserRow = {
        id: randomUUID(),
        email: input.email,
        passwordHash: await hashPassword(input.password),
        displayName: input.displayName,
        phone: null,
        marketingOptIn: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      try {
        await db.insert(users).values(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AccountsError('email-taken', 'That email is already registered');
        }
        throw error;
      }
      return openSession(row);
    },

    async signIn(input) {
      const [row] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const ok = row ? await verifyPassword(input.password, row.passwordHash) : false;
      if (!row || !ok) {
        throw new AccountsError('invalid-credentials', 'Email or password is incorrect');
      }
      return openSession(row);
    },

    async signOut(token) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    },

    async resolve(token): Promise<MeResponse | null> {
      const [hit] = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now())))
        .limit(1);
      if (!hit) return null;
      return MeResponseSchema.parse({ user: toUser(hit.user), account: toAccount(hit.user) });
    },

    async updateAccount(userId, update: AccountUpdate) {
      const [row] = await db
        .update(users)
        .set({
          displayName: update.displayName,
          phone: update.phone ?? null,
          marketingOptIn: update.marketingOptIn,
          updatedAt: now(),
        })
        .where(eq(users.id, userId))
        .returning();
      if (!row) {
        throw new Error(`No user ${userId} to update`);
      }
      return toAccount(row);
    },
  };
}
