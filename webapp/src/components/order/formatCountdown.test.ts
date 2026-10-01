import { describe, expect, it } from 'vitest';
import { formatCountdown } from './OrderPanel';

describe('formatCountdown', () => {
  it('rounds up to the next second and pads seconds', () => {
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(59_001)).toBe('1:00');
    expect(formatCountdown(5_400)).toBe('0:06');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-10)).toBe('0:00');
  });
});
