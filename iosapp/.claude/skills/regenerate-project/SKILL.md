---
name: regenerate-project
description: Use on a Mac after changing project.yml, an xcconfig, or adding or removing Swift files in iosapp. Regenerates BBT.xcodeproj with XcodeGen and builds and tests in the simulator.
---

# Regenerate Project (iosapp)

## Steps

1. Ensure XcodeGen is installed: `xcodegen --version`. If missing: `brew install xcodegen`.

2. From `iosapp/`:

   ```bash
   xcodegen generate
   ```

   Expected: `Created project at .../BBT.xcodeproj`. Errors here are almost always YAML indentation or an unknown setting key in `project.yml`.

3. Build and test in the simulator:

   ```bash
   xcodebuild -scheme BBT -destination 'platform=iOS Simulator,name=iPhone 16' test
   ```

   Expected: `** TEST SUCCEEDED **`. Substitute an installed simulator name if iPhone 16 is unavailable (`xcrun simctl list devices available`).

4. For a manual run, `open BBT.xcodeproj`, choose the `BBT` scheme and a simulator, press Run.
   With the Debug configuration the app loads http://localhost:5173, so start `pnpm dev` at the repo root first.

5. Confirm `git status` shows no `BBT.xcodeproj`. It is gitignored; if it appears, the ignore file was changed.

## On Windows

You cannot run steps 1 to 4.
Validate the inputs instead and report "Not verified: iosapp build (Windows)":

```powershell
pnpm dlx js-yaml iosapp/project.yml | Out-Null
[xml](Get-Content iosapp/BBT/Info.plist -Raw) | Out-Null
```
