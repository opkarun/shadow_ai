# Shadow Architecture

This file is the shared contract for the four module branches. Any change to `shared/types/`, `shared/db/`, or this document needs a team sync before merge.

## Folder Tree

```text
shadow/
|-- shared/
|   |-- types/
|   |-- db/
|   `-- utils/
|-- detection/
|-- verification/
|-- communication/
|-- dashboard/
|-- .env.example
|-- package.json
|-- tsconfig.json
|-- ARCHITECTURE.md
`-- README.md
```

## Shared Types

```ts
export type CommitmentSource = "gmail" | "github" | "manual";

export type CommitmentStatus =
  | "DETECTED"
  | "CONFIRMED"
  | "PENDING"
  | "AT_RISK"
  | "OVERDUE"
  | "COMPLETED"
  | "ARCHIVED"
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
```

## Commitment Status Transitions

| From | Allowed next statuses |
| --- | --- |
| `DETECTED` | `CONFIRMED`, `DISMISSED` |
| `CONFIRMED` | `PENDING` |
| `PENDING` | `AT_RISK`, `OVERDUE`, `COMPLETED` |
| `AT_RISK` | `OVERDUE`, `COMPLETED` |
| `OVERDUE` | `RECOVERED`, `COMPLETED` |
| `RECOVERED` | `PENDING`, `COMPLETED` |
| `COMPLETED` | `ARCHIVED` |
| `ARCHIVED` | none |
| `DISMISSED` | none |

All status changes must call `transitionCommitmentStatus(commitmentId, nextStatus, evidence?)` from `shared/db/stateMachine.ts`. No feature module may write a `status` update directly.

## Ownership Boundaries

`shared/` owns the canonical TypeScript contracts, Mongo connection, Mongoose models, status transition helper, and cross-cutting utilities. Feature folders read from shared but do not redefine shared object shapes or open their own database connections.

`detection/` owns Gmail pre-filtering, LLM extraction, and confidence scoring. It must not verify completion, generate drafts, send communication, or directly mutate statuses outside the shared state machine.

`verification/` owns GitHub, Calendar, and manual evidence matching plus risk detection. It must never treat elapsed time as completion evidence, fabricate integration responses, generate communication drafts directly, or define local schemas.

`communication/` owns acknowledgement, completion, recovery, and extension-request draft generation plus approval queue handling. It may create drafts, but it must never auto-send, and send operations must be explicit user-triggered actions.

`dashboard/` owns the React frontend and any BFF/API routes it needs. It presents and manually edits shared data through sanctioned APIs, but it must not implement detection, verification, or communication internals.
