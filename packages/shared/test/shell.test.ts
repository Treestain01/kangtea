import { describe, expect, it } from 'vitest';
import { SHELL_MESSAGE_HANDLER, ShellMessageSchema } from '../src/index.js';

describe('ShellMessageSchema', () => {
  it('names the handler the shell registers', () => {
    expect(SHELL_MESSAGE_HANDLER).toBe('bbt');
  });

  it('accepts each kind of message', () => {
    expect(ShellMessageSchema.safeParse({ type: 'haptic', style: 'light' }).success).toBe(true);
    expect(ShellMessageSchema.safeParse({ type: 'orderEnded' }).success).toBe(true);
    expect(
      ShellMessageSchema.safeParse({
        type: 'orderStatus',
        status: 'making',
        itemName: 'Signature Fruit Tea',
        storeName: 'Calamvale Central',
        placedAt: '2026-10-02T01:00:00.000Z',
        readyAt: '2026-10-02T01:01:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects unknown types, styles and statuses', () => {
    expect(ShellMessageSchema.safeParse({ type: 'vibrate' }).success).toBe(false);
    expect(ShellMessageSchema.safeParse({ type: 'haptic', style: 'heavy' }).success).toBe(false);
    expect(
      ShellMessageSchema.safeParse({
        type: 'orderStatus',
        status: 'collected',
        itemName: 'Milo',
        storeName: 'Calamvale Central',
        placedAt: '2026-10-02T01:00:00.000Z',
        readyAt: '2026-10-02T01:01:00.000Z',
      }).success,
    ).toBe(false);
  });
});
