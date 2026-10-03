# Pearl Loyalty Card

## The seam

`src/loyalty/LoyaltyClient.ts` is the interface: `card`, `earn`, `redeem`, each taking the bearer token.
`src/loyalty/apiLoyaltyClient.ts` implements it over `api/client.ts` (`fetchLoyaltyCard`, `earnStamps`, `redeemFreeDrink`).
`src/loyalty/testing.ts#createFakeLoyaltyClient` is the in memory version with the api's card rules, for tests.

## LoyaltyProvider and useLoyalty

`src/loyalty/LoyaltyProvider.tsx` sits inside `AuthProvider` in `main.tsx`.
It reads the session token from `useAuth()`; with no session the state is `signed-out`, otherwise it loads the card and exposes:

| Member                 | Does                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `state`                | `signed-out`, `loading`, `error` with a message, or `ready` with the card.               |
| `earnFromOrder(order)` | Posts the order's lines as stamps and stores the returned card. No op when signed out.   |
| `redeem()`             | Uses one free drink. Called by the order panel at place; rejects when none is available. |
| `refresh()`            | Loads the card again.                                                                    |

`OrderPanel` calls `earnFromOrder` when the customer taps that they have picked the drink up; a failed call is swallowed so stamps never block collecting. A free drink on the order (`order.freeDrink`) earns no stamp; the paid drinks do.

## LoyaltyCard

`components/loyalty/LoyaltyCard.tsx`, on Home between Your usual and Popular now, and on the Account page under the sign in or profile block.

- Signed out: a bordered card inviting the person to sign in, linking to `/account`.
- Signed in: an accent card, "Your pearls", "n of 10" for the card being filled now, ten stamps five across, and one line of copy about how many more to go.
- While a finished card waits (`card.complete`), a note above the stamps says there is a free drink to claim and that it comes off the next order with toppings still charged (ADR 0023). There is no redeem button; the order panel redeems when the order is placed.
- Stamps use the `kt-stamp-empty`, `kt-stamp-full` and `kt-stamp-free` symbols from `src/assets/art/cup-parts.svg`, tinted with each stamp's drink colour. A new stamp scales in; the tenth wobbles when it unlocks. `CupSprite` is rendered once in `AppShell` so the symbols are available on every page.
- The moment a card fills while the person is looking, pearls rain down the card once (`components/cup/celebrate.ts#rainPearls`) and the free cup glows and wobbles. Nothing happens for a card that was already full on load, or under reduced motion.
- Signed in with stamps, "See what filled the card" flips the card over to a list of the drinks behind each stamp, with a swatch in each drink's colour, and "Back to the card" flips it back. Both faces share one grid cell; the face turned away is `inert`. Under reduced motion the faces swap without turning.
- `compact`: one row of ten small stamps with the count and no copy, rendered under the order panel for signed in people; it is the landing spot for the pearl that drops on collect (see `orders.md`). It renders nothing while signed out, loading or in error.

## PearlJar

`components/loyalty/PearlJar.tsx`, on the Account page under the card: every stamp ever earned (`card.earned`) as pearls in a jar, up to 104 drawn, with the count beside it and the weekly streak from `lib/streak.ts#weeklyStreak` when it is two weeks or more.
A streak is consecutive weeks with a collected order on this device, ending this week or last, so it survives until Sunday.
Pearls earned since the last render drop in. Nothing renders while signed out.

## Testing

`components/loyalty/LoyaltyCard.test.tsx`, `loyalty/LoyaltyProvider.test.tsx`, the loyalty block in `api/client.test.ts`, and the collect tests in `components/order/OrderPanel.test.tsx`.
Pages that show the card render inside `src/test/providers.tsx#TestProviders`, which stacks stores, catalogue, auth and loyalty with fakes.
