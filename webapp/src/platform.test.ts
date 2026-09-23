import { describe, expect, it } from 'vitest';
import { isInIosShell } from './platform';

const safariUa =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('isInIosShell', () => {
  it('is true when the BBTiOS token is present', () => {
    expect(isInIosShell(`${safariUa} BBTiOS/1.0.0`)).toBe(true);
  });

  it('is false for plain Safari', () => {
    expect(isInIosShell(safariUa)).toBe(false);
  });

  it('defaults to the browser user agent', () => {
    expect(isInIosShell()).toBe(false);
  });
});
