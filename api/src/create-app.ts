import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Catalogue } from './catalogue/index.js';
import { parseAllowedOrigins, type Env } from './env.js';
import { healthRoutes } from './routes/health.js';
import { menuRoutes } from './routes/menu.js';
import { storeRoutes } from './routes/store.js';

/** Everything the routes read from. Entrypoints build it from env; tests pass fakes. */
export interface AppDeps {
  catalogue: Catalogue;
}

/** Builds the Hono application. Pure with respect to env and storage so tests can construct it. */
export function createApp(env: Env, deps: AppDeps): Hono {
  const app = new Hono();

  app.use('*', cors({ origin: parseAllowedOrigins(env.ALLOWED_ORIGINS) }));

  app.route('/health', healthRoutes);
  app.route('/store', storeRoutes(deps.catalogue));
  app.route('/menu', menuRoutes(deps.catalogue));

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
