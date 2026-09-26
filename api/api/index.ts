import { handle } from 'hono/vercel';
import { createApp } from '../src/app';
import { createCatalogue } from '../src/catalogue';
import { loadEnv } from '../src/env';

const env = loadEnv();

export default handle(createApp(env, { catalogue: createCatalogue(env) }));
