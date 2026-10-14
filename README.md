# Kutuma v3

A compact mobile wallet for Privy + XRP Ledger and RLUSD, with planned SADC mobile money support.

App: https://sawa-wallet-demo-20261014.kutuma-lab.workers.dev
Repository: https://github.com/BusamboEnt/kutuma-v3

## Development

`npm ci` then `npm run dev`. Build with `npm run build`; Vite emits `dist/`. Source lives in `index.html` and `src/`. `.env.example` documents the public Privy app identifier; never place an App Secret in a `VITE_` variable.

## Privy sign-in

The React SDK initializes with the supplied App ID. Sign in / Get wallet opens Privy's email authentication UI. Authenticated visitors can inspect their account and sign out. Buttons wait for SDK readiness; errors offer a retry. Both Ethereum and Solana automatic wallet creation are disabled. No wallet is created by visits, login, reconnect or preview navigation.

Email authentication and the deployed domain were confirmed against Privy's public application configuration. Full email OTP completion must be checked by the app owner using their own email. No session tokens are logged or placed in the wallet UI.

## Current wallet behavior

All balances and transactions remain sample data, including after sign-in. Demo sends change only browser-local sample state. Funding, deposits, XRP Ledger wallet provisioning, signing and mobile money payouts are not connected. The App ID alone cannot authorize server-side XRPL wallet creation.

Next step: store `PRIVY_APP_SECRET` securely as a Cloudflare Worker secret, then implement verified user-owned XRPL testnet provisioning and persistence. Do not paste this secret into chat or commit it to Git. See `docs/implementation-plan.md` for ownership, reserve and stablecoin requirements.

## Hosting

`wrangler.jsonc` declares the existing Cloudflare Worker and static build directory. The connected Cloudflare API can upload the build via the assets manifest and short-lived upload-session helpers in `scripts/`. Uploaded authorization is passed through stdin and must not be logged. Generated `dist/` is excluded from source control.
