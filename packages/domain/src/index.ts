export type Role = "foster_parent" | "biological_parent" | "case_worker" | "gal" | "admin" | "dev_admin";

export type TimelineEventType = "note" | "hearing" | "visit" | "status" | "task";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface CaseRecord {
  id: string;
  title: string;
  createdAt: string;
  createdBy: string;
}

export interface CaseMember {
  id: string;
  caseId: string;
  userId: string;
  role: Role;
  addedAt: string;
}

export interface CaseInvite {
  id: string;
  caseId: string;
  email: string;
  role: Role;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string;
  acceptedBy?: string | null;
  acceptedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: TimelineEventType;
  text: string;
  createdBy: string;
  createdAt: string;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
}

export type DocumentVisibility = "all" | "professionals_only" | "parents_only";

export interface CaseDocument {
  id: string;
  caseId: string;
  uploadedBy: string;
  name: string;
  url: string;
  visibility: DocumentVisibility;
  createdAt: string;
}

export type TaskStatus = "open" | "in_progress" | "done" | "blocked";

export interface CaseTask {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  ownerUserId?: string | null;
  dueAt?: string | null;
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  caseId?: string;
  action: string;
  resourceType: "case" | "case_member" | "timeline_event" | "auth" | "case_invite";
  resourceId: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}
