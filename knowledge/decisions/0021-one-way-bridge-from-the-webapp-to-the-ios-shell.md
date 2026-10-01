# 0021 One way bridge from the webapp to the iOS shell

Date: 2026-10-02
Status: Accepted

## Context

The shell was a plain WKWebView with no JavaScript bridge (ADR 0002), and the site had to behave identically in a browser and in the shell.
Two things the app now does cannot be done from the web: a haptic tap when a pearl drops or a drink is ready, and a Live Activity on the lock screen and in the Dynamic Island while the kitchen works.
The agency has no iOS specialist, and this repo cannot be built on Windows, so the shell work is written without a build.

## Decision

A one way bridge: the webapp posts small messages to `window.webkit.messageHandlers.bbt` and never waits for a reply.
The schema lives in `packages/shared/src/shell.ts` (`ShellMessageSchema`): `haptic` with a style, `orderStatus` with the status, first drink, store and ready time, and `orderEnded`.
`iosapp/BBT/ShellBridge.swift` is its Swift twin; the two change together.

- The webapp posts through `platform.ts#postToShell`, which does nothing when the handler is absent, so a browser is unaffected.
- `AppShell` posts the active order's status whenever it changes, with the ready time from the kitchen schedule, and `orderEnded` when it is collected or cancelled.
- Haptics are posted beside the web fallbacks: `navigator.vibrate` where it exists, and the cup sounds.
- The shell drives `UIImpactFeedbackGenerator` and `UINotificationFeedbackGenerator` for haptics, and `OrderActivityController` starts, updates and ends one `Activity<OrderActivityAttributes>`.
- A widget extension target, `BBTWidgets`, renders the activity: a cup that fills toward ready, the drink and store, a live countdown, and compact and minimal Dynamic Island forms.

## Alternatives considered

- Keep the shell dumb and use web APIs only: the Vibration API does not exist on iOS Safari and there is no web equivalent of a Live Activity.
- A two way bridge with replies: nothing in the product needs an answer from the shell yet, and a one way stream keeps the site identical in browsers.
- Push based Live Activity updates: orders are local first (ADR 0009), so the only source of status is the webapp itself; push can come when the server owns orders.

## Consequences

- `isInIosShell()` stays cosmetic; features gate on the handler's presence, not the user agent.
- The shell gained its first capability that is not plain web viewing, so `knowledge/architecture.md` and `iosapp/knowledge/webview.md` describe the bridge.
- The Swift side is unverified until it is built on a Mac with `regenerate-project`; `BBTTests/ShellBridgeTests.swift` covers the message parsing.
- When orders move to the server, the Live Activity should be driven by push updates and the `orderStatus` message becomes a fallback.
