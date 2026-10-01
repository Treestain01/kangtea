import { SHELL_MESSAGE_HANDLER, type ShellMessage } from '@bbt/shared';

/** Product token the iOS shell appends to its WKWebView user agent, for example "BBTiOS/1.0.0". */
export const IOS_SHELL_USER_AGENT_TOKEN = 'BBTiOS/';

/** True when the page is running inside the Kang Tea iOS app. The site must work identically either way. */
export function isInIosShell(userAgent: string = navigator.userAgent): boolean {
  return userAgent.includes(IOS_SHELL_USER_AGENT_TOKEN);
}

type MessageHandler = { postMessage(message: unknown): void };
export type ShellWindow = {
  webkit?: { messageHandlers?: Record<string, MessageHandler | undefined> };
};

/**
 * Posts a message to the iOS shell's bridge (ADR 0021). One way: nothing comes back.
 * Returns false, and does nothing else, wherever the shell has not registered the handler,
 * so a browser never notices. Never throws.
 */
export function postToShell(
  message: ShellMessage,
  win: ShellWindow = typeof window === 'undefined' ? {} : (window as ShellWindow),
): boolean {
  const handler = win.webkit?.messageHandlers?.[SHELL_MESSAGE_HANDLER];
  if (!handler) return false;
  try {
    handler.postMessage(message);
    return true;
  } catch {
    return false;
  }
}
