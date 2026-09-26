# 0016 Theme choice as a device preference

Date: 2026-09-26
Status: Accepted

## Context

The webapp followed the device's light or dark setting through `prefers-color-scheme` and offered no way to override it.
Tristan asked for a light and dark toggle on the Account page.
The account itself is local first with a shared contract (ADR 0009) and does not exist until the person saves a name, while a theme choice should work for everyone and survive "Clear my data".

## Decision

The choice is a three way preference, `system`, `light` or `dark`, stored on the device in a new `preferences` store (`kangtea.preferences`) beside cart, orders and account, and not in the account contract.
`src/theme/theme.ts` reflects it as `data-theme` on `<html>`: an explicit choice sets the attribute and `system` removes it.
`tokens.css` applies the dark palette in two places, under the media query for `:root:not([data-theme='light'])` and unconditionally for `:root[data-theme='dark']`, and `tokens.test.ts` fails if the two blocks differ or if any other stylesheet checks the scheme.
The Account page shows the three options as a radio group styled as chips and saves on change; there is no separate save step.

## Alternatives considered

- A field on `Account` in `packages/shared`: a device preference is not profile data, would be wiped with the profile, and would need an account to exist before the theme could be changed.
- A two state light or dark switch: loses the ability to follow the device, which is what every current user has today.
- Resolving the effective theme in JavaScript and setting `data-theme` to `light` or `dark` always: needs an inline script in `index.html` to avoid a flash and a `matchMedia` listener, and breaks the rule that only the store layer touches `localStorage`. Duplicating thirteen declarations under a test is simpler.
- Reading the preference in components: components read tokens and never check the scheme, which is what makes the palette swap safe.

## Consequences

- Adding a colour token now means adding it in three places in `tokens.css`; the guard test reports a miss.
- `bindTheme` runs in `main.tsx` before the first render, so a saved dark choice paints dark without a flash in practice.
- `Clear my data` leaves the theme alone, on purpose.
- If preferences ever move to the server, the store's shape is already validated by `PreferencesSchema` and can be lifted into `packages/shared` then.
