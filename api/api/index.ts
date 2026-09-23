import { handle } from 'hono/vercel';
import { createApp } from '../src/app';
import { loadEnv } from '../src/env';

export default handle(createApp(loadEnv()));
