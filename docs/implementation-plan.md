# Privy + XRPL wallet implementation plan

Reviewed 14 October 2026 using Cloudflare Browser Rendering against the official documentation and public reference app.

## Verified sources

- Privy XRPL overview: https://docs.privy.io/wallets/using-wallets/xrpl/overview
- Privy pricing and FAQ: https://www.privy.io/pricing
- Ripple USD overview: https://ripple.com/products/stablecoin/
- Reference app's public screen: https://app.minisend.xyz/
- User-provided Minisend Buy crypto screenshot.

## Privy wallet lifecycle

The Node SDK `@privy-io/node` creates an XRPL wallet with `privy.wallets().create({chain_type: 'xrpl'})`. Creation returns an r-address and compressed public key. The minimal documentation example does not assign a user owner; production must use verified ownership/authorization configuration rather than blindly copying the example as user wallet provisioning.

Wallet keys and addresses can exist before the account exists on the ledger. Privy's current page lists a 1 XRP base reserve to activate an account; production must query network reserve settings rather than hardcode them. Privy free-tier access does not pay ledger reserves or transaction fees.

Transactions are prepared and autofilled with xrpl.js, encoded with `SigningPubKey` and `encodeForSigning`, signed through `xrpl_signTransaction`, then submitted to XRPL. A submission result is not a final payment receipt: track validated ledger inclusion and final outcome before showing completion. Policy evaluation supports Payment, OfferCreate, OfferCancel and TrustSet; rules can constrain destinations and native or issued-token amounts. Key export supports hex private keys and BIP-39 seed phrases, not native XRPL family seeds.

## Free allowance and provisioning

The user reports 500 free wallet creations. Treat 500 as an initial rollout ceiling until account-specific terms are checked. Privy's public pricing describes approximately 500 monthly active users, not a lifetime wallet-creation allotment. Its rendered page shows both 'up to 500' and a tier table with free 0–499 / Core 500–2,499, so verify the exact boundary in the dashboard. Track active users, signing usage and transaction volume separately.

Create one wallet per authenticated user on demand, persist the Privy wallet ID/address/public key association, and reuse it after sign-in. Serialize provisioning and use a unique user-wallet constraint to avoid duplicate wallets from retries. Preview visits, route changes and reconnects must never create wallets. Add quota observability and a configurable pilot cap. No live wallets are created by this prototype.

## Stablecoin direction

RLUSD is the chosen prototype denomination, based on Ripple's official USD stablecoin offering and confirmed XRPL support. This is a design choice, not a claim that Privy issues RLUSD, supplies liquidity, or makes it redeemable for every visitor. RLUSD is distinct from XRP. XRP remains necessary for network fees and account reserves even when everyday balances are in stablecoins.

Before live RLUSD support, verify the authoritative XRPL issuer and currency code for each network, trust line setup and reserve requirements, recipient eligibility, issuer flags, precision, liquidity and provider support. Obtain explicit user approval for trust line setup and any reserve funding. Keep exact decimal/token quantities rather than JavaScript floating-point balances in the production ledger. Do not synthesize quotes, exchange rates or yield. Display separate available balance and reserved XRP.

## Mobile UX

One compact home screen with balance, asset picker, Send / Buy / Pay / Deposit, a single mobile money entry point, one recent item and persistent bottom navigation. Activity is paginated. Send uses recipient / amount / review. Mobile money uses country / phone / amount / review. Buy uses the user's reference composition: stacked You pay / Receive panels, denomination selectors, amount presets, destination and Continue. Currency options are planning inputs, not verified supported payment corridors.

Use dynamic viewport units and safe-area insets, test all essential controls within the viewport, and preserve native dialog/keyboard access. Avoid body scrolling at standard mobile sizes; permit accessible overflow when enlarged text or the software keyboard requires it rather than clipping form controls. Dark styling, generous rounded panels and a single primary action follow the screenshot. Payouts, buying, merchant payments and deposits remain explicitly pending integrations.

## Next implementation prerequisites

Privy app ID, server-held app secret, verified user wallet ownership flow, testnet setup, token issuer verification, persisted wallet-to-user records and server-side authorization. Funding and payout partners can be attached later. Do not expose secrets in static JavaScript or ask the user to paste secrets into chat.

## Privy authentication implementation

The supplied public App ID is connected through `PrivyProvider` and email-only login. Server public app configuration confirms email authentication, the deployment domain and automatic EVM/Solana wallet creation disabled. The React bridge waits for `ready`, exposes sign-in/account/sign-out states and keeps the preview funds explicitly separate from authentication. The server App Secret is still required for user-owned XRPL provisioning; no wallet creation endpoint or transaction signing has been enabled.

## Testnet provisioning implementation

Cloudflare D1 now stores hashed user-specific external IDs, Privy wallet IDs and addresses. The Worker verifies ES256 JWT signature, audience, issuer, expiration and subject before reading or creating a wallet. User identity is never accepted from request JSON. Wallet creation assigns `owner.user_id` from the verified subject. The encrypted secret stays server-side. The atomic pilot quota includes pending reservations; failed attempts retain their slot for reconciliation. No XRP is funded, no account is activated and no signing endpoint is exposed. Keys are chain-specific rather than intrinsically testnet-only, so the interface explicitly designates the address for testnet and prohibits real deposits.

## Testnet activation

The authenticated API reads only the stored user's wallet address. GET /api/wallet/balance queries account_info on the official testnet endpoint with ledger_index=validated. POST /api/wallet/activate first checks account state; only an unactivated wallet can request faucet funding. A conditional D1 timestamp update imposes a ten-minute cooldown. Faucet receipt addresses are checked, and ledger confirmation is queried separately. Requests never contact mainnet. The frontend activates on explicit button presses and keeps live test XRP separate from sample RLUSD. Late responses do not reopen closed dialogs. Signing and transfers are still disabled.

## Test XRP transfers

Preparation stores a server-built Payment and Privy authorization payload under an authenticated owner. It checks address checksum, destination requirements, current fee and retained reserve using validated testnet state. The frontend owner approves the exact URL, body, idempotency key and request expiry through useAuthorizationSignature. The backend checks the returned signed blob against the prepared bytes, fences late signing responses and persists the blob before submitting. D1 prevents concurrent signing/submission for the same wallet. Final status is based on validated ledger metadata; uncertain outcomes remain pending. User-specific recent receipts support refresh and retry of the same hash. Mainnet, stablecoin sending and SADC payouts remain disabled.
