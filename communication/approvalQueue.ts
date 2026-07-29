/**
 * Approval Queue Management
 *
 * Manages the user-facing approval queue for AI-generated drafts.
 * Implements four core operations:
 * 1. List queued drafts awaiting user action
 * 2. Send an approved draft (with optional edits)
 * 3. Discard a draft permanently
 * 4. Snooze a draft to defer the decision
 *
 * Core constraint: No draft is ever sent automatically.
 * Every send is explicit, user-triggered, and logged for audit.
 *
 * PRODUCT_SPEC.md Section 13 (AI Communication Lifecycle) and NFR-4 (User Control)
 */

import { randomUUID } from "crypto";
import { logger } from "../shared/utils";
import { connectMongo } from "../shared/db/connect";
import {
  CommunicationDraftModel,
  CommitmentModel,
  AuditLogEntryModel,
} from "../shared/db/models";
import type { CommunicationDraft, CommunicationDraftStatus } from "../shared/types";

// ============================================================================
// TYPES
// ============================================================================

export interface DraftSendRequest {
  draft_id: string;
  final_sent_content: string;
  approved_by_user_id: string;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * List all queued drafts for a user.
 *
 * Returns drafts currently awaiting user action (status = "queued").
 * Does not return discarded, snoozed, or already-sent drafts.
 *
 * PRODUCT_SPEC.md Section 13: Drafts wait in the queue until the user acts on them.
 *
 * @param userId User ID whose drafts to list
 * @returns Array of queued drafts for this user
 * @throws Error if database query fails
 */
export async function listQueuedDrafts(userId: string): Promise<CommunicationDraft[]> {
  validateUserId(userId);

  logger.info("Fetching queued drafts", { userId });

  try {
    await connectMongo();

    // Find all commitments for this user
    const commitments = await CommitmentModel.find(
      { user_id: userId },
      { id: 1 }
    ).lean();

    const commitmentIds = commitments.map((c) => c.id);

    if (commitmentIds.length === 0) {
      logger.info("No commitments found for user", { userId });
      return [];
    }

    // Find all queued drafts for these commitments
    const drafts = (await CommunicationDraftModel.find(
      {
        commitment_id: { $in: commitmentIds },
        status: "queued",
      },
      null,
      { sort: { created_at: -1 } }
    ).lean()) as unknown as CommunicationDraft[];

    logger.info("Fetched queued drafts", {
      userId,
      draftCount: drafts.length,
    });

    return drafts;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Failed to fetch queued drafts", {
      userId,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Send an approved draft.
 *
 * Transitions a draft from "queued" to either:
 * - "approved_sent" if final content matches original
 * - "edited_sent" if user edited the content
 *
 * Implements the hard constraint: drafts are NEVER sent without explicit user approval.
 * This function should only be called in direct response to user interaction.
 *
 * PRODUCT_SPEC.md Sections 4 and 13: Every send is explicit, and there is no
 * "auto-send after N hours" mode.
 *
 * @param request Send request with draft ID, final content, and approver ID
 * @returns Updated draft with new status and sent timestamp
 * @throws Error if draft not found, not in queued status, or send fails
 */
export async function sendApprovedDraft(
  request: DraftSendRequest
): Promise<CommunicationDraft> {
  validateSendRequest(request);

  const { draft_id, final_sent_content, approved_by_user_id } = request;
  const now = new Date();

  logger.info("Processing draft send approval", {
    draftId: draft_id,
    approvedBy: approved_by_user_id,
    contentLength: final_sent_content.length,
  });

  try {
    await connectMongo();

    // Fetch the draft
    const draft = await CommunicationDraftModel.findOne({
      id: draft_id,
    });

    if (!draft) {
      throw new Error(`Draft not found: ${draft_id}`);
    }

    // Validate it's in queued status
    if (draft.status !== "queued") {
      throw new Error(
        `Cannot send draft with status "${draft.status}" (must be "queued")`
      );
    }

    // Determine final status based on whether content was edited
    const wasEdited = final_sent_content !== draft.content;
    const finalStatus: CommunicationDraftStatus = wasEdited
      ? "edited_sent"
      : "approved_sent";

    logger.info("Sending draft", {
      draftId: draft_id,
      commitmentId: draft.commitment_id,
      draftType: draft.draft_type,
      wasEdited,
      finalStatus,
    });

    // Update draft record
    draft.status = finalStatus;
    draft.sent_at = now;
    draft.final_sent_content = final_sent_content;

    const updated = (await draft.save()) as unknown as CommunicationDraft;

    // Create audit log entry
    logger.info("Creating audit log for draft send", {
      draftId: draft_id,
      commitmentId: draft.commitment_id,
    });

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: draft.commitment_id,
      event_type: "draft_sent",
      before_state: {
        draft_id: draft_id,
        status: "queued",
      },
      after_state: {
        draft_id: draft_id,
        status: finalStatus,
        sent_at: now.toISOString(),
      },
      contributing_factors: {
        approved_by: approved_by_user_id,
        draft_type: draft.draft_type,
        was_edited: wasEdited,
        original_content_length: draft.content.length,
        final_content_length: final_sent_content.length,
      },
      timestamp: now,
    });

    logger.info("Draft sent successfully", {
      draftId: draft_id,
      status: finalStatus,
      sentAt: now.toISOString(),
    });

    return updated;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Failed to send approved draft", {
      draftId: draft_id,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Discard a draft permanently.
 *
 * Transitions a draft from "queued" to "discarded".
 * This is a terminal action; the draft is not sent and cannot be recovered.
 *
 * PRODUCT_SPEC.md Section 13: Discarding is a terminal, no-send action;
 * nothing is communicated externally.
 *
 * @param draftId ID of draft to discard
 * @returns Updated draft with status "discarded"
 * @throws Error if draft not found or not in queued status
 */
export async function discardDraft(draftId: string): Promise<CommunicationDraft> {
  validateDraftId(draftId);

  const now = new Date();

  logger.info("Processing draft discard", { draftId });

  try {
    await connectMongo();

    // Fetch the draft
    const draft = await CommunicationDraftModel.findOne({
      id: draftId,
    });

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    // Validate it's in queued status
    if (draft.status !== "queued") {
      throw new Error(
        `Cannot discard draft with status "${draft.status}" (must be "queued")`
      );
    }

    logger.info("Discarding draft", {
      draftId,
      commitmentId: draft.commitment_id,
      draftType: draft.draft_type,
    });

    // Update draft record
    draft.status = "discarded";

    const updated = (await draft.save()) as unknown as CommunicationDraft;

    // Create audit log entry
    logger.info("Creating audit log for draft discard", {
      draftId,
      commitmentId: draft.commitment_id,
    });

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: draft.commitment_id,
      event_type: "draft_discarded",
      before_state: {
        draft_id: draftId,
        status: "queued",
      },
      after_state: {
        draft_id: draftId,
        status: "discarded",
        discarded_at: now.toISOString(),
      },
      contributing_factors: {
        draft_type: draft.draft_type,
        content_length: draft.content.length,
      },
      timestamp: now,
    });

    logger.info("Draft discarded successfully", { draftId });

    return updated;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Failed to discard draft", {
      draftId,
      error: errorMessage,
    });
    throw error;
  }
}

