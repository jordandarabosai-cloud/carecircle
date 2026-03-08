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

export function canAccessCase(data, userId, caseId) {
  const member = data.case_members.find((m) => m.caseId === caseId && m.userId === userId);
  return Boolean(member);
}

export function caseRole(data, userId, caseId) {
  return data.case_members.find((m) => m.caseId === caseId && m.userId === userId)?.role || null;
}

export function roleAtLeast(role, minimumRole) {
  return (roleRank[role] || 0) >= (roleRank[minimumRole] || 0);
}
