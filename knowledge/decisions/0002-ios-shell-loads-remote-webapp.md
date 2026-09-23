# 0002 iOS shell loads the remote webapp

Date: 2026-09-23
Status: Accepted

## Context

Users must be able to use the website on its own or through the iOS app.
The website must build and deploy without any involvement from the iOS app.

## Decision

The iOS app is a thin shell whose WKWebView loads the deployed website from a URL configured per build configuration.
It bundles no web assets.
Debug builds point at the local Vite dev server, Release builds at the production URL.

## Alternatives considered

- Bundle the Vite build inside the app: works offline, but every web change requires an app release and the two deploy pipelines become coupled.
- Bundle plus dev server: same coupling in release.

## Consequences

- Web updates reach iOS users instantly with no App Store release.
- The app is useless offline, so a visible offline state with retry is mandatory.
- App Store review may ask what native value the app adds beyond the website. Plan native features (push, bridge) with that in mind.
