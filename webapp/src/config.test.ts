import { describe, expect, it } from 'vitest';
import { kitchenSchedule } from './config';

describe('kitchenSchedule', () => {
  it('defaults to 20 seconds to making and 60 to ready', () => {
    expect(kitchenSchedule({})).toEqual({ makingAfterMs: 20_000, readyAfterMs: 60_000 });
  });

  it('takes the seconds from the environment', () => {
    expect(
      kitchenSchedule({ VITE_KITCHEN_MAKING_SECONDS: '2', VITE_KITCHEN_READY_SECONDS: '5' }),
    ).toEqual({ makingAfterMs: 2_000, readyAfterMs: 5_000 });
  });

  it('never lets ready come before making', () => {
    expect(
      kitchenSchedule({ VITE_KITCHEN_MAKING_SECONDS: '30', VITE_KITCHEN_READY_SECONDS: '5' }),
    ).toEqual({ makingAfterMs: 30_000, readyAfterMs: 30_000 });
  });

  it('ignores values that are not non negative numbers', () => {
    expect(
      kitchenSchedule({ VITE_KITCHEN_MAKING_SECONDS: 'fast', VITE_KITCHEN_READY_SECONDS: '-1' }),
    ).toEqual({ makingAfterMs: 20_000, readyAfterMs: 60_000 });
  });

  it('allows zero for an order that is ready straight away', () => {
    expect(
      kitchenSchedule({ VITE_KITCHEN_MAKING_SECONDS: '0', VITE_KITCHEN_READY_SECONDS: '0' }),
    ).toEqual({ makingAfterMs: 0, readyAfterMs: 0 });
  });
});
