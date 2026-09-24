import { StoreSchema } from '@bbt/shared';
import { Hono } from 'hono';
import { store } from '../data/store';

export const storeRoutes = new Hono().get('/', (c) => c.json(StoreSchema.parse(store)));
