import type { CommunicationDraft } from "../shared/types";

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
 */
export async function sendApprovedDraft(_request: DraftSendRequest): Promise<CommunicationDraft> {
  // TODO: Wire Gmail send only after explicit user approval; never add auto-send paths.
  // TODO: On success, write an AuditLogEntry (event_type: "draft_sent") — this is the one
  // action in the system with real external side effects and should always be traceable.
  throw new Error("TODO: sendApprovedDraft is not implemented.");
}

/**
 * Inputs: the user whose queue is being viewed.
 * Output: all drafts currently in `queued` status for that user, for the Dashboard's approval UI.
 *
 * PRODUCT_SPEC.md Section 13 — drafts wait here until the user acts on them; nothing in this
 * function may change a draft's status.
 */
export async function listQueuedDrafts(_userId: string): Promise<CommunicationDraft[]> {
  throw new Error("TODO: listQueuedDrafts is not implemented.");
}

/**
 * Inputs: a draft the user has chosen not to send.
 * Output: the updated CommunicationDraft with status "discarded".
 *
 * PRODUCT_SPEC.md Section 13 — discarding is a terminal, no-send action; nothing is
 * communicated externally as a result of this call.
 */
export async function discardDraft(_draftId: string): Promise<CommunicationDraft> {
  // TODO: On success, write an AuditLogEntry using a status-change style entry so
  // discards are traceable too, not just sends.
  throw new Error("TODO: discardDraft is not implemented.");
}

/**
 * Inputs: a draft the user wants to revisit later, and the time to resurface it.
 * Output: the updated CommunicationDraft with status "snoozed" until the given time.
 *
 * PRODUCT_SPEC.md Section 13 — snoozing defers the decision; it must not be treated as
 * approval, and must not trigger a send.
 */
export async function snoozeDraft(_draftId: string, _until: Date): Promise<CommunicationDraft> {
  throw new Error("TODO: snoozeDraft is not implemented.");
}