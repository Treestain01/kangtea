# Project Generation

`project.yml` is the source of truth for `BBT.xcodeproj`.
XcodeGen reads it and writes the project; the project is never edited by hand and never committed.

## Anatomy

- `options`: bundle id prefix, iOS 17 deployment target, intermediate groups so folders map to Xcode groups.
- `configs`: `Debug` and `Release`.
- `configFiles`: maps each config to `Config/<Config>.xcconfig`. This is where `WEBAPP_URL` comes from.
- `settings.base`: Swift 5.10, version numbers, automatic signing, strict concurrency.
- `targets.BBT`: the app. Sources are everything under `BBT/`. Uses the hand written `BBT/Info.plist` (`GENERATE_INFOPLIST_FILE: NO`).
- `targets.BBTWidgets`: the widget extension holding the order Live Activity. Sources under `BBTWidgets/` plus `BBT/OrderActivity.swift`, which both targets compile. `BBT` depends on it so Xcode embeds it.
- `targets.BBTTests`: XCTest bundle depending on `BBT`. Sources under `BBTTests/`. Uses `@testable import BBT`.
- `schemes.BBT`: builds both, runs Debug, tests Debug, archives Release.

## Adding a Swift file

Put it under `BBT/` (or `BBTTests/` for tests) and run `xcodegen generate`.
Folder based sources mean no per-file registration.

## Adding a Swift package dependency

```yaml
packages:
  SomeLib:
    url: https://github.com/org/somelib
    from: "1.0.0"
targets:
  BBT:
    dependencies:
      - package: SomeLib
```

Then regenerate.

## Adding a capability or entitlement

Add an `entitlements` block to the target with a path to a `.entitlements` file you create, and regenerate.
Record why in an ADR if it affects the shell's contract with the webapp.
