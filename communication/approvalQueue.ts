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
  throw new Error("TODO: sendApprovedDraft is not implemented.");
}
