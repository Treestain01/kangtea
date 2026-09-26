import { serve } from '@hono/node-server';
import { createApp } from './create-app.js';
import { createCatalogue } from './catalogue/index.js';
import { loadDotEnv, loadEnv } from './env.js';

loadDotEnv();
const env = loadEnv();
const app = createApp(env, { catalogue: createCatalogue(env) });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`bbt-api listening on http://localhost:${info.port}`);
});
