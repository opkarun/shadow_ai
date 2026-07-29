/**
 * Communication Module - Public API
 *
 * Single entry point for the entire Communication module.
 * Exposes:
 * - Draft generation and queuing (for Detection, Verification, Risk, Overdue monitors)
 * - Approval queue management (for Dashboard)
 *
 * Core constraint: No draft is ever sent without explicit user approval.
 *
 * Usage:
 *   // Generate and queue a new draft
 *   const draft = await generateAndQueueDraft("acknowledgement", {
 *     commitment,
 *     evidence,
 *     prior_thread_context
 *   });
 *
 *   // List pending drafts for user
 *   const pending = await listQueuedDrafts(userId);
 *
 *   // Send an approved draft (after user review/edit)
 *   const sent = await sendApprovedDraft({
 *     draft_id,
 *     final_sent_content,
 *     approved_by_user_id
 *   });
 */

import { logger } from "../shared/utils";
import {
  generateDraft,
  type DraftContext,
} from "./generateDraft";
import {
  listQueuedDrafts,
  sendApprovedDraft,
  discardDraft,
  snoozeDraft,
  type DraftSendRequest,
} from "./approvalQueue";
import type {
  CommunicationDraft,
  CommunicationDraftType,
} from "../shared/types";

// ============================================================================
// PUBLIC API - DRAFT GENERATION
// ============================================================================

/**
 * Main entry point: Generate and queue a draft for a commitment.
 *
 * Orchestrates draft generation and queuing in a single operation.
 * Handles all error cases and logging. Suitable for calling from
 * Detection, Verification, and monitoring/scheduler jobs.
 *
 * PRODUCT_SPEC.md Section 13 (AI Communication Lifecycle):
 * - Drafts are generated proactively at various lifecycle points
 * - All drafts are queued for explicit user approval
 * - No draft is ever sent automatically
 *
 * @param draftType Type of draft (acknowledgement, completion, recovery, extension_request)
 * @param context Commitment context (commitment, evidence, prior thread)
 * @returns Queued draft ready for user review
 * @throws Error if draft generation or queuing fails
 */
export async function generateAndQueueDraft(
  draftType: CommunicationDraftType,
  context: DraftContext
): Promise<CommunicationDraft> {
  const userId = context.commitment.user_id;
  const commitmentId = context.commitment.id;

  logger.info("Communication: starting draft generation and queuing", {
    userId,
    commitmentId,
    draftType,
    commitmentTitle: context.commitment.title,
  });

  try {
    const draft = await generateDraft(draftType, context);

    logger.info("Communication: draft generated and queued successfully", {
      userId,
      commitmentId,
      draftId: draft.id,
      draftType,
      status: draft.status,
    });

    return draft;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Communication: draft generation failed", {
      userId,
      commitmentId,
      draftType,
      error: errorMessage,
    });

    throw error;
  }
}

// ============================================================================
// PUBLIC API - APPROVAL QUEUE
// ============================================================================

/**
 * List all queued drafts for a user.
 *
 * Returns drafts currently awaiting user action.
 * For use by the Dashboard's Approval Queue view.
 *
 * @param userId User ID
 * @returns Array of queued drafts
 */
export async function listQueuedDraftsForUser(
  userId: string
): Promise<CommunicationDraft[]> {
  return listQueuedDrafts(userId);
}

/**
 * Send an approved draft.
 *
 * Sends a draft that the user has reviewed and approved
 * (with optional edits). This is the ONLY path to sending a draft.
 *
 * PRODUCT_SPEC.md NFR-4: No draft is sent without explicit user approval.
 *
 * @param request Send request with draft ID, final content, and approver ID
 * @returns Updated draft with sent status and timestamp
 */
export async function sendApprovedDraftToUser(
  request: DraftSendRequest
): Promise<CommunicationDraft> {
  return sendApprovedDraft(request);
}

/**
 * Discard a draft permanently.
 *
 * Marks a draft as discarded without sending.
 * This is a terminal action.
 *
 * @param draftId Draft ID to discard
 * @returns Updated draft with discarded status
 */
export async function discardQueuedDraft(
  draftId: string
): Promise<CommunicationDraft> {
  return discardDraft(draftId);
}

/**
 * Snooze a draft to defer the approval decision.
 *
 * Temporarily hides a draft and resurfaces it at a later time.
 * Not treated as approval or send.
 *
 * @param draftId Draft ID to snooze
 * @param until Date/time when to resurface
 * @returns Updated draft with snoozed status
 */
export async function snoozeQueuedDraft(
  draftId: string,
  until: Date
): Promise<CommunicationDraft> {
  return snoozeDraft(draftId, until);
}

// ============================================================================
// EXPORTS - Types
// ============================================================================

// Re-export shared types and interfaces
export type { DraftContext } from "./generateDraft";
export type { DraftSendRequest } from "./approvalQueue";
export type { CommunicationDraft, CommunicationDraftType } from "../shared/types";
