# 0010 Drink customisations as menu level options

Date: 2026-09-24
Status: Accepted

## Context

Customers choose sugar level, ice level and toppings for every drink.
The choices are the same across the menu at Kang Tea, toppings carry their own prices, and past orders must keep showing what was chosen even if the options change.

## Decision

`Menu` carries one `customisations` block: `sugarLevels` and `iceLevels` as single-select lists with exactly one default each, and `toppings` with a price per topping.
An `OrderLine` records the choices as generic `{ name, value }` pairs (`Sugar`, `Ice`, one `Topping` entry per topping) and folds topping prices into `unitPriceCents`.
Cart lines are identified by drink plus customisations (`lineKey`), so the same drink with different choices is a separate line.
The dialog is the native `<dialog>` element.

## Alternatives considered

- Options per drink: more faithful if some drinks exclude ice or sugar, but every drink would repeat the same lists today. Per-drink exceptions can be added to `MenuItem` later without changing the line shape.
- Structured customisation fields on the line (`sugarLevelId`, `iceLevelId`, `toppingIds`): tighter typing, but History would need the menu to render names, and ids would break when options are renamed.
- Toppings as separate cart lines: simpler pricing, but a topping is not a drink and cannot be ordered alone.
- A modal library: the native element already handles focus, Escape and the backdrop.

## Consequences

- Adding a size group is a data and dialog change, not a contract redesign.
- `summariseCustomisations` is the one place that turns pairs into text.
- The option lists are placeholders until the shop confirms them, like the prices.
