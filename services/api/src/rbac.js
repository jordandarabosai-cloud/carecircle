const roleRank = {
  biological_parent: 1,
  foster_parent: 1,
  gal: 2,
  case_worker: 3,
  admin: 4,
};

export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowed.has(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export async function canAccessCase(query, userId, caseId) {
  const result = await query(
    "SELECT 1 FROM case_members WHERE case_id = $1 AND user_id = $2 LIMIT 1",
    [caseId, userId]
  );
  return result.rowCount > 0;
}

export async function caseRole(query, userId, caseId) {
  const result = await query(
    "SELECT role FROM case_members WHERE case_id = $1 AND user_id = $2 LIMIT 1",
    [caseId, userId]
  );
  return result.rows[0]?.role || null;
}

export function roleAtLeast(role, minimumRole) {
  return (roleRank[role] || 0) >= (roleRank[minimumRole] || 0);
}
