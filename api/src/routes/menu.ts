import { MenuSchema } from '@bbt/shared';
import { Hono } from 'hono';
import { menu } from '../data/menu';

export const menuRoutes = new Hono().get('/', (c) => c.json(MenuSchema.parse(menu)));
