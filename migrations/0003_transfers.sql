CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL REFERENCES wallets(external_id),
  transaction_json TEXT NOT NULL,
  authorization_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  min_ledger INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared',
  lease_until INTEGER,
  tx_blob TEXT,
  tx_hash TEXT UNIQUE,
  result_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS transfers_owner ON transfers(external_id,created_at);
