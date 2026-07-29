export type CommitmentSource = "gmail" | "github" | "manual";

export type CommitmentStatus =
  | "DETECTED"
  | "CONFIRMED"
  | "PENDING"
  | "AT_RISK"
  | "OVERDUE"
  | "COMPLETED"
  | "ARCHIVED"
  | "RECOVERED"
  | "DISMISSED";

export type EvidenceType =
  | "github_commit"
  | "github_pr"
  | "github_release"
  | "manual"
  | "calendar_attendance";

export type CommunicationDraftType =
  | "acknowledgement"
  | "completion"
  | "recovery"
  | "extension_request";

export type CommunicationDraftStatus =
  | "queued"
  | "approved_sent"
  | "edited_sent"
  | "discarded"
  | "snoozed";

export type IntegrationProvider = "gmail" | "github" | "google_calendar";

export type IntegrationStatus = "connected" | "revoked" | "error";

export type CalendarEventStatus = "created" | "updated" | "removed";

export type AuditEventType =
  | "status_change"
  | "priority_recalc"
  | "evidence_matched"
  | "draft_generated"
  | "draft_sent";

export interface ConnectedAccountTokenSet {
  auth_token: string;
  scopes: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  connected_accounts: Partial<Record<IntegrationProvider, ConnectedAccountTokenSet>>;
  notification_preferences: Record<string, unknown>;
  stakeholder_importance_map: Record<string, number>;
}

export interface Commitment {
  id: string;
  user_id: string;
  title: string;
  description: string;
  requester: string;
  source: CommitmentSource;
  source_reference: string;
  deadline: Date | null;
  status: CommitmentStatus;
  confidence_score: number;
  priority_score: number;
  verification_method: string;
  linked_repo: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Evidence {
  id: string;
  commitment_id: string;
  evidence_type: EvidenceType;
  evidence_reference: string;
  match_confidence: number;
  detected_at: Date;
}

export interface CommunicationDraft {
  id: string;
  commitment_id: string;
  draft_type: CommunicationDraftType;
  content: string;
  status: CommunicationDraftStatus;
  created_at: Date;
  sent_at: Date | null;
  final_sent_content: string | null;
  snoozed_until: Date | null;
}

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  auth_token: string;
  scopes: string[];
  status: IntegrationStatus;
  last_synced_at: Date | null;
}

export interface CalendarEvent {
  id: string;
  commitment_id: string;
  external_event_id: string;
  title: string;
  start_time: Date;
  status: CalendarEventStatus;
}

export interface AuditLogEntry {
  id: string;
  commitment_id: string;
  event_type: AuditEventType;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  contributing_factors: Record<string, unknown>;
  timestamp: Date;
}
