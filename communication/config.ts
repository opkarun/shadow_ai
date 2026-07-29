/**
 * Communication module configuration.
 * All tunable parameters for draft generation, LLM calls, and approval queue.
 * These should be environment-configurable in production, but sane defaults are provided.
 */

import type { CommunicationDraftType } from "../shared/types";
import type { DraftTypeMetadata } from "./types";

// ============================================================================
// GEMINI API CONFIGURATION
// ============================================================================

/**
 * Gemini model to use for draft generation.
 * As of PRODUCT_SPEC Section 29, Flash is the default for MVP.
 */
export const GEMINI_MODEL_ID = "gemini-1.5-flash";

/**
 * Retry configuration for transient API failures.
 * Exponential backoff with jitter to handle rate limits and temporary service issues.
 */
export const RETRY_CONFIG = {
  // Max number of retries for transient failures
  MAX_RETRIES: 3,

  // Initial backoff delay in milliseconds
  INITIAL_BACKOFF_MS: 1000,

  // Backoff multiplier (exponential backoff)
  BACKOFF_MULTIPLIER: 2,
};

// ============================================================================
// DRAFT TYPE CONFIGURATION
// ============================================================================

/**
 * Metadata for each draft type.
 * Describes tone, goal, and trigger so prompts can be consistent and
 * the UI can explain context to the user.
 *
 * Based on PRODUCT_SPEC Section 13 (AI Communication Lifecycle).
 */
export const DRAFT_TYPE_METADATA: Record<CommunicationDraftType, DraftTypeMetadata> =
  {
    acknowledgement: {
      type: "acknowledgement",
      tone: "Warm, concise, confirms understanding",
      goal: "Signal responsiveness, confirm scope/deadline",
      trigger: "Commitment confirmed/accepted",
    },

    completion: {
      type: "completion",
      tone: "Confident, brief",
      goal: "Close the loop with the requester",
      trigger: "Verification evidence found or manual completion",
    },

    recovery: {
      type: "recovery",
      tone: "Apologetic, accountable, forward-looking",
      goal: "Rebuild trust, commit to a new realistic timeline",
      trigger: "Deadline passed without evidence",
    },

    extension_request: {
      type: "extension_request",
      tone: "Proactive, respectful",
      goal: "Renegotiate deadline before it's missed",
      trigger: "Risk threshold crossed pre-deadline",
    },
  };

// ============================================================================
// DRAFT APPROVAL QUEUE CONFIGURATION
// ============================================================================

/**
 * Default snooze durations (in milliseconds) for draft deferral.
 * User can snooze a draft to be reminded later without making an approval decision yet.
 */
export const SNOOZE_DURATIONS = {
  // 30 minutes
  SHORT: 30 * 60 * 1000,

  // 2 hours
  MEDIUM: 2 * 60 * 60 * 1000,

  // 1 day
  LONG: 24 * 60 * 60 * 1000,
};

/**
 * Maximum number of drafts to return in a single approval queue list.
 * Prevents massive responses when filtering by user ID.
 * Actual UI pagination/infinite scroll can request more if needed.
 */
export const APPROVAL_QUEUE_PAGE_SIZE = 50;

/**
 * How long a snoozed draft stays snoozed before auto-surfacing again.
 * If user snoozes indefinitely without specifying an "until" time, default to this.
 *
 * Set conservatively (6 hours) so drafts don't get lost forever.
 */
export const DEFAULT_SNOOZE_DURATION = SNOOZE_DURATIONS.MEDIUM;

// ============================================================================
// DRAFT CONTENT CONFIGURATION
// ============================================================================

/**
 * Maximum length for generated draft content (characters).
 * If a Gemini-generated draft exceeds this, it's either truncated (with warning)
 * or rejected and the user is notified to draft manually.
 *
 * Email drafts are typically 200-500 chars; set to 2000 as a generous upper bound.
 */
export const MAX_DRAFT_CONTENT_LENGTH = 2000;

/**
 * Minimum length for generated draft content (characters).
 * If a Gemini-generated draft is shorter than this, it may be too sparse
 * and should be flagged as potentially incomplete.
 *
 * Set to 50 to catch obviously empty or placeholder responses.
 */
export const MIN_DRAFT_CONTENT_LENGTH = 50;

// ============================================================================
// GEMINI PROMPT CONFIGURATION
// ============================================================================

/**
 * System instruction prefix for all draft generation calls.
 * Establishes that Gemini is drafting professional email/messages for the user.
 *
 * Additional context (tone, goal, commitment details) are added per draft type.
 */
export const DRAFT_GENERATION_SYSTEM_PREFIX = `You are an expert at drafting professional, context-aware email messages and communication.

Your task is to generate a single draft message that is:
- Professional and respectful
- Concise (aim for 2-4 sentences, or longer only if necessary for clarity)
- Free of ambiguity or passive-aggressive language
- Personalized to the specific commitment and context provided

The user will review and potentially edit your draft before sending, so write clearly and confidently.

Return ONLY the draft message content. Do not include salutations ("Hi [name],") or signatures ("Best, [name]") — the UI will add those.
Do not include meta-commentary or explanations, just the message body.`;

/**
 * Maximum number of prior emails to include in thread context.
 * Prevents the prompt from getting too large/expensive while still giving
 * Gemini enough context to avoid repetition and understand the conversation.
 */
export const MAX_PRIOR_THREAD_CONTEXT_MESSAGES = 3;

// ============================================================================
// AUDIT & LOGGING CONFIGURATION
// ============================================================================

/**
 * Whether to log the full content of generated drafts (before user approval).
 * Set to true for debugging/auditing; set to false to reduce log volume in prod.
 */
export const LOG_GENERATED_DRAFTS = true;

/**
 * Whether to log the final sent content of approved drafts.
 * Always true for audit/compliance purposes — every send is logged and traceable.
 * This is non-negotiable per PRODUCT_SPEC Section 4 (NFR-3 Auditability).
 */
export const LOG_SENT_DRAFTS = true;