/**
 * Snooze a draft to defer the approval decision.
 *
 * Transitions a draft from "queued" to "snoozed".
 * The user will need to manually resurface this draft or a background job
 * will detect snoozed drafts and resurface them when the snooze time passes.
 *
 * Snoozing is NOT approval and does NOT trigger a send. It defers the decision.
 *
 * PRODUCT_SPEC.md Section 13: Snoozing defers the decision; it must not be
 * treated as approval, and must not trigger a send.
 *
 * @param draftId ID of draft to snooze
 * @param until Date/time when this draft should resurface
 * @returns Updated draft with status "snoozed"
 * @throws Error if draft not found, not in queued status, or until is invalid
 */
export async function snoozeDraft(
  draftId: string,
  until: Date
): Promise<CommunicationDraft> {
  validateDraftId(draftId);
  validateSnoozeUntilTime(until);

  const now = new Date();

  logger.info("Processing draft snooze", {
    draftId,
    until: until.toISOString(),
    snoozeMs: until.getTime() - now.getTime(),
  });

  try {
    await connectMongo();

    // Fetch the draft
    const draft = await CommunicationDraftModel.findOne({
      id: draftId,
    });

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    // Validate it's in queued status
    if (draft.status !== "queued") {
      throw new Error(
        `Cannot snooze draft with status "${draft.status}" (must be "queued")`
      );
    }

    logger.info("Snoozing draft", {
      draftId,
      commitmentId: draft.commitment_id,
      draftType: draft.draft_type,
      until: until.toISOString(),
    });

    // Update draft record
    draft.status = "snoozed";

    const updated = (await draft.save()) as unknown as CommunicationDraft;

    // Create audit log entry with snooze time
    logger.info("Creating audit log for draft snooze", {
      draftId,
      commitmentId: draft.commitment_id,
      until: until.toISOString(),
    });

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: draft.commitment_id,
      event_type: "draft_snoozed",
      before_state: {
        draft_id: draftId,
        status: "queued",
      },
      after_state: {
        draft_id: draftId,
        status: "snoozed",
        snoozed_until: until.toISOString(),
      },
      contributing_factors: {
        draft_type: draft.draft_type,
        snooze_until: until.toISOString(),
        snooze_duration_ms: until.getTime() - now.getTime(),
      },
      timestamp: now,
    });

    logger.info("Draft snoozed successfully", {
      draftId,
      until: until.toISOString(),
    });

    return updated;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error("Failed to snooze draft", {
      draftId,
      until: until.toISOString(),
      error: errorMessage,
    });
    throw error;
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate user ID.
 */
function validateUserId(userId: string): void {
  if (!userId || typeof userId !== "string") {
    throw new Error("User ID must be a non-empty string");
  }
}

/**
 * Validate draft ID.
 */
function validateDraftId(draftId: string): void {
  if (!draftId || typeof draftId !== "string") {
    throw new Error("Draft ID must be a non-empty string");
  }
}

/**
 * Validate send request.
 */
function validateSendRequest(request: DraftSendRequest): void {
  if (!request) {
    throw new Error("Send request is required");
  }

  if (!request.draft_id || typeof request.draft_id !== "string") {
    throw new Error("Draft ID must be a non-empty string");
  }

  if (
    !request.final_sent_content ||
    typeof request.final_sent_content !== "string"
  ) {
    throw new Error("Final sent content must be a non-empty string");
  }

  if (!request.approved_by_user_id || typeof request.approved_by_user_id !== "string") {
    throw new Error("Approved by user ID must be a non-empty string");
  }
}

/**
 * Validate snooze until time.
 */
function validateSnoozeUntilTime(until: Date): void {
  if (!(until instanceof Date) || isNaN(until.getTime())) {
    throw new Error("Snooze until must be a valid Date");
  }

  const now = new Date();
  if (until <= now) {
    throw new Error("Snooze until time must be in the future");
  }
}