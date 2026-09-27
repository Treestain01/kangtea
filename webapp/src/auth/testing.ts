import type { Account, AuthSession, MeResponse, User } from '@bbt/shared';
import { ApiError } from '../api/client';
import type { AuthClient } from './AuthClient';

interface FakeUser {
  user: User;
  account: Account;
  password: string;
}

/** An in memory `AuthClient` with the same status codes as the api, for page tests. */
export function createFakeAuthClient(now = () => new Date('2026-09-27T01:00:00.000Z')) {
  const users = new Map<string, FakeUser>();
  const sessions = new Map<string, string>();
  let counter = 0;

  const open = (entry: FakeUser): AuthSession => {
    counter += 1;
    const token = `token-${counter}`;
    sessions.set(token, entry.user.id);
    return {
      token,
      expiresAt: new Date(now().getTime() + 30 * 86_400_000).toISOString(),
      user: entry.user,
      account: entry.account,
    };
  };

  const resolve = (token: string): FakeUser => {
    const id = sessions.get(token);
    const entry = id ? [...users.values()].find((u) => u.user.id === id) : undefined;
    if (!entry) throw new ApiError(401, 'Sign in first');
    return entry;
  };

  const client: AuthClient = {
    async signUp(input) {
      if (users.has(input.email)) throw new ApiError(409, 'That email is already registered');
      const createdAt = now().toISOString();
      const entry: FakeUser = {
        user: { id: `user-${users.size + 1}`, email: input.email, createdAt },
        account: {
          displayName: input.displayName,
          email: input.email,
          marketingOptIn: false,
          createdAt,
        },
        password: input.password,
      };
      users.set(input.email, entry);
      return open(entry);
    },
    async signIn(input) {
      const entry = users.get(input.email);
      if (!entry || entry.password !== input.password) {
        throw new ApiError(401, 'Email or password is incorrect');
      }
      return open(entry);
    },
    async signOut(token) {
      sessions.delete(token);
    },
    async me(token): Promise<MeResponse> {
      const entry = resolve(token);
      return { user: entry.user, account: entry.account };
    },
    async updateAccount(token, update) {
      const entry = resolve(token);
      entry.account = {
        ...entry.account,
        displayName: update.displayName,
        marketingOptIn: update.marketingOptIn,
        ...(update.phone === undefined ? {} : { phone: update.phone }),
      };
      if (update.phone === undefined) delete entry.account.phone;
      return entry.account;
    },
  };

  return {
    client,
    /** Ends every session, as if the api had expired them. */
    expireAll() {
      sessions.clear();
    },
    users,
  };
}
