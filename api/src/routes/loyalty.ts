import { EarnStampsRequestSchema, LoyaltyCardSchema } from '@bbt/shared';
import { Hono, type Context } from 'hono';
import type { AccountsProvider } from '../accounts/types.js';
import { AccountsError } from '../accounts/types.js';
import type { Catalogue } from '../catalogue/types.js';
import { LoyaltyError, type LoyaltyProvider, type StampInput } from '../loyalty/types.js';

/** Used when a drink has left the menu since it was ordered: the Kang Tea navy. */
const FALLBACK_STAMP_COLOUR = '#084986';

const STATUS_BY_CODE = { 'nothing-to-redeem': 409, unavailable: 503 } as const;

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

function handleError(c: Context, error: unknown): Response {
  if (error instanceof LoyaltyError) {
    return c.json({ error: error.message }, STATUS_BY_CODE[error.code]);
  }
  if (error instanceof AccountsError && error.code === 'unavailable') {
    return c.json({ error: error.message }, 503);
  }
  throw error;
}

/**
 * The pearl loyalty card. Every route needs a signed in person.
 * Colours for new stamps come from the current menu, so the card shows the drink as it looked.
 */
export const loyaltyRoutes = (
  accounts: AccountsProvider,
  loyalty: LoyaltyProvider,
  catalogue: Catalogue,
) => {
  const routes = new Hono();

  const resolveUser = async (c: Context) => {
    const token = bearerToken(c);
    return token ? accounts.resolve(token) : null;
  };

  routes.get('/card', async (c) => {
    try {
      const me = await resolveUser(c);
      if (!me) return c.json({ error: 'Sign in first' }, 401);
      return c.json(LoyaltyCardSchema.parse(await loyalty.card(me.user.id)));
    } catch (error) {
      return handleError(c, error);
    }
  });

  routes.post('/stamps', async (c) => {
    try {
      const me = await resolveUser(c);
      if (!me) return c.json({ error: 'Sign in first' }, 401);
      const parsed = EarnStampsRequestSchema.safeParse(await jsonBody(c));
      if (!parsed.success) {
        return c.json({ error: 'Invalid request', issues: parsed.error.issues }, 400);
      }
      const menu = await catalogue.getMenu();
      const colourOf = (itemId: string) =>
        menu.items.find((item) => item.id === itemId)?.colour ?? FALLBACK_STAMP_COLOUR;
      const stamps: StampInput[] = parsed.data.lines.flatMap((line, index) =>
        Array.from({ length: line.quantity }, (_, n) => ({
          key: `${parsed.data.orderId}:${index}:${n}`,
          itemId: line.itemId,
          itemName: line.name,
          colour: colourOf(line.itemId),
        })),
      );
      return c.json(LoyaltyCardSchema.parse(await loyalty.earn(me.user.id, stamps)));
    } catch (error) {
      return handleError(c, error);
    }
  });

  routes.post('/redeem', async (c) => {
    try {
      const me = await resolveUser(c);
      if (!me) return c.json({ error: 'Sign in first' }, 401);
      return c.json(LoyaltyCardSchema.parse(await loyalty.redeem(me.user.id)));
    } catch (error) {
      return handleError(c, error);
    }
  });

  return routes;
};
