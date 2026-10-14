# Browser verification

Cloudflare Browser Rendering loaded the deployed app at 320×568 and 390×844 in mobile mode with fonts loaded.

Both sizes passed viewport-fit checks for wallet, activity, settings, send choice, recipient, amount, transfer review, mobile country, phone, amount, review, Buy, Deposit and Pay. The checks found no scrolling or horizontally overflowing layouts and no clipped buttons, inputs or principal content. The first 320×568 Buy check found a clipped Continue button; compact-height spacing was corrected and the entire check passed on rerun.

Interaction checks passed: the 1.5k preset sets 1500, the Buy form accepts a valid-format recipient and reaches the honest pending-quote preview, and confirming a simulated RLUSD send updates the demo balance by the correct amount.

These checks do not verify real Privy authentication, ledger transactions, RLUSD balances, partner quotes or payouts. Real-device software keyboard and enlarged-font behavior remain to be tested.

## Privy authentication integration

Vite production build passed using Privy React SDK 3.49.0. The deployed origin returns HTTP 200. Cloudflare Browser Rendering at 390×844 confirmed SDK readiness, enabled sign-in controls, the Kutuma-branded Privy modal and an email input after clicking Sign in. The app container had no vertical overflow. Public Privy app configuration confirmed email enabled, the deployment origin allowed, and automatic wallet creation off.

No OTP was requested or entered during verification. Login completion, authenticated session restoration and sign-out require the owner's email test. XRPL wallet creation and signing are not enabled, and no production or testnet wallet has been created.

## XRPL testnet provisioning backend

Five backend tests pass: absent/forged/cross-origin authentication rejected; GET performs no provisioning; verified owner assigned with repeat reuse; 500 reserved pilot slots block new creation; interrupted upstream creation recovered by external ID. Client build and bundled Worker build passed.

Deployed unauthenticated and forged-token requests both return 401. The deployed Worker retains an encrypted `secret_text` binding for PRIVY_APP_SECRET and the D1 database binding. At 320×568, Privy initializes and the email sign-in modal opens; the wallet container has no scrolling. First browser check observed the modal while its lazy-loaded UI was still loading; waiting for the email input confirmed success.

A live authenticated creation was not performed because it requires the owner's email verification. No wallet or quota slot was consumed during these checks. No faucet funding, activation, trust line or transaction submission is implemented.

## Testnet activation and live XRP display

All nine provisioning and testnet tests pass. Tests cover exact drop formatting, validated balance requirements, network failures staying unavailable rather than zero, already-active accounts skipping faucet calls, owner-address-only funding and a ten-minute cooldown. Both production builds pass.

A read-only lookup of the existing wallet on the official testnet endpoint returned validated `actNotFound`, indicating that activation was still needed at check time. No automatic funding was performed.

Browser verification at 320×568 confirmed SDK readiness, no home scrolling, and 401 responses for unauthenticated balance and activation endpoints. The actual activation screen function was exercised with synthetic account state and no access token: no clipped controls or scrolling. A synthetic live XRP balance of 20.123456 rendered as 20.12 with an XRP testnet / Live balance label. These UI checks did not execute authenticated faucet funding. The owner should test Activate with test XRP and refresh to confirm the actual validated deposit.

## Test XRP transfers

Sixteen backend checks pass (five provisioning, four activation/balance and seven transfer checks). Transfer tests use locally generated test keys and mocked network endpoints: they verify exact decimal conversion, recipient checksum, tag and reserve guards, owner isolation, short-lived authorization payloads, reuse of an identical signed blob, transaction hash parity with xrpl.js, pending versus validated results, validated failure handling, expired reviews, and rejection of approvals that arrive after expiry. The production Worker uses the standard XRPL SHA-512Half transaction hash with the TXN prefix, cross-checked against xrpl.js using an actual signed fixture.

The authenticated real Privy signing flow and testnet payment still require the owner's email session. No faucet or transfer was automatically triggered in testing.

At 320×568, browser QA initialized Privy and received 401 for unauthenticated transfer preparation. The actual transfer UI function was exercised with synthetic tokens, approval and API responses: form, tagged-recipient review, pending receipt, validated receipt and history had no scrolling or clipped controls. Pending and validated text matched their fixtures. This did not generate a real Privy authorization signature or submit a testnet payment. The final frontend invalidates the cached balance on submission and refreshes it after a terminal ledger result.
