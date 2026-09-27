# Pearl Loyalty Card

## The seam

`src/loyalty/LoyaltyClient.ts` is the interface: `card`, `earn`, `redeem`, each taking the bearer token.
`src/loyalty/apiLoyaltyClient.ts` implements it over `api/client.ts` (`fetchLoyaltyCard`, `earnStamps`, `redeemFreeDrink`).
`src/loyalty/testing.ts#createFakeLoyaltyClient` is the in memory version with the api's card rules, for tests.

## LoyaltyProvider and useLoyalty

`src/loyalty/LoyaltyProvider.tsx` sits inside `AuthProvider` in `main.tsx`.
It reads the session token from `useAuth()`; with no session the state is `signed-out`, otherwise it loads the card and exposes:

| Member                 | Does                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `state`                | `signed-out`, `loading`, `error` with a message, or `ready` with the card.             |
| `earnFromOrder(order)` | Posts the order's lines as stamps and stores the returned card. No op when signed out. |
| `redeem()`             | Uses one free drink. Rejects with the api's message when none is available.            |
| `refresh()`            | Loads the card again.                                                                  |

`OrderPanel` calls `earnFromOrder` when the customer taps that they have picked the drink up, after marking the order collected; a failed call is swallowed so stamps never block collecting.

## LoyaltyCard

`components/loyalty/LoyaltyCard.tsx`, on Home between Your usual and Popular now, and on the Account page under the sign in or profile block.

- Signed out: a bordered card inviting the person to sign in, linking to `/account`.
- Signed in: an accent card, "Your pearls", "n of 10" or "Card full", ten stamps five across, and one line of copy about how many more to go.
- Stamps use the `kt-stamp-empty`, `kt-stamp-full` and `kt-stamp-free` symbols from `src/assets/art/cup-parts.svg`, tinted with each stamp's drink colour. A new stamp scales in; the tenth wobbles when it unlocks. `CupSprite` is rendered once in `AppShell` so the symbols are available on every page.
- Card full: "Use my free drink" opens an in page confirmation ("Only do this at the counter"), then `redeem()`. The card resets to the next one and a visually hidden status announces it.

## Testing

`components/loyalty/LoyaltyCard.test.tsx`, `loyalty/LoyaltyProvider.test.tsx`, the loyalty block in `api/client.test.ts`, and the collect tests in `components/order/OrderPanel.test.tsx`.
Pages that show the card render inside `src/test/providers.tsx#TestProviders`, which stacks stores, catalogue, auth and loyalty with fakes.
