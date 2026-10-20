# Testnet acceptance and recovery

App: https://sawa-wallet-demo-20261014.kutuma-lab.workers.dev/

Current checkpoint: 20 October 2026. This guide is for user-performed acceptance tests. Automated tests and a reachable app do not prove that real Privy approval works.

## Current verification

- App returned HTTP 200; unauthenticated Activity returned 401.
- All 37 backend checks passed again.
- Read-only aggregate storage inspection showed one ready wallet and no saved transaction attempts. No new wallet, funding request, signature or transaction was created by these checks.

## 1. Restore the existing account

1. Sign in with the same email used to create the wallet.
2. Open Account and record the public testnet address privately.
3. Sign out. In a private browser window, sign in using that same email.
4. Confirm that Account shows the identical address and any existing ledger balances/history. Login alone must not create another wallet.

A passing result verifies session restoration with the same account. It does not prove recovery after permanently losing access to the email, account deletion, or a different Privy user ID. Kutuma currently offers email login only and does not expose an independent recovery or wallet-export flow. Resolve those product requirements before mainnet launch. Keep login codes, access tokens and private keys out of chat and source control.

## 2. Activate and test XRP approval

1. Account → Testnet balance & activation → Refresh balance.
2. If inactive, request Activate with test XRP, then refresh until the account is active and shows a validated balance. Funding is explicit and limited to one request per ten minutes.
3. Use a second email account in a separate browser profile to explicitly create and activate the recipient wallet. This consumes one additional pilot slot; do not reset or delete the existing wallet.
4. From the sender, select XRP → Send and enter the second wallet address and 1 test XRP.
5. Review the amount, fee and reserve. Cancel Privy approval once and verify there is no completed transfer. A saved unapproved review is not a payment.
6. Start a fresh review, approve with Privy, and refresh status until the ledger confirms the outcome. Compare sender/recipient balances and Activity. The sender pays the network fee in addition to the amount.

Do not retry by creating a second payment while the first is uncertain. Use its saved status or the same signed submission retry. Record the public hash and exact error if a step fails; no secrets are needed for diagnosis.

## 3. Test official test RLUSD

1. In each account, Account → Test RLUSD → Set up test RLUSD.
2. Review the fixed official issuer, receive limit, XRP fee and retained reserve; approve the trust line and refresh until verified.
3. Use the linked external Ripple test-token faucet if available. Setup alone does not mint tokens. If the external faucet is unavailable, record the blocker rather than treating setup as funding.
4. Refresh the sender's verified RLUSD balance and send 0.01 test RLUSD to the recipient wallet.
5. Verify confirmed receipts and the delivered amount in both accounts' Activity. Refresh the RLUSD balance in each account and compare the changes. XRP pays the transaction fee separately.
6. Reload and repeat the same-account sign-in check: address and confirmed activity must remain available.

## Completion evidence

Record pass/fail for same-address restoration, XRP approval cancellation, confirmed XRP sending, both trust lines, RLUSD funding, confirmed RLUSD sending, recipient activity and refreshed balances. A public transaction hash is sufficient ledger evidence. Real-device keyboard and enlarged-text layout checks remain separate.

## Launch blockers outside this test

Lost-email recovery/secondary authentication, wallet export/support policy, independent security review, mainnet reserve/fee funding and fiat funding-provider coverage remain unverified. These tests use valueless testnet tokens only and do not enable mainnet or fiat transfers.

References reviewed: https://docs.privy.io/authentication/user-authentication/login-methods/email and https://docs.privy.io/wallets/using-wallets/xrpl/overview.
