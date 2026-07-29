import { CommunicationDraftModel, CommitmentModel } from "../shared/db/models";
import { connectMongo } from "../shared/db/connect";
import { logger } from "../shared/utils/logger";
import type { CommunicationDraft, Commitment } from "../shared/types";

export interface DraftSendRequest {
  draft_id: string;
  final_sent_content: string;
  approved_by_user_id: string;
}

/**
 * Inputs: an explicit user approval/edit action for a queued draft.
 * Output: the updated CommunicationDraft after the future Gmail send integration records the result.
 *
 * PRODUCT_SPEC.md Sections 5 and 13 require every send to be explicit and user-triggered.
 *
 * This is the ONLY code path that sends outbound communication. No auto-send, no scheduled sends.
 */
export async function sendApprovedDraft(request: DraftSendRequest): Promise<CommunicationDraft> {
  await connectMongo();

  try {
    // 1. Fetch the draft
    const draft = await CommunicationDraftModel.findOne({ id: request.draft_id }).exec();
    if (!draft) {
      throw new Error(`Draft not found: ${request.draft_id}`);
    }

    // 2. Fetch the commitment to get user_id (not from request.approved_by_user_id)
    const commitment = await CommitmentModel.findOne({ id: draft.commitment_id }).exec();
    if (!commitment) {
      throw new Error(`Commitment not found: ${draft.commitment_id}`);
    }

    const userId = commitment.user_id;

    // 3. Send via Gmail
    await sendViaGmail(userId, commitment, request.final_sent_content);

    // 4. Update draft: mark as sent with timestamp and final content
    const sentStatus = request.final_sent_content === draft.content ? "approved_sent" : "edited_sent";

    const updated = await CommunicationDraftModel.findOneAndUpdate(
      { id: request.draft_id },
      {
        $set: {
          status: sentStatus,
          sent_at: new Date(),
          final_sent_content: request.final_sent_content
        }
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      throw new Error(`Draft disappeared after send: ${request.draft_id}`);
    }

    // 5. Write audit entry (the one action with real external side effects)
    const { AuditLogEntryModel } = await import("../shared/db/models");
    const { randomUUID } = await import("node:crypto");

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: draft.commitment_id,
      event_type: "draft_sent",
      before_state: { status: draft.status },
      after_state: { status: sentStatus, sent_at: new Date().toISOString() },
      contributing_factors: {
        draft_id: request.draft_id,
        approved_by: request.approved_by_user_id,
        edited: request.final_sent_content !== draft.content
      },
      timestamp: new Date()
    });

    logger.info("Draft sent successfully", {
      draft_id: request.draft_id,
      commitment_id: draft.commitment_id,
      status: sentStatus
    });

    return updated as CommunicationDraft;
  } catch (err) {
    logger.error("Failed to send draft", {
      draft_id: request.draft_id,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

/**
 * Send the draft content via Gmail. This is the only place in the codebase
 * that actually sends email. It uses getGmailClient() to retrieve an
 * authenticated client for the user.
 *
 * For development: set MOCK_EMAIL_SEND=true to log instead of sending.
 */
async function sendViaGmail(userId: string, commitment: any, content: string): Promise<void> {
  const mockMode = process.env.MOCK_EMAIL_SEND === "true";

  if (mockMode) {
    // Mock phase: just log what would be sent
    logger.info("MOCK: Would send email via Gmail", {
      user_id: userId,
      to: commitment.requester,
      subject: `Re: ${commitment.title}`,
      body_preview: content.substring(0, 100)
    });
    return;
  }

  // Live phase: use real Gmail API
  try {
    const { getGmailClient } = await import("../shared/integrations/getGmailClient");
    const gmail = await getGmailClient(userId);

    // Build RFC 2822 email
    const emailLines = [
      `To: ${commitment.requester}`,
      `Subject: Re: ${commitment.title}`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      content
    ];
    const email = emailLines.join("\r\n");
    const base64Email = Buffer.from(email).toString("base64");

    // Send via Gmail API
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64Email
      }
    });

    logger.info("Email sent via Gmail API", { user_id: userId });
  } catch (err) {
    logger.error("Gmail send failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

/**
 * Inputs: the user whose queue is being viewed.
 * Output: all drafts currently in `queued` status for that user, for the Dashboard's approval UI.
 *
 * PRODUCT_SPEC.md Section 13 — drafts wait here until the user acts on them; nothing in this
 * function may change a draft's status.
 */
export async function listQueuedDrafts(userId: string): Promise<CommunicationDraft[]> {
  await connectMongo();

  try {
    // Get all queued drafts for this user.
    // We join by finding commitments owned by the user, then drafts linked to those commitments.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commitmentDocs = (await CommitmentModel.find({ user_id: userId }).lean().exec()) as any;
    const commitmentIds = commitmentDocs?.map((c: any) => c.id) || [];

    if (commitmentIds.length === 0) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drafts = (await CommunicationDraftModel.find({
      commitment_id: { $in: commitmentIds },
      status: "queued"
    })
      .lean()
      .exec()) as any;

    logger.info("Queued drafts fetched", {
      user_id: userId,
      count: drafts.length
    });

    return drafts;
  } catch (err) {
    logger.error("Failed to list queued drafts", {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

/**
 * Inputs: a draft the user has chosen not to send.
 * Output: the updated CommunicationDraft with status "discarded".
 *
 * PRODUCT_SPEC.md Section 13 — discarding is a terminal, no-send action; nothing is
 * communicated externally as a result of this call.
 */
export async function discardDraft(draftId: string): Promise<CommunicationDraft> {
  await connectMongo();

  try {
    const draft = await CommunicationDraftModel.findOne({ id: draftId }).exec();

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    const previousStatus = draft.status;

    const updated = await CommunicationDraftModel.findOneAndUpdate(
      { id: draftId },
      { $set: { status: "discarded" } },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      throw new Error(`Draft disappeared during discard: ${draftId}`);
    }

    // Record the discard as an audit event
    const { AuditLogEntryModel } = await import("../shared/db/models");
    const { randomUUID } = await import("node:crypto");

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: (updated as any).commitment_id,
      event_type: "draft_discarded",
      before_state: { status: previousStatus },
      after_state: { status: "discarded" },
      contributing_factors: { draft_id: draftId },
      timestamp: new Date()
    });

    logger.info("Draft discarded", { draft_id: draftId });

    return updated as CommunicationDraft;
  } catch (err) {
    logger.error("Failed to discard draft", {
      draft_id: draftId,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

/**
 * Inputs: a draft the user wants to revisit later, and the time to resurface it.
 * Output: the updated CommunicationDraft with status "snoozed" until the given time.
 *
 * PRODUCT_SPEC.md Section 13 — snoozing defers the decision; it must not be treated as
 * approval, and must not trigger a send.
 */
export async function snoozeDraft(draftId: string, until: Date): Promise<CommunicationDraft> {
  await connectMongo();

  try {
    const draft = await CommunicationDraftModel.findOne({ id: draftId }).exec();

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    const previousStatus = draft.status;

    const updated = await CommunicationDraftModel.findOneAndUpdate(
      { id: draftId },
      { $set: { status: "snoozed", snoozed_until: until } },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      throw new Error(`Draft disappeared during snooze: ${draftId}`);
    }

    // Record the snooze as an audit event
    const { AuditLogEntryModel } = await import("../shared/db/models");
    const { randomUUID } = await import("node:crypto");

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: (updated as any).commitment_id,
      event_type: "draft_snoozed",
      before_state: { status: previousStatus },
      after_state: { status: "snoozed", snoozed_until: until.toISOString() },
      contributing_factors: { draft_id: draftId, snoozed_until: until.toISOString() },
      timestamp: new Date()
    });

    logger.info("Draft snoozed", { draft_id: draftId, snoozed_until: until.toISOString() });

    return updated as CommunicationDraft;
  } catch (err) {
    logger.error("Failed to snooze draft", {
      draft_id: draftId,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}