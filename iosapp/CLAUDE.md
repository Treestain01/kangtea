# iosapp

## Purpose

The native iOS shell for BBT.
SwiftUI app whose single screen is a WKWebView loading the deployed `webapp`.
No product UI lives here; the shell owns configuration, loading state, the offline screen, and the user agent token.

## Commands (Mac only)

- `brew install xcodegen` once.
- `cd iosapp; xcodegen generate` - produces `BBT.xcodeproj` from `project.yml`. Re-run after any change to `project.yml`, xcconfig files, or when files are added or removed.
- `open BBT.xcodeproj` and run the `BBT` scheme, or `xcodebuild -scheme BBT -destination 'platform=iOS Simulator,name=iPhone 16' test`.
- Debug builds load http://localhost:5173, so run `pnpm dev` at the repo root first.
- This project cannot be built or tested on Windows. Validate `project.yml`, `Info.plist` and asset JSON parse, then say so in your report.

## Rules

- Never commit `BBT.xcodeproj`. It is generated and gitignored.
- The web URL is set only in `Config/Debug.xcconfig` and `Config/Release.xcconfig` as `WEBAPP_URL`. Never hardcode a URL in Swift.
- In xcconfig, write URLs as `https:/$()/host` because `//` starts a comment.
- Only `AppConfig.swift` reads `Info.plist`. Only `WebView.swift` imports WebKit.
- Keep `ContentView` edge to edge; safe areas are the webapp's job.
- Swift 5.10, strict concurrency, `@MainActor` on anything touching WebKit or view state.
- Changing the user agent token also changes `webapp/src/platform.ts`. Do both in one commit.

## Where to look

- `knowledge/INDEX.md` - start here.
- `knowledge/configuration.md` - the xcconfig to Info.plist to runtime flow and its gotchas.
- `knowledge/webview.md` - how the webview is wired and where a JS bridge would go.
- Skills: `.claude/skills/regenerate-project`, `.claude/skills/point-at-webapp`.
- Agency agents: `front-end-engineer` for UI, `architect` for the shell to web contract. The agency has no iOS specialist; say so in reports.
