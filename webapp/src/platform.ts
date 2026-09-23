/** Product token the iOS shell appends to its WKWebView user agent, for example "BBTiOS/1.0.0". */
export const IOS_SHELL_USER_AGENT_TOKEN = 'BBTiOS/';

/** True when the page is running inside the Kang Tea iOS app. The site must work identically either way. */
export function isInIosShell(userAgent: string = navigator.userAgent): boolean {
  return userAgent.includes(IOS_SHELL_USER_AGENT_TOKEN);
}
