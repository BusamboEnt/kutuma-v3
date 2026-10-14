# Kutuma v3 wallet prototype

A compact dark mobile wallet designed for Privy + XRP Ledger and RLUSD, with planned SADC mobile money support.

Live demo: https://sawa-wallet-demo-20261014.kutuma-lab.workers.dev

Open `dist/index.html` or serve `dist/` with a static server. No build is required. All balances and transactions are sample data. Wallet sends modify only browser-local demo state. Buy and mobile money previews do not persist recipient details or send any request. Live sign-in, deposits, signing, funding and payouts are not connected.

The main screen is sized to the mobile viewport, with Send / Buy / Pay / Deposit and bottom navigation. Activity uses pagination. Forms use focused steps. The Buy preview follows the supplied dark Minisend screen with paired payment/receive panels and amount presets. RLUSD is the default demo asset; XRP can be selected separately.

See `docs/implementation-plan.md` for verified Privy/XRPL capabilities, free-tier interpretation, RLUSD setup requirements and provisioning constraints. Privy's public free tier is based on monthly active users; the user-provided 500-wallet allowance remains a pilot assumption pending account confirmation.
