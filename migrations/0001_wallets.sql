CREATE TABLE IF NOT EXISTS wallets (
  external_id TEXT PRIMARY KEY,
  wallet_id TEXT UNIQUE,
  address TEXT,
  public_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
