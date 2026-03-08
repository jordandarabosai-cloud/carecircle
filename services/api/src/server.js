import express from "express";
import { randomUUID } from "node:crypto";
import { signUserToken, requireAuth } from "./auth.js";
import { attachAudit } from "./audit.js";
import { data, createCase, createTimelineEvent } from "./data.js";
import { requireRole, canAccessCase, caseRole, roleAtLeast } from "./rbac.js";

const app = express();
app.use(express.json());

const TIMELINE_TYPES = new Set(["note", "hearing", "visit", "status", "task"]);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "carecircle-api" });
});

app.get("/roles", (_req, res) => {
  res.json({
    roles: ["foster_parent", "biological_parent", "case_worker", "gal", "admin"],
  });
});

app.post("/auth/login", (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "No user with that email (seed users only in scaffold)" });
  }

  const token = signUserToken(user);
  res.json({ token, user });
});

app.use(requireAuth);
app.use(attachAudit);

app.get("/me", (req, res) => {
  res.json({ user: req.auth });
});

app.get("/cases", (req, res) => {
  const visibleCaseIds = new Set(
    data.case_members.filter((m) => m.userId === req.auth.userId).map((m) => m.caseId)
  );

  const cases = data.cases.filter((c) => visibleCaseIds.has(c.id));
  req.audit({ action: "case.list", resourceType: "case", resourceId: "*", meta: { total: cases.length } });
  res.json({ cases });
});

app.post("/cases", requireRole("admin", "case_worker"), (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  const record = createCase({ title: title.trim(), createdBy: req.auth.userId });
  data.case_members.push({
    id: randomUUID(),
    caseId: record.id,
    userId: req.auth.userId,
    role: req.auth.role,
    addedAt: new Date().toISOString(),
  });

  req.audit({
    caseId: record.id,
    action: "case.create",
    resourceType: "case",
    resourceId: record.id,
    meta: { title: record.title },
  });

  return res.status(201).json({ case: record });
});

app.post("/cases/:caseId/members", requireRole("admin", "case_worker"), (req, res) => {
  const { caseId } = req.params;
  if (!canAccessCase(data, req.auth.userId, caseId) && req.auth.role !== "admin") {
    return res.status(403).json({ error: "Cannot manage members for this case" });
  }

  const { userId, role } = req.body || {};
  const user = data.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const allowedRoles = new Set(["foster_parent", "biological_parent", "case_worker", "gal", "admin"]);
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const existing = data.case_members.find((m) => m.caseId === caseId && m.userId === userId);
  if (existing) {
    existing.role = role;
    req.audit({
      caseId,
      action: "case_member.update",
      resourceType: "case_member",
      resourceId: existing.id,
      meta: { userId, role },
    });
    return res.json({ member: existing, updated: true });
  }

  const member = { id: randomUUID(), caseId, userId, role, addedAt: new Date().toISOString() };
  data.case_members.push(member);

  req.audit({
    caseId,
    action: "case_member.add",
    resourceType: "case_member",
    resourceId: member.id,
    meta: { userId, role },
  });

  return res.status(201).json({ member, updated: false });
});

app.get("/cases/:caseId/timeline", (req, res) => {
  const { caseId } = req.params;
  if (!canAccessCase(data, req.auth.userId, caseId) && req.auth.role !== "admin") {
    return res.status(403).json({ error: "Not allowed for this case" });
  }

  const events = data.timeline_events
    .filter((e) => e.caseId === caseId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  req.audit({
    caseId,
    action: "timeline.list",
    resourceType: "timeline_event",
    resourceId: "*",
    meta: { total: events.length },
  });

  return res.json({ caseId, events });
});

app.post("/cases/:caseId/timeline", (req, res) => {
  const { caseId } = req.params;
  const memberRole = req.auth.role === "admin" ? "admin" : caseRole(data, req.auth.userId, caseId);
  if (!memberRole) {
    return res.status(403).json({ error: "Not allowed for this case" });
  }

  if (!roleAtLeast(memberRole, "foster_parent")) {
    return res.status(403).json({ error: "Role cannot post timeline events" });
  }

  const { type, text } = req.body || {};
  if (!TIMELINE_TYPES.has(type)) {
    return res.status(400).json({ error: `type must be one of: ${Array.from(TIMELINE_TYPES).join(", ")}` });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const event = createTimelineEvent({
    caseId,
    type,
    text: text.trim(),
    createdBy: req.auth.userId,
  });

  req.audit({
    caseId,
    action: "timeline.create",
    resourceType: "timeline_event",
    resourceId: event.id,
    meta: { type: event.type },
  });

  return res.status(201).json({ event });
});

app.get("/cases/:caseId/audit", (req, res) => {
  const { caseId } = req.params;
  const memberRole = req.auth.role === "admin" ? "admin" : caseRole(data, req.auth.userId, caseId);
  if (!memberRole || !roleAtLeast(memberRole, "gal")) {
    return res.status(403).json({ error: "Not allowed to view audit logs for this case" });
  }

  const events = data.audit_events
    .filter((a) => a.caseId === caseId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return res.json({ caseId, events });
});

const port = process.env.PORT || 4010;
app.listen(port, () => {
  console.log(`CareCircle API listening on :${port}`);
});
