ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS biological_mother_name TEXT,
  ADD COLUMN IF NOT EXISTS biological_father_name TEXT;

UPDATE cases
SET biological_mother_name = COALESCE(biological_mother_name, biological_parent_name)
WHERE biological_parent_name IS NOT NULL AND (biological_mother_name IS NULL OR biological_mother_name = '');

ALTER TABLE case_children
  ADD COLUMN IF NOT EXISTS age TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT;
