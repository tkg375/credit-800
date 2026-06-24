-- Main document store (replaces all DynamoDB tables)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  user_id TEXT,
  email TEXT,
  referral_code TEXT,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_col_uid ON documents(collection, user_id);
CREATE INDEX IF NOT EXISTS idx_docs_col_email ON documents(collection, email);
CREATE INDEX IF NOT EXISTS idx_docs_col_rc ON documents(collection, referral_code);

-- Rate limiter store (replaces DynamoDB ratelimits table)
CREATE TABLE IF NOT EXISTS ratelimits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
