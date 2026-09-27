import type { AccountUpdate, AuthSession, SignInRequest, SignUpRequest } from '@bbt/shared';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { useStores } from '../store/StoresProvider';
import { useSession } from '../store/hooks';
import type { AuthClient } from './AuthClient';

export interface Auth {
  /** The current session, or null when signed out. */
  session: AuthSession | null;
  signUp(input: SignUpRequest): Promise<void>;
  signIn(input: SignInRequest): Promise<void>;
  signOut(): Promise<void>;
  updateAccount(update: AccountUpdate): Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

type AuthProviderProps = {
  client: AuthClient;
  children: ReactNode;
};

/**
 * Owns the session: signs in through the `AuthClient`, keeps the result in the session store,
 * and on start checks a stored session is still valid, dropping it if the api says 401.
 */
export function AuthProvider({ client, children }: AuthProviderProps) {
  const stores = useStores();
  const session = useSession();

  useEffect(() => {
    const stored = stores.session.read();
    if (!stored) return;
    let cancelled = false;
    client
      .me(stored.token)
      .then((me) => {
        if (!cancelled) stores.session.save({ ...stored, ...me });
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          stores.session.clear();
        }
        // Any other failure (offline, 5xx) keeps the session; the next start tries again.
      });
    return () => {
      cancelled = true;
    };
    // Runs once per app start; later sessions come from signIn and signUp below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Auth>(
    () => ({
      session,
      async signUp(input) {
        stores.session.save(await client.signUp(input));
      },
      async signIn(input) {
        stores.session.save(await client.signIn(input));
      },
      async signOut() {
        const current = stores.session.read();
        stores.session.clear();
        if (current) {
          await client.signOut(current.token).catch(() => undefined);
        }
      },
      async updateAccount(update) {
        const current = stores.session.read();
        if (!current) throw new Error('Sign in first');
        const account = await client.updateAccount(current.token, update);
        stores.session.save({ ...current, account });
      },
    }),
    [client, session, stores],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return auth;
}
