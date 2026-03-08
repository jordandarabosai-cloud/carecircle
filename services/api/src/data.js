import { randomUUID } from "node:crypto";

const now = () => new Date().toISOString();

export const data = {
  users: [
    { id: "u-admin", email: "admin@carecircle.dev", fullName: "Alex Admin", role: "admin" },
    { id: "u-worker", email: "worker@carecircle.dev", fullName: "Case Worker Kim", role: "case_worker" },
    { id: "u-foster", email: "foster@carecircle.dev", fullName: "Foster Parent Sam", role: "foster_parent" },
    { id: "u-bio", email: "bio@carecircle.dev", fullName: "Bio Parent Lee", role: "biological_parent" },
    { id: "u-gal", email: "gal@carecircle.dev", fullName: "GAL Jordan", role: "gal" },
  ],
  cases: [
    { id: "case-001", title: "A.R. Placement Support", createdAt: now(), createdBy: "u-worker" },
  ],
  case_members: [
    { id: randomUUID(), caseId: "case-001", userId: "u-worker", role: "case_worker", addedAt: now() },
    { id: randomUUID(), caseId: "case-001", userId: "u-foster", role: "foster_parent", addedAt: now() },
    { id: randomUUID(), caseId: "case-001", userId: "u-bio", role: "biological_parent", addedAt: now() },
    { id: randomUUID(), caseId: "case-001", userId: "u-gal", role: "gal", addedAt: now() },
  ],
  timeline_events: [
    {
      id: "evt-1",
      caseId: "case-001",
      type: "status",
      text: "Case opened",
      createdBy: "u-worker",
      createdAt: now(),
    },
  ],
  audit_events: [],
};

export function addAuditEvent({ actorUserId, caseId, action, resourceType, resourceId, meta }) {
  const event = {
    id: randomUUID(),
    actorUserId,
    caseId,
    action,
    resourceType,
    resourceId,
    meta: meta || null,
    createdAt: now(),
  };
  data.audit_events.push(event);
  return event;
}

export function createTimelineEvent({ caseId, type, text, createdBy }) {
  const event = {
    id: randomUUID(),
    caseId,
    type,
    text,
    createdBy,
    createdAt: now(),
  };
  data.timeline_events.push(event);
  return event;
}

export function createCase({ title, createdBy }) {
  const record = {
    id: randomUUID(),
    title,
    createdAt: now(),
    createdBy,
  };
  data.cases.push(record);
  return record;
}
