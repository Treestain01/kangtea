# Configuration

## Flow

```
Config/Debug.xcconfig       WEBAPP_URL = http:/$()/localhost:5173
Config/Release.xcconfig     WEBAPP_URL = https:/$()/REPLACE_WITH_PRODUCTION_HOST
        |
        v  (build setting)
BBT/Info.plist              <key>WEBAPP_URL</key><string>$(WEBAPP_URL)</string>
        |
        v  (runtime)
AppConfig.load()            Bundle.main.object(forInfoDictionaryKey: "WEBAPP_URL")
        |
        v
ContentView(config:)        WebView(url: config.webAppURL, ...)
```

## Gotchas

- `//` starts a comment in xcconfig. `WEBAPP_URL = https://host` yields `https:`. Write `https:/$()/host`; `$()` expands to nothing.
- `AppConfig` rejects anything that is not `http` or `https` with a host, so the mistake above shows `ConfigurationErrorView` instead of a blank screen.
- `Info.plist` is one file for all configurations. Anything that must differ per configuration goes through a build setting like `WEBAPP_URL`.
- `NSAllowsLocalNetworking` in `Info.plist` permits plain HTTP to localhost and LAN addresses in every configuration. It has no effect on production HTTPS traffic and Apple does not require justification for it.
- Version and build come from `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in `project.yml`. `AppConfig.appVersion` reads `CFBundleShortVersionString`, which is `MARKETING_VERSION`.

## Adding a setting

1. Add `NAME = value` to both xcconfig files.
2. Add `<key>NAME</key><string>$(NAME)</string>` to `Info.plist`.
3. Read it in `AppConfig.load()` and validate it. Throw an `AppConfigError` case if it is invalid.
4. Add a test in `BBTTests/AppConfigTests.swift`.
5. Document it in the flow above and in `knowledge/architecture.md` at the root if the webapp depends on it.
