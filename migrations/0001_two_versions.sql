CREATE TABLE IF NOT EXISTS tv_exchange (
  id TEXT PRIMARY KEY,               -- sha256(sender secret), hex
  invite_hash TEXT NOT NULL UNIQUE,  -- sha256(invite token)
  return_hash TEXT NOT NULL UNIQUE,  -- sha256(return token)
  moment TEXT NOT NULL,
  sender_text TEXT NOT NULL,
  recipient_text TEXT,
  created_at INTEGER NOT NULL,
  recipient_at INTEGER,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tv_exchange_exp ON tv_exchange(expires_at);
CREATE TABLE IF NOT EXISTS tv_rate (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tv_rate_exp ON tv_rate(expires_at);
