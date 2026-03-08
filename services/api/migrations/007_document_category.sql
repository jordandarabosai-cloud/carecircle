ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'
  CHECK (category IN ('general','school','medical','court','visits'));
