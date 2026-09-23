import { HealthResponseSchema, type HealthResponse } from '@bbt/shared';
import { Hono } from 'hono';

export const healthRoutes = new Hono().get('/', (c) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'bbt-api',
    timestamp: new Date().toISOString(),
  };
  // Parsing on the way out guarantees the response matches the shared contract.
  return c.json(HealthResponseSchema.parse(body));
});
