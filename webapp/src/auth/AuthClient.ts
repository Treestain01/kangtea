import type {
  Account,
  AccountUpdate,
  AuthSession,
  MeResponse,
  SignInRequest,
  SignUpRequest,
} from '@bbt/shared';

/**
 * How the webapp signs people in and reads their account.
 *
 * This is the client side seam for swapping the authentication service. Today `apiAuthClient`
 * talks to our api, which owns the accounts. A hosted provider with its own SDK becomes another
 * implementation; pages only ever use `useAuth()`.
 */
export interface AuthClient {
  signUp(input: SignUpRequest): Promise<AuthSession>;
  signIn(input: SignInRequest): Promise<AuthSession>;
  signOut(token: string): Promise<void>;
  /** The user and account for a token. Rejects with a 401 `ApiError` when it no longer resolves. */
  me(token: string): Promise<MeResponse>;
  updateAccount(token: string, update: AccountUpdate): Promise<Account>;
}
