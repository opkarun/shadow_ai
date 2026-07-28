import type { Commitment, Evidence } from "../shared/types";

export interface VerificationEvent {
  provider: "github" | "google_calendar" | "manual";
  reference: string;
  received_at: Date;
  payload: Record<string, unknown>;
}

/**
 * Inputs: an open commitment plus a GitHub, Calendar, or manual verification event.
 * Output: evidence records that can be stored and used for a sanctioned status transition.
 *
 * PRODUCT_SPEC.md Section 14 requires real evidence; elapsed time alone is never evidence.
 */
export function matchEvidence(_commitment: Commitment, _event: VerificationEvent): Evidence[] {
  // TODO: Match GitHub commits, PRs, releases, manual confirmations, and calendar attendance.
  throw new Error("TODO: matchEvidence is not implemented.");
}
