ALTER TABLE customer_users DROP CONSTRAINT IF EXISTS customer_users_membership_role_check;

UPDATE customer_users
SET membership_role = CASE membership_role
  WHEN 'owner' THEN 'agency_admin'
  WHEN 'admin' THEN 'manager'
  WHEN 'member' THEN 'member'
  ELSE membership_role
END;

ALTER TABLE customer_users
  ADD CONSTRAINT customer_users_membership_role_check
  CHECK (membership_role IN (
    'agency_admin',
    'manager',
    'case_worker',
    'foster_parent',
    'biological_parent',
    'gal',
    'member'
  ));
