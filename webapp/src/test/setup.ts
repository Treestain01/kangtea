import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs with globals off, so React Testing Library cannot register its own
// automatic cleanup. Without this, every render leaks into the next test.
afterEach(() => {
  cleanup();
});
