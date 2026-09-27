import { fetchMe, signIn, signOut, signUp, updateAccount } from '../api/client';
import type { AuthClient } from './AuthClient';

/** Accounts held by our api (Postgres on Vercel). See api/knowledge/accounts.md. */
export const apiAuthClient: AuthClient = {
  signUp: (input) => signUp(input),
  signIn: (input) => signIn(input),
  signOut: (token) => signOut(token),
  me: (token) => fetchMe(token),
  updateAccount: (token, update) => updateAccount(token, update),
};
