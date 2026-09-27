import { MenuSchema } from '@bbt/shared';
import { Hono } from 'hono';
import type { Catalogue } from '../catalogue/types.js';

export const menuRoutes = (catalogue: Catalogue) =>
  new Hono().get('/', async (c) => c.json(MenuSchema.parse(await catalogue.getMenu())));
