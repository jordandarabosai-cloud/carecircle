ALTER TABLE auth_codes
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_auth_codes_user_created ON auth_codes(user_id, created_at DESC);
