import type {
  Account,
  AccountUpdate,
  AuthSession,
  MeResponse,
  SignInRequest,
  SignUpRequest,
} from '@bbt/shared';

/**
 * Where user accounts live and how people prove who they are.
 *
 * This is the seam for swapping account storage or the authentication service: the routes in
 * `src/routes/auth.ts` and the webapp only know this interface and the shared contract.
 * Today the implementation is `createPostgresAccounts` over the Neon database on Vercel.
 * A hosted provider (Neon Auth, Clerk, Better Auth) becomes another file implementing this.
 */
export interface AccountsProvider {
  /** Creates the account and opens a session. Throws `AccountsError('email-taken')` if the email exists. */
  signUp(input: SignUpRequest): Promise<AuthSession>;
  /** Opens a session. Throws `AccountsError('invalid-credentials')` for a wrong email or password. */
  signIn(input: SignInRequest): Promise<AuthSession>;
  /** Ends the session for this token. Unknown tokens are ignored. */
  signOut(token: string): Promise<void>;
  /** Resolves a bearer token to its user and account, or null when unknown or expired. */
  resolve(token: string): Promise<MeResponse | null>;
  /** Changes the person's own profile fields. */
  updateAccount(userId: string, update: AccountUpdate): Promise<Account>;
}

export type AccountsErrorCode = 'email-taken' | 'invalid-credentials' | 'unavailable';

/** The only error the routes translate into a status code; anything else is a 500. */
export class AccountsError extends Error {
  constructor(
    readonly code: AccountsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AccountsError';
  }
}
