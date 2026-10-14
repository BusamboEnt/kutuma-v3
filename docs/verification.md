# Browser verification

Cloudflare Browser Rendering loaded the deployed app at 320×568 and 390×844 in mobile mode with fonts loaded.

Both sizes passed viewport-fit checks for wallet, activity, settings, send choice, recipient, amount, transfer review, mobile country, phone, amount, review, Buy, Deposit and Pay. The checks found no scrolling or horizontally overflowing layouts and no clipped buttons, inputs or principal content. The first 320×568 Buy check found a clipped Continue button; compact-height spacing was corrected and the entire check passed on rerun.

Interaction checks passed: the 1.5k preset sets 1500, the Buy form accepts a valid-format recipient and reaches the honest pending-quote preview, and confirming a simulated RLUSD send updates the demo balance by the correct amount.

These checks do not verify real Privy authentication, ledger transactions, RLUSD balances, partner quotes or payouts. Real-device software keyboard and enlarged-font behavior remain to be tested.

## Privy authentication integration

Vite production build passed using Privy React SDK 3.49.0. The deployed origin returns HTTP 200. Cloudflare Browser Rendering at 390×844 confirmed SDK readiness, enabled sign-in controls, the Kutuma-branded Privy modal and an email input after clicking Sign in. The app container had no vertical overflow. Public Privy app configuration confirmed email enabled, the deployment origin allowed, and automatic wallet creation off.

No OTP was requested or entered during verification. Login completion, authenticated session restoration and sign-out require the owner's email test. XRPL wallet creation and signing are not enabled, and no production or testnet wallet has been created.
