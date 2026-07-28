import type { Commitment } from "../shared/types";
import type { NormalizedGmailMessage } from "./prefilter";

/**
 * Inputs: Gmail messages that passed pre-filtering.
 * Output: candidate Commitment objects with extracted task, requester, deadline, source, and verification method.
 *
 * PRODUCT_SPEC.md Sections 8 and 16 require low-confidence candidates to be dismissed,
 * medium-confidence candidates to await confirmation, and high-confidence candidates to be confirmed.
 */
export async function extractCommitments(_messages: NormalizedGmailMessage[]): Promise<Commitment[]> {
  // TODO: Call Gemini Flash extraction only after pre-filtering has passed.
  throw new Error("TODO: extractCommitments is not implemented.");
}
