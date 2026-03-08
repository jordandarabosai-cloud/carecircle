export type Role = "foster_parent" | "biological_parent" | "case_worker" | "gal" | "admin";

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
