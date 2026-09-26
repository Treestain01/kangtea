import { StoreSchema } from '@bbt/shared';
import { Hono } from 'hono';
import type { Catalogue } from '../catalogue/index.js';

export const storeRoutes = (catalogue: Catalogue) =>
  new Hono().get('/', async (c) => c.json(StoreSchema.parse(await catalogue.getStore())));
