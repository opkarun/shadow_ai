import type { CommunicationDraft, CommunicationDraftType, Commitment, Evidence } from "../shared/types";

export interface DraftContext {
  commitment: Commitment;
  evidence: Evidence[];
  prior_thread_context: string[];
}

/**
 * Inputs: a commitment, relevant evidence, prior thread context, and a draft type.
 * Output: a queued CommunicationDraft for user review.
 *
 * PRODUCT_SPEC.md Section 13 allows proactive draft generation but forbids auto-send.
 */
export async function generateDraft(
  _draftType: CommunicationDraftType,
  _context: DraftContext
): Promise<CommunicationDraft> {
  // TODO: Use Gemini Flash to draft acknowledgement, completion, recovery, or extension_request content.
  throw new Error("TODO: generateDraft is not implemented.");
}
