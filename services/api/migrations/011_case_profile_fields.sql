ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS child_first_name TEXT,
  ADD COLUMN IF NOT EXISTS child_last_name TEXT,
  ADD COLUMN IF NOT EXISTS biological_parent_name TEXT,
  ADD COLUMN IF NOT EXISTS foster_parent_name TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_priority_check;
ALTER TABLE cases ADD CONSTRAINT cases_priority_check CHECK (priority IN ('low','normal','high','urgent'));

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (status IN ('open','active','closed'));
