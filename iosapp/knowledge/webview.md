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

## Adding a JavaScript bridge

1. Define the message schema in `packages/shared` first, so the webapp and shell agree.
2. In `WebView.makeUIView`, at the marked extension point, add a `WKScriptMessageHandler` to `configuration.userContentController` under a name such as `bbt`.
3. In the webapp, post with `window.webkit?.messageHandlers?.bbt?.postMessage(payload)` behind an `isInIosShell()` check.
4. For Swift to JavaScript, call `webView.evaluateJavaScript` from the coordinator.
5. Record the decision with the root `record-decision` skill and update `knowledge/architecture.md`.

## Not handled yet

- External links open inside the webview. Add a `decidePolicyFor` implementation to route other hosts to Safari when needed.
- No pull to refresh. Add a `UIRefreshControl` to `webView.scrollView` if wanted.
