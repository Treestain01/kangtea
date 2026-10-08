import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Vitest runs with globals off, so React Testing Library cannot register its own
// automatic cleanup. Without this, every render leaks into the next test.
afterEach(() => {
  cleanup();
});

// Vite feeds the developer's .env.local into import.meta.env, so a real Stripe key on the machine
// would flip every test into payments-on. Tests start payments-off; a test that wants them on
// stubs the key itself (and its own unstub restores this default, not the machine's value).
beforeEach(() => {
  vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');
});
