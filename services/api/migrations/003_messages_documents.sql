CREATE TABLE IF NOT EXISTS case_messages (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_documents (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('all','professionals_only','parents_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_messages_case_id_created_at ON case_messages(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id_created_at ON case_documents(case_id, created_at DESC);
