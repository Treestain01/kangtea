import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseAllowedOrigins, type Env } from './env';
import { healthRoutes } from './routes/health';
import { menuRoutes } from './routes/menu';
import { storeRoutes } from './routes/store';

/** Builds the Hono application. Pure with respect to env so tests can construct it directly. */
export function createApp(env: Env): Hono {
  const app = new Hono();

  app.use('*', cors({ origin: parseAllowedOrigins(env.ALLOWED_ORIGINS) }));

  app.route('/health', healthRoutes);
  app.route('/store', storeRoutes);
  app.route('/menu', menuRoutes);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
