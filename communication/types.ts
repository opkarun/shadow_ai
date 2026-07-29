/**
 * Communication Module - Local Types
 *
 * Defines interfaces and types specific to the Communication module.
 * All shared types (Commitment, Evidence, CommunicationDraft, etc.) are
 * imported from shared/types and never redefined here.
 */

import type {
  Commitment,
  Evidence,
  CommunicationDraft,
  CommunicationDraftType,
} from "../shared/types";

/**
 * Context needed to generate a draft message for a commitment.
 *
 * Represents the full state (commitment + evidence + prior conversation) that the
 * LLM needs to construct a contextually appropriate message.
 */
export interface DraftContext {
  /** The commitment this draft relates to */
  commitment: Commitment;

  /** Evidence gathered so far (for completion/recovery context) */
  evidence: Evidence[];

  /** Prior emails in the thread (for context, to avoid repetition) */
  prior_thread_context: string[];
}

/**
 * Request to send an already-approved draft.
 *
 * User has reviewed and (optionally edited) a draft, and is now explicitly
 * approving it to be sent. Contains the final content (may differ from original
 * if the user edited it) and audit trail info.
 */
export interface DraftSendRequest {
  /** ID of the draft being sent */
  draft_id: string;

  /** Final content to send (may differ from original draft if user edited) */
  final_sent_content: string;

  /** User ID approving the send (for audit logging) */
  approved_by_user_id: string;
}

/**
 * Response after a draft is sent.
 *
 * Updates the CommunicationDraft record with send metadata and audit trail.
 */
export interface DraftSendResult {
  /** Updated draft record after sending */
  draft: CommunicationDraft;

  /** Timestamp when sent */
  sent_at: Date;

  /** Whether the user edited the draft before sending */
  was_edited: boolean;
}

/**
 * Metadata about a draft type for prompting and UI.
 *
 * Describes the tone, goal, and trigger for each draft type so prompts can be
 * consistent and the UI can explain context to the user.
 */
export interface DraftTypeMetadata {
  /** Human-readable type name */
  type: CommunicationDraftType;

  /** Description of the tone this draft should use */
  tone: string;

  /** What this draft is trying to accomplish */
  goal: string;

  /** When this draft type is typically generated */
  trigger: string;
}

/**
 * Internal result of a Gemini API call for draft generation.
 *
 * Raw LLM response before any validation or database persistence.
 */
export interface GeminiDraftGenerationResult {
  /** The generated draft content from Gemini */
  content: string;

  /** Optional: explanation of why this tone/content was chosen (for logging) */
  reasoning?: string;
}
