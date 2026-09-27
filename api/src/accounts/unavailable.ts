import { AccountsError, type AccountsProvider } from './types.js';

/** Stands in when there is no database: every call fails with a 503 rather than a crash. */
export function createUnavailableAccounts(): AccountsProvider {
  const fail = () =>
    Promise.reject(new AccountsError('unavailable', 'Accounts need a database. Set DATABASE_URL.'));
  return {
    signUp: fail,
    signIn: fail,
    signOut: fail,
    resolve: fail,
    updateAccount: fail,
  };
}
