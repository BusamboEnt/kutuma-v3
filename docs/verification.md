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

## RLUSD trust-line milestone (2026-10-15)
- Official Ripple XRPL developer documentation pins testnet issuer `rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV` and hex currency `524C555344000000000000000000000000000000`. Read-only validated account_info confirmed that issuer on testnet.
- TrustSet reviews use the stored owner address, fixed issuer/currency/limit, NoRipple flag, dynamic XRP reserve/fee checks, and the existing Privy user-approval and persisted receipt flow.
- Ledger balance lookup requires validated account_lines, checks exact issuer/currency, handles pagination and issuer freeze/authorization restrictions, and never converts RPC failure into zero.
- Signed-in RLUSD displays verified test tokens or an unchecked dash. Setup does not mint tokens. Ripple's external test-token faucet is linked; no token faucet API is assumed.
- Full email-authenticated Privy approval and testnet TrustSet still need a signed-in user test. No wallet or on-chain transaction was created by automated checks. RLUSD payments and mobile-money payouts remain unavailable.
- All 23 backend tests passed, including an encoded TrustSet signed by a local test key through mocked Privy/ledger calls and insufficient-reserve/existing-line rejection. Synthetic Cloudflare browser checks at 320×568 found no scrolling or clipped buttons on setup, review, ready and compact account screens; live RLUSD fixture replaced the sample dollar balance. Unauthenticated live `/api/rlusd` returned 401. These checks do not substitute for a real Privy session.

## RLUSD sending milestone (2026-10-15)
- Direct holder-to-holder payments use the pinned official testnet issuer/currency, exact Amount and SendMax, and no partial-payment flag or custom paths. The backend accepts up to nine whole digits and six decimals, with exact decimal comparisons against ledger balances and recipient limits.
- Recipient activation/trust line, freezes (including deep freeze), issuer authorization, transfer-rate changes, destination tags, validated deposit authorization, XRP reserve and capped fee are checked before review. An issuer transfer rate other than parity pauses sending rather than hiding an extra charge. Issuer redemption is outside this flow.
- The same user-approved saved payload, signed-blob verification, idempotent submission and validated-ledger receipts serve XRP, RLUSD and trust-line setup. Receipts retain RLUSD units; token/XRP balances refresh after terminal results.
- 30 backend tests passed, including local-key signing against mocked Privy/ledger responses, exact decimal headroom, changed transfer fees, restricted recipients and failed ledger execution. No automated real signing or testnet transfers were performed; full Privy approval still needs a signed-in user test.
- Protocol reference checked: https://xrpl.org/docs/references/protocol/transactions/types/payment (SendMax includes transfer fees; exact delivery requires omitting tfPartialPayment).
- Synthetic Cloudflare Browser Rendering checks at 320×568 passed without overflow or clipped controls for RLUSD form, review (maximum supported amount and destination tag), pending/validated receipts, mixed-asset history and ready screen. The request carried RLUSD, displayed exact token units, and closed the native dialog before mock approval; confirmation ran once. These checks used fixtures, not a real authenticated transfer.

## Recent live testnet activity (2026-10-15)
- Authenticated GET `/api/activity` binds all queries to the stored owner wallet. It combines up to 40 recent validated account_tx entries with 40 saved app receipts, deduplicates hashes and returns at most 60 recent records. This is a bounded recent view, not a complete historical export.
- Includes XRP and official-issuer RLUSD incoming/outgoing payments, RLUSD trust-line changes, and local unapproved/pending/failed/expired attempts. Up to eight pending hashes are reconciled per refresh; refresh never signs, submits or creates a wallet.
- Incoming partial payments use delivered_amount; unavailable delivered values stay unknown rather than using an inflated requested Amount. Unvalidated entries, imitation issuers, unrelated transactions and failed incoming payments are excluded. XRP Ledger API-v1 and v2 JSON shapes are supported.
- Ledger outages are explicitly flagged; saved receipts remain visible. Signed-in users never see the sample balances or activity; samples remain in the signed-out preview. Late responses after session changes are ignored, and activity stays in memory rather than localStorage.
- All 37 backend tests passed. Synthetic browser checks at 320×568 and 390×844 passed for no sample leakage while signed in, pagination, exact received amounts, receipt details, offline preservation, session disposal and sign-out. No scrolling or clipped controls were found. The parser was also checked against a read-only real testnet account_tx response.
- Full Privy email-authenticated testing remains a user step. No automated on-chain transactions, wallet creation or approval were performed.
