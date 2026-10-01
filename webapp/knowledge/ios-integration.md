# iOS Integration

## What the shell does

- Loads the site at `WEBAPP_URL` in a full screen WKWebView with no browser chrome.
- Appends `BBTiOS/<app version>` to the user agent.
  Detect it with `isInIosShell()` from `src/platform.ts`.
- Shows its own spinner until the first navigation finishes, and its own offline screen with a retry button if navigation fails.
- Places the webview edge to edge. It does not apply safe area insets.

## What the shell does not do

- It does not bundle or cache the site. If the network is down the shell shows its offline screen, not the site.
- It does not intercept links. Every navigation stays inside the webview.
- It does not call the API. All API traffic originates from the webapp's origin.

## The bridge

The shell registers one message handler, `bbt` (ADR 0021).
`src/platform.ts#postToShell` posts a `ShellMessage` from `@bbt/shared` to it and returns false without doing anything in a browser.
The app posts haptics (`components/cup/fly.ts#tap`, falling back to `navigator.vibrate`) and the active order's status for the shell's Live Activity (`AppShell` with `lib/shellOrder.ts`, ready time from the kitchen schedule).
Nothing comes back; never wait on the shell.

## Your responsibilities

- Keep `viewport-fit=cover` in `index.html` and the `env(safe-area-inset-*)` padding on `body` in `styles.css`, otherwise content sits under the notch and home indicator.
- Keep `isInIosShell()` cosmetic. Hiding a "get the app" banner is fine; gating features is not.
- Keep every page usable at 390px wide.

## Changing the user agent token

Change `IOS_SHELL_USER_AGENT_TOKEN` in `src/platform.ts` and `AppConfig.userAgentProduct` in `iosapp/BBT/AppConfig.swift` in the same commit, and update `knowledge/architecture.md` at the root.
