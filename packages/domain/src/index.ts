export type Role = "foster_parent" | "biological_parent" | "case_worker" | "gal" | "admin";

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
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: "note" | "hearing" | "visit" | "status" | "task";
  text: string;
  createdBy: string;
  createdAt: string;
}
