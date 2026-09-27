import {
  AccountSchema,
  AccountUpdateSchema,
  AuthSessionSchema,
  MeResponseSchema,
  SignInRequestSchema,
  SignUpRequestSchema,
} from '@bbt/shared';
import { Hono, type Context } from 'hono';
import { AccountsError, type AccountsProvider } from '../accounts/types.js';

const STATUS_BY_CODE = {
  'email-taken': 409,
  'invalid-credentials': 401,
  unavailable: 503,
} as const;

function bearerToken(c: Context): string | null {
  const match = c.req.header('authorization')?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

async function jsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

/** Accounts errors become their status with the message; anything else stays a 500 via onError. */
function handleAccountsError(c: Context, error: unknown): Response {
  if (error instanceof AccountsError) {
    return c.json({ error: error.message }, STATUS_BY_CODE[error.code]);
  }
  throw error;
}

/**
 * Sign up, sign in, sign out, and the signed in person's own account.
 * The webapp keeps the bearer token and sends it as `Authorization: Bearer <token>`.
 */
export const authRoutes = (accounts: AccountsProvider) => {
  const routes = new Hono();

  routes.post('/sign-up', async (c) => {
    const parsed = SignUpRequestSchema.safeParse(await jsonBody(c));
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
    }
    try {
      return c.json(AuthSessionSchema.parse(await accounts.signUp(parsed.data)), 201);
    } catch (error) {
      return handleAccountsError(c, error);
    }
  });

  routes.post('/sign-in', async (c) => {
    const parsed = SignInRequestSchema.safeParse(await jsonBody(c));
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
    }
    try {
      return c.json(AuthSessionSchema.parse(await accounts.signIn(parsed.data)));
    } catch (error) {
      return handleAccountsError(c, error);
    }
  });

  routes.post('/sign-out', async (c) => {
    const token = bearerToken(c);
    if (token) {
      try {
        await accounts.signOut(token);
      } catch (error) {
        return handleAccountsError(c, error);
      }
    }
    return c.body(null, 204);
  });

  routes.get('/me', async (c) => {
    const token = bearerToken(c);
    if (!token) return c.json({ error: 'Sign in first' }, 401);
    try {
      const me = await accounts.resolve(token);
      if (!me) return c.json({ error: 'Sign in first' }, 401);
      return c.json(MeResponseSchema.parse(me));
    } catch (error) {
      return handleAccountsError(c, error);
    }
  });

  routes.patch('/me', async (c) => {
    const token = bearerToken(c);
    if (!token) return c.json({ error: 'Sign in first' }, 401);
    const parsed = AccountUpdateSchema.safeParse(await jsonBody(c));
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
    }
    try {
      const me = await accounts.resolve(token);
      if (!me) return c.json({ error: 'Sign in first' }, 401);
      const account = await accounts.updateAccount(me.user.id, parsed.data);
      return c.json(AccountSchema.parse(account));
    } catch (error) {
      return handleAccountsError(c, error);
    }
  });

  return routes;
};
