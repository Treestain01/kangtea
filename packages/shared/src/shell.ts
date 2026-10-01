import { z } from 'zod';

/**
 * Messages the webapp posts to the iOS shell through `window.webkit.messageHandlers.bbt`.
 * The bridge is one way: the shell never replies and the webapp never waits.
 * `iosapp/BBT/ShellBridge.swift` is the Swift twin of this schema; change both together.
 */

/** The name of the WebKit message handler the shell registers. */
export const SHELL_MESSAGE_HANDLER = 'bbt';

export const HapticStyleSchema = z.enum(['light', 'medium', 'success']);
export type HapticStyle = z.infer<typeof HapticStyleSchema>;

export const ShellMessageSchema = z.discriminatedUnion('type', [
  /** A short haptic tap: light when a piece drops, medium on collect, success when a drink is ready. */
  z.object({ type: z.literal('haptic'), style: HapticStyleSchema }),
  /** The active order moved to a status, for the Live Activity. Dates are ISO strings. */
  z.object({
    type: z.literal('orderStatus'),
    status: z.enum(['received', 'making', 'ready']),
    itemName: z.string().min(1),
    storeName: z.string().min(1),
    placedAt: z.iso.datetime(),
    readyAt: z.iso.datetime(),
  }),
  /** The active order was collected or cancelled; the Live Activity ends. */
  z.object({ type: z.literal('orderEnded') }),
]);
export type ShellMessage = z.infer<typeof ShellMessageSchema>;
