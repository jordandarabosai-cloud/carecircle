CREATE TABLE IF NOT EXISTS case_invites (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('foster_parent','biological_parent','case_worker','gal','admin')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by UUID NOT NULL REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_invites_case_id ON case_invites(case_id);
CREATE INDEX IF NOT EXISTS idx_case_invites_email ON case_invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_case_invites_status ON case_invites(status);
