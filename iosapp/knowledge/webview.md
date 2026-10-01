# WebView

## Pieces

- `WebView.swift`: `UIViewRepresentable` around `WKWebView`. The only file importing WebKit.
- `WebViewModel.swift`: `@Observable` state machine, `loading`, `loaded`, `failed(message:)`.
- `ContentView.swift`: composes the two, overlays a spinner or `OfflineView`.
- `StatusViews.swift`: `OfflineView` (retry) and `ConfigurationErrorView` (bad `WEBAPP_URL`).

## Setup details

- `applicationNameForUserAgent` keeps WebKit's default `Mobile/<build>` token and appends `BBTiOS/<version>`.
  Replacing the default entirely makes some sites think the client is desktop.
- `scrollView.contentInsetAdjustmentBehavior = .never` so the webview does not add its own safe area padding on top of the CSS insets.
- `isOpaque = false` with a system background so the first paint matches the app background instead of flashing white.
- `allowsInlineMediaPlayback = true` so video does not force fullscreen.

## Navigation delegate

`Coordinator` implements `WKNavigationDelegate`:

- `didStartProvisionalNavigation` sets `loading`.
- `didFinish` sets `loaded`.
- `didFail` and `didFailProvisionalNavigation` set `failed` with the error's description.

## Retry

`ContentView` holds `reloadToken`.
The retry button increments it; `updateUIView` notices the change and calls `load` again.
This avoids holding a reference to the `WKWebView` in SwiftUI state.

## The JavaScript bridge (ADR 0021)

One way, webapp to shell. The schema is `packages/shared/src/shell.ts`; `ShellBridge.swift` is its Swift twin and the two change together.

- `WebView.makeUIView` registers `Coordinator.bridge` on `configuration.userContentController` under `ShellBridge.handlerName` (`bbt`); `dismantleUIView` removes it.
- The webapp posts with `postToShell` in `webapp/src/platform.ts`, which does nothing when the handler is absent.
- `ShellBridge.handle` plays haptics (`UIImpactFeedbackGenerator` for light and medium, `UINotificationFeedbackGenerator` for success) and hands `orderStatus` and `orderEnded` to `OrderActivityController`.
- `OrderActivityController` keeps the one `Activity<OrderActivityAttributes>`: started on the first status, updated on the rest, ended a minute after collection.
- `OrderActivity.swift` holds the attributes and content state and is compiled into both the app and the `BBTWidgets` extension, which draws the lock screen card and the Dynamic Island in `OrderLiveActivity.swift`.
- `Info.plist` sets `NSSupportsLiveActivities`.

To add a message: extend the Zod union, extend `ShellMessage` and its parser, add a case to `handle`, and a test to `BBTTests/ShellBridgeTests.swift`.
For Swift to JavaScript, call `webView.evaluateJavaScript` from the coordinator; nothing uses it yet.

## Not handled yet

- External links open inside the webview. Add a `decidePolicyFor` implementation to route other hosts to Safari when needed.
- No pull to refresh. Add a `UIRefreshControl` to `webView.scrollView` if wanted.
