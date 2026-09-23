---
name: point-at-webapp
description: Use when the iOS shell must load a different webapp URL (local dev server, a Vercel preview, production). Edits the right xcconfig safely.
---

# Point At Webapp (iosapp)

## Steps

1. Decide which configuration changes:
   - `Config/Debug.xcconfig` for what runs from Xcode.
   - `Config/Release.xcconfig` for archives and TestFlight or App Store builds.

2. Edit the `WEBAPP_URL` line. Write `//` as `/$()/`:

   ```
   WEBAPP_URL = https:/$()/bbt-git-feature-x.vercel.app
   ```

   For a physical device against your Mac's dev server use the Mac's LAN IP, for example `http:/$()/192.168.1.20:5173`, and start Vite with `--host`.

3. Regenerate and rebuild with the `regenerate-project` skill (Mac). xcconfig changes are picked up on the next build without regenerating, but regenerating is cheap and removes doubt.

4. Verify the value that reached the app: with the app running in the simulator, the loaded page's origin must match. If the app shows the configuration error screen, the URL failed validation in `AppConfig`; the most common cause is a bare `//`.

5. Do not commit a Debug URL into Release, and do not commit personal LAN IPs. Revert local experiments before committing.
