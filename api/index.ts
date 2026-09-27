import type { Hono } from 'hono';
import { createApp } from './src/create-app.js';
import { createDeps } from './src/deps.js';
import { loadEnv } from './src/env.js';

/**
 * Vercel entrypoint. The Hono framework preset looks for the first of
 * `{app,index,server,src/app,src/index,src/server}.ts` that imports `hono` and serves its
 * default export, so this file must stay at the project root and nothing else in that list
 * may import `hono` directly. Local development uses `src/server.ts` instead.
 */
const env = loadEnv();
const app: Hono = createApp(env, createDeps(env));

export default app;
