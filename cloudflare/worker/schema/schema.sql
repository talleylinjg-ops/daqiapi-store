-- DaqiAPI storefront D1 schema.
-- Orders are stored here; packages/catalog stay as static JSON on the CDN,
-- so only mutable data (orders, comments) needs a database.

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  package_id    TEXT NOT NULL,
  package_name  TEXT NOT NULL,
  amount_usd    REAL NOT NULL,
  email         TEXT DEFAULT '',
  product       TEXT DEFAULT 'api',
  category      TEXT DEFAULT 'token',
  plan_key      TEXT,
  status        TEXT DEFAULT 'pending',
  stripe_session TEXT,
  code          TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
