ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_archived_at ON customers(archived_at);
