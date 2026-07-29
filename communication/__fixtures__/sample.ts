/**
 * Test fixtures: hand-written Commitment + Evidence objects for testing
 * communication/ functions against realistic data.
 */

import type { Commitment, Evidence, CommunicationDraft } from "../../shared/types";

// ===== FIXTURE 1: Acknowledgement Draft =====
// New commitment, no evidence yet, needs acknowledgement

export const commitmentAcknowledgement: Commitment = {
  id: "c-ack-001",
  user_id: "test-user-123",
  title: "Review API design doc",
  description:
    "Ananya asked me to review the new REST API design for the data pipeline module and provide feedback by end of day.",
  requester: "Ananya Kumar (teammate)",
  source: "gmail",
  source_reference: "gmail-msg-abc123",
  deadline: new Date("2026-07-29T17:00:00Z"),
  status: "CONFIRMED",
  confidence_score: 0.92,
  priority_score: 7.5,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/api-design",
  created_at: new Date("2026-07-28T09:00:00Z"),
  updated_at: new Date("2026-07-28T09:00:00Z")
};

export const evidenceAcknowledgement: Evidence[] = []; // No evidence yet

// ===== FIXTURE 2: Completion Draft =====
// Feature completed with GitHub evidence

export const commitmentCompletion: Commitment = {
  id: "c-comp-002",
  user_id: "test-user-123",
  title: "Ship payment integration feature",
  description: "Complete the payment module and merge to main by Friday.",
  requester: "Team lead (Sarah Chen)",
  source: "gmail",
  source_reference: "gmail-msg-def456",
  deadline: new Date("2026-07-26T23:59:59Z"),
  status: "COMPLETED",
  confidence_score: 0.95,
  priority_score: 9.0,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/payment-module",
  created_at: new Date("2026-07-20T10:00:00Z"),
  updated_at: new Date("2026-07-26T15:30:00Z")
};

export const evidenceCompletion: Evidence[] = [
  {
    id: "ev-comp-001",
    commitment_id: "c-comp-002",
    evidence_type: "github_pr",
    evidence_reference: "https://github.com/example/payment-module/pull/157",
    match_confidence: 0.95,
    detected_at: new Date("2026-07-26T15:20:00Z")
  },
  {
    id: "ev-comp-002",
    commitment_id: "c-comp-002",
    evidence_type: "github_commit",
    evidence_reference: "https://github.com/example/payment-module/commit/abc123def456",
    match_confidence: 0.92,
    detected_at: new Date("2026-07-26T15:30:00Z")
  }
];

// ===== FIXTURE 3: Recovery Draft =====
// Deadline passed, need to recover trust

export const commitmentRecovery: Commitment = {
  id: "c-rec-003",
  user_id: "test-user-123",
  title: "Send client proposal for Q3 roadmap",
  description: "Promised to send a written proposal outlining the Q3 development roadmap to the client.",
  requester: "Meera (freelance client)",
  source: "gmail",
  source_reference: "gmail-msg-ghi789",
  deadline: new Date("2026-07-27T12:00:00Z"),
  status: "OVERDUE",
  confidence_score: 0.88,
  priority_score: 8.5,
  verification_method: "manual",
  linked_repo: null,
  created_at: new Date("2026-07-20T14:00:00Z"),
  updated_at: new Date("2026-07-28T09:00:00Z")
};

export const evidenceRecovery: Evidence[] = []; // No evidence, hence overdue

// ===== FIXTURE 4: Extension Request Draft =====
// Deadline approaching, no evidence yet, at-risk

export const commitmentExtensionRequest: Commitment = {
  id: "c-ext-004",
  user_id: "test-user-123",
  title: "Deploy backend auth service to staging",
  description: "Agreed to have the OAuth2 auth service running on the staging environment.",
  requester: "Rohan (developer, same team)",
  source: "gmail",
  source_reference: "gmail-msg-jkl012",
  deadline: new Date("2026-07-29T18:00:00Z"),
  status: "AT_RISK",
  confidence_score: 0.89,
  priority_score: 7.0,
  verification_method: "github_pr",
  linked_repo: "https://github.com/example/auth-service",
  created_at: new Date("2026-07-24T11:00:00Z"),
  updated_at: new Date("2026-07-28T16:00:00Z")
};

export const evidenceExtensionRequest: Evidence[] = []; // No evidence yet, hence at-risk

// ===== FIXTURE: Queued Drafts (for list/discard/snooze tests) =====

export const queuedDraftFixture: CommunicationDraft = {
  id: "draft-queued-test-001",
  commitment_id: "c-ack-001",
  draft_type: "acknowledgement",
  content: "Thanks for flagging this, Ananya. I've reviewed the requirements and scope — I'll have feedback on the API design by EOD today as promised. Let me know if you need any clarifications as I'm working through it.",
  status: "queued",
  created_at: new Date("2026-07-28T10:00:00Z"),
  sent_at: null,
  final_sent_content: null,
  snoozed_until: null
};

export const snoozedDraftFixture: CommunicationDraft = {
  id: "draft-snoozed-test-002",
  commitment_id: "c-ext-004",
  draft_type: "extension_request",
  content: "I want to flag that the staging deployment for the OAuth2 service is looking tight for tomorrow. I have a few blockers I'm working through and would like to request a 24-hour extension to July 30th EOD. Does that work?",
  status: "snoozed",
  created_at: new Date("2026-07-28T09:00:00Z"),
  sent_at: null,
  final_sent_content: null,
  snoozed_until: new Date(Date.now() - 60000) // 1 minute in the past — ready to resurface
};
