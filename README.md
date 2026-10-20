# Kutuma v3

A compact mobile wallet for Privy + XRP Ledger and RLUSD, with planned SADC mobile money support.

App: https://sawa-wallet-demo-20261014.kutuma-lab.workers.dev
Repository: https://github.com/BusamboEnt/kutuma-v3

## Development

`npm ci` then `npm run dev`. Build with `npm run build`; Vite emits `dist/`. Source lives in `index.html` and `src/`. `.env.example` documents the public Privy app identifier; never place an App Secret in a `VITE_` variable.

## Privy sign-in

The React SDK initializes with the supplied App ID. Sign in / Get wallet opens Privy's email authentication UI. Authenticated visitors can inspect their account and sign out. Buttons wait for SDK readiness; errors offer a retry. Both Ethereum and Solana automatic wallet creation are disabled. No wallet is created by visits, login, reconnect or preview navigation. Create testnet wallet is an explicit Account action.

Email authentication and the deployed domain were confirmed against Privy's public application configuration. Full email OTP completion must be checked by the app owner using their own email. No session tokens are logged or placed in the wallet UI.

## Current wallet behavior

Signed-in users can create one user-owned XRPL wallet, activate it with test XRP, check validated XRP/RLUSD balances, approve testnet sends and inspect recent activity. Sample balances and simulated sends remain in the signed-out preview only. Mainnet funding, fiat on/off ramps and mobile money payouts are not connected. Do not send real funds.

The backend verifies Privy access tokens, assigns the verified user as wallet owner and persists the address in Cloudflare D1. Deterministic unique external IDs plus idempotency keys recover retries without creating duplicates. An atomic 500-slot pilot cap counts both completed and pending provisioning attempts. `PRIVY_APP_SECRET` is held as an encrypted Cloudflare Worker secret. Do not paste this secret into chat or commit it to Git. See `docs/implementation-plan.md` for ownership, reserve and stablecoin requirements.

## Hosting

`wrangler.jsonc` declares the existing Cloudflare Worker and static build directory. The connected Cloudflare API can upload the build via the assets manifest and short-lived upload-session helpers in `scripts/`. Uploaded authorization is passed through stdin and must not be logged. Generated `dist/` is excluded from source control.

## Backend checks

`npm test` runs 37 backend checks covering authentication, wallet reuse/quota, activation, XRP/RLUSD signing, recipient restrictions and real-ledger activity parsing. `npm run build:worker` emits the bundled Worker. For a new D1 database, apply all numbered SQL migrations in `migrations/` in order to the binding declared in `wrangler.jsonc`. The production assets and backend are deployed together, preserving encrypted secrets.

## Testnet activation and balances

From Account, open Testnet balance & activation. Refresh checks the validated XRPL testnet ledger. If the account is unfunded, Activate with test XRP requests free, valueless tokens from the testnet faucet for the stored authenticated wallet address. Requests are limited to one per ten minutes and skip the faucet for already active accounts. A faucet response is not treated as a validated deposit. No faucet funding occurs automatically. Selecting XRP displays the validated testnet balance after a successful refresh. Official-issuer RLUSD balances and sending are also available after trust-line setup.

## Sending test XRP

Select XRP and tap Send, or open Account → Testnet balance & activation → Send test XRP. Enter a different testnet r-address, amount and destination tag if required. The server checks checksum, activation, deposit authorization, network fee, sender reserve and recipient base reserve. Review the amount, fee and reserve, then approve the exact Privy request through the owner-signature hook. Approval expires after two minutes and the transaction also has a bounded LastLedgerSequence.

The server validates the signed blob against the prepared payload before persisting and submitting it to the fixed testnet endpoint. Expired or superseded signing requests cannot be persisted or submitted. One in-flight signing/submission per wallet is permitted. Retrying reuses the same signed blob and ledger hash. Receipts stay pending until a validated ledger reports the final result. Recent testnet transfers are stored in D1 and can be revisited after reloading. Signed-in Activity combines those receipts with recent validated deposits and sends.

No mainnet sending or real stablecoin transfer has been enabled. The full owner-approval flow needs the app owner to test with their email and a recipient testnet address. No user transfer is submitted automatically by deployment or verification.

RLUSD testnet: open Account → Test RLUSD (or Deposit → Test RLUSD setup & balance). Activate with test XRP first, review the trust-line fee/reserve, then approve with Privy. Refresh setup status until ledger validation, then verify the balance. Setup alone adds no tokens; the screen links Ripple's external test-token faucet. RLUSD testnet sending is available from Send with RLUSD selected, or Account → Test RLUSD → Send test RLUSD. Both wallets need the official trust line; the backend checks balances, recipient limits, restrictions and XRP fees. Review and Privy approval are required. Mobile-money payouts still need a partner. Official testnet issuer reference: https://docs.ripple.com/products/stablecoin/developer-resources/rlusd-on-the-xrpl.

Signed-in Activity now combines recent validated XRP/RLUSD deposits and sends from XRPL testnet with this wallet's saved pending/failed/setup receipts. Tap a row for status, amount and a testnet explorer link. Refresh reconciles pending receipts without signing or resubmitting. The view is a bounded recent window (40 ledger entries and 40 app records, merged to at most 60 rows), not a complete historical export. Ledger failures are explicitly labelled; sample balances/activity remain only in the signed-out preview.

## Signed-in acceptance and recovery testing

Follow [the testnet acceptance guide](docs/testnet-acceptance.md) for the two-wallet transfer and same-account session-restoration checks. Re-authentication with the same Privy user reuses the stored wallet; recovery after permanent loss of the only email login, an independent recovery method and an end-user wallet-export flow are not yet implemented or verified.
