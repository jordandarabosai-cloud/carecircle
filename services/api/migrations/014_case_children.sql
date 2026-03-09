CREATE TABLE IF NOT EXISTS case_children (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_children_case_id_sort_order
  ON case_children(case_id, sort_order, created_at);
