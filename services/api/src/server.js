import express from "express";
import { randomUUID } from "node:crypto";
import { signUserToken, requireAuth } from "./auth.js";
import { attachAudit } from "./audit.js";
import { query, runMigrations } from "./db.js";
import { ensureSeedData } from "./seed.js";
import { requireRole, canAccessCase, caseRole, roleAtLeast } from "./rbac.js";

const app = express();
app.use(express.json());

const TIMELINE_TYPES = new Set(["note", "hearing", "visit", "status", "task"]);
const VALID_ROLES = new Set(["foster_parent", "biological_parent", "case_worker", "gal", "admin"]);

app.get("/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true, service: "carecircle-api", db: "up" });
});

app.get("/roles", (_req, res) => {
  res.json({ roles: Array.from(VALID_ROLES) });
});

app.post("/auth/login", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email is required" });

  const userResult = await query(
    "SELECT id, email, full_name, role FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email]
  );

  const row = userResult.rows[0];
  if (!row) {
    return res.status(404).json({ error: "No user with that email (seed users only in scaffold)" });
  }

  const user = { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
  const token = signUserToken(user);
  return res.json({ token, user });
});

app.post("/invites/accept", async (req, res) => {
  const { token, fullName } = req.body || {};
  if (!token) return res.status(400).json({ error: "token is required" });

  const inviteResult = await query(
    `SELECT id, case_id, email, role, token, status, invited_by, accepted_by, accepted_at, expires_at, created_at
     FROM case_invites WHERE token = $1 LIMIT 1`,
    [token]
  );

  const invite = inviteResult.rows[0];
  if (!invite) return res.status(404).json({ error: "Invite not found" });
  if (invite.status !== "pending") return res.status(400).json({ error: `Invite is ${invite.status}` });
  if (new Date(invite.expires_at) < new Date()) {
    await query("UPDATE case_invites SET status='expired' WHERE id=$1", [invite.id]);
    return res.status(400).json({ error: "Invite expired" });
  }

  const existingUser = await query(
    "SELECT id, email, full_name, role FROM users WHERE lower(email)=lower($1) LIMIT 1",
    [invite.email]
  );

  let user = existingUser.rows[0];
  if (!user) {
    const insertedUser = await query(
      `INSERT INTO users(id, email, full_name, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, email, full_name, role`,
      [randomUUID(), invite.email.toLowerCase(), (fullName || invite.email).trim(), invite.role]
    );
    user = insertedUser.rows[0];
  }

  await query(
    `INSERT INTO case_members(id, case_id, user_id, role)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT(case_id,user_id) DO UPDATE SET role = EXCLUDED.role`,
    [randomUUID(), invite.case_id, user.id, invite.role]
  );

  await query(
    `UPDATE case_invites
     SET status='accepted', accepted_by=$2, accepted_at=NOW()
     WHERE id=$1`,
    [invite.id, user.id]
  );

  await query(
    `INSERT INTO audit_events(id, actor_user_id, case_id, action, resource_type, resource_id, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID(),
      invite.invited_by,
      invite.case_id,
      "case_invite.accept",
      "case_invite",
      invite.id,
      { acceptedBy: user.id, email: user.email },
    ]
  );

  const authUser = { id: user.id, email: user.email, fullName: user.full_name, role: user.role };
  const authToken = signUserToken(authUser);

  return res.json({
    accepted: true,
    token: authToken,
    user: authUser,
    caseId: invite.case_id,
    membershipRole: invite.role,
  });
});

app.use(requireAuth);
app.use(attachAudit);

app.get("/me", (req, res) => res.json({ user: req.auth }));

app.get("/cases", async (req, res) => {
  const caseRows = await query(
    `SELECT c.id, c.title, c.created_at, c.created_by
     FROM cases c
     INNER JOIN case_members cm ON cm.case_id = c.id
     WHERE cm.user_id = $1
     ORDER BY c.created_at DESC`,
    [req.auth.userId]
  );

  const cases = caseRows.rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at, createdBy: r.created_by }));
  await req.audit({ action: "case.list", resourceType: "case", resourceId: "*", meta: { total: cases.length } });
  res.json({ cases });
});

app.post("/cases", requireRole("admin", "case_worker"), async (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });

  const createResult = await query(
    `INSERT INTO cases(id, title, created_by)
     VALUES ($1,$2,$3)
     RETURNING id, title, created_at, created_by`,
    [randomUUID(), title.trim(), req.auth.userId]
  );

  const record = createResult.rows[0];

  await query(
    `INSERT INTO case_members(id, case_id, user_id, role)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT(case_id,user_id) DO UPDATE SET role = EXCLUDED.role`,
    [randomUUID(), record.id, req.auth.userId, req.auth.role]
  );

  await req.audit({
    caseId: record.id,
    action: "case.create",
    resourceType: "case",
    resourceId: record.id,
    meta: { title: record.title },
  });

  return res.status(201).json({
    case: { id: record.id, title: record.title, createdAt: record.created_at, createdBy: record.created_by },
  });
});

app.post("/cases/:caseId/members", requireRole("admin", "case_worker"), async (req, res) => {
  const { caseId } = req.params;
  const canManage = req.auth.role === "admin" || (await canAccessCase(query, req.auth.userId, caseId));
  if (!canManage) return res.status(403).json({ error: "Cannot manage members for this case" });

  const { userId, role } = req.body || {};
  const userResult = await query("SELECT id FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (!userResult.rowCount) return res.status(404).json({ error: "User not found" });
  if (!VALID_ROLES.has(role)) return res.status(400).json({ error: "Invalid role" });

  const upsert = await query(
    `INSERT INTO case_members(id, case_id, user_id, role)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT(case_id,user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING id, case_id, user_id, role, added_at`,
    [randomUUID(), caseId, userId, role]
  );

  const member = upsert.rows[0];
  await req.audit({ caseId, action: "case_member.upsert", resourceType: "case_member", resourceId: member.id, meta: { userId, role } });

  return res.status(201).json({
    member: { id: member.id, caseId: member.case_id, userId: member.user_id, role: member.role, addedAt: member.added_at },
  });
});

app.get("/cases/:caseId/invites", requireRole("admin", "case_worker", "gal"), async (req, res) => {
  const { caseId } = req.params;
  if (req.auth.role !== "admin" && !(await canAccessCase(query, req.auth.userId, caseId))) {
    return res.status(403).json({ error: "Not allowed for this case" });
  }

  const result = await query(
    `SELECT id, case_id, email, role, status, invited_by, accepted_by, accepted_at, expires_at, created_at
     FROM case_invites
     WHERE case_id = $1
     ORDER BY created_at DESC`,
    [caseId]
  );

  const invites = result.rows.map((r) => ({
    id: r.id,
    caseId: r.case_id,
    email: r.email,
    role: r.role,
    status: r.status,
    invitedBy: r.invited_by,
    acceptedBy: r.accepted_by,
    acceptedAt: r.accepted_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));

  return res.json({ caseId, invites });
});

app.post("/cases/:caseId/invites", requireRole("admin", "case_worker"), async (req, res) => {
  const { caseId } = req.params;
  if (req.auth.role !== "admin" && !(await canAccessCase(query, req.auth.userId, caseId))) {
    return res.status(403).json({ error: "Not allowed for this case" });
  }

  const { email, role, expiresInDays } = req.body || {};
  if (!email || !String(email).trim()) return res.status(400).json({ error: "email is required" });
  if (!VALID_ROLES.has(role)) return res.status(400).json({ error: "Invalid role" });

  const days = Number.isFinite(Number(expiresInDays)) ? Math.max(1, Math.min(30, Number(expiresInDays))) : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const token = randomUUID();

  const inserted = await query(
    `INSERT INTO case_invites(id, case_id, email, role, token, status, invited_by, expires_at)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)
     RETURNING id, case_id, email, role, token, status, invited_by, accepted_by, accepted_at, expires_at, created_at`,
    [randomUUID(), caseId, String(email).toLowerCase().trim(), role, token, req.auth.userId, expiresAt]
  );

  const invite = inserted.rows[0];

  await req.audit({
    caseId,
    action: "case_invite.create",
    resourceType: "case_invite",
    resourceId: invite.id,
    meta: { email: invite.email, role: invite.role, expiresAt: invite.expires_at },
  });

  return res.status(201).json({
    invite: {
      id: invite.id,
      caseId: invite.case_id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      status: invite.status,
      invitedBy: invite.invited_by,
      acceptedBy: invite.accepted_by,
      acceptedAt: invite.accepted_at,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    },
  });
});

app.get("/cases/:caseId/timeline", async (req, res) => {
  const { caseId } = req.params;
  if (req.auth.role !== "admin" && !(await canAccessCase(query, req.auth.userId, caseId))) {
    return res.status(403).json({ error: "Not allowed for this case" });
  }

  const result = await query(
    `SELECT id, case_id, type, text, created_by, created_at
     FROM timeline_events
     WHERE case_id = $1
     ORDER BY created_at DESC`,
    [caseId]
  );

  const events = result.rows.map((r) => ({
    id: r.id,
    caseId: r.case_id,
    type: r.type,
    text: r.text,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));

  await req.audit({ caseId, action: "timeline.list", resourceType: "timeline_event", resourceId: "*", meta: { total: events.length } });
  return res.json({ caseId, events });
});

app.post("/cases/:caseId/timeline", async (req, res) => {
  const { caseId } = req.params;
  const memberRole = req.auth.role === "admin" ? "admin" : await caseRole(query, req.auth.userId, caseId);
  if (!memberRole) return res.status(403).json({ error: "Not allowed for this case" });
  if (!roleAtLeast(memberRole, "foster_parent")) return res.status(403).json({ error: "Role cannot post timeline events" });

  const { type, text } = req.body || {};
  if (!TIMELINE_TYPES.has(type)) {
    return res.status(400).json({ error: `type must be one of: ${Array.from(TIMELINE_TYPES).join(", ")}` });
  }
  if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });

  const inserted = await query(
    `INSERT INTO timeline_events(id, case_id, type, text, created_by)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, case_id, type, text, created_by, created_at`,
    [randomUUID(), caseId, type, text.trim(), req.auth.userId]
  );

  const event = inserted.rows[0];
  await req.audit({ caseId, action: "timeline.create", resourceType: "timeline_event", resourceId: event.id, meta: { type: event.type } });

  return res.status(201).json({
    event: {
      id: event.id,
      caseId: event.case_id,
      type: event.type,
      text: event.text,
      createdBy: event.created_by,
      createdAt: event.created_at,
    },
  });
});

app.get("/cases/:caseId/audit", async (req, res) => {
  const { caseId } = req.params;
  const memberRole = req.auth.role === "admin" ? "admin" : await caseRole(query, req.auth.userId, caseId);
  if (!memberRole || !roleAtLeast(memberRole, "gal")) {
    return res.status(403).json({ error: "Not allowed to view audit logs for this case" });
  }

  const result = await query(
    `SELECT id, actor_user_id, case_id, action, resource_type, resource_id, meta, created_at
     FROM audit_events
     WHERE case_id = $1
     ORDER BY created_at DESC`,
    [caseId]
  );

  const events = result.rows.map((r) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    caseId: r.case_id,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    meta: r.meta,
    createdAt: r.created_at,
  }));

  return res.json({ caseId, events });
});

const port = process.env.PORT || 4010;

async function bootstrap() {
  await runMigrations();
  await ensureSeedData(query);

  app.listen(port, () => {
    console.log(`CareCircle API listening on :${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start CareCircle API", err);
  process.exit(1);
});
