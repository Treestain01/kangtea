# api Knowledge Index

- [Stack](stack.md) - what is installed and why, and where each piece is configured.
- [Routing and validation](routing-and-validation.md) - how the app is assembled, how routes validate, and error shapes.
- [Deployment](deployment.md) - Vercel project settings, environment variables and how the entrypoint works.
- [Database](database.md) - Postgres on Vercel via Neon, the Drizzle schema and migrations, `seed.json`, and the seed and wipe scripts.
- [Loyalty](loyalty.md) - the `LoyaltyProvider` seam, the stamp and redemption tables, which card is shown, and the `/loyalty` routes.
- [Accounts](accounts.md) - the `AccountsProvider` seam, the Postgres implementation with scrypt and bearer sessions, and the `/auth` routes.
- [Payments](payments.md) - the `PaymentsProvider` seam over Stripe, server-side pricing, the `/payments` routes and the three amount checks.
