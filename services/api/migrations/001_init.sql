CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('foster_parent','biological_parent','case_worker','gal','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_members (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('foster_parent','biological_parent','case_worker','gal','admin')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note','hearing','visit','status','task')),
  text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_members_case_id ON case_members(case_id);
CREATE INDEX IF NOT EXISTS idx_case_members_user_id ON case_members(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id_created_at ON timeline_events(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_case_id_created_at ON audit_events(case_id, created_at DESC);
