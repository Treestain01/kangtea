# 0003 XcodeGen for the iOS project

Date: 2026-09-23
Status: Accepted

## Context

Development happens largely on Windows where Xcode does not run.
`project.pbxproj` files are opaque, merge badly and are error prone to hand edit.

## Decision

Describe the Xcode project in `iosapp/project.yml` and generate `BBT.xcodeproj` with `xcodegen generate` on a Mac.
The generated project is gitignored.

## Alternatives considered

- Commit a hand written `.xcodeproj`: cannot be validated on Windows and produces unreadable diffs.
- Tuist: more capable but heavier for a single target app.

## Consequences

- Every Mac that builds the app needs `brew install xcodegen`.
- Target settings live in a readable YAML file agents can edit safely.
- `project.yml` can be validated as YAML on any machine, but only a Mac proves it builds.
