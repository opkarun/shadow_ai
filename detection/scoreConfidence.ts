import type { Commitment } from "../shared/types";

export type ConfidenceTier = "High" | "Medium" | "Low";

export interface ConfidenceScoreResult {
  confidence_score: number;
  tier: ConfidenceTier;
  explanation: string;
}

/**
 * Inputs: an extracted candidate commitment.
 * Output: confidence score, High/Medium/Low tier, and explainability text.
 *
 * PRODUCT_SPEC.md Section 16 defines the tier behavior; numeric thresholds are tuning config.
 */
export function scoreConfidence(_candidate: Commitment): ConfidenceScoreResult {
  // TODO: Score deadline, requester, action, deliverable, acceptance language, and ambiguity signals.
  throw new Error("TODO: scoreConfidence is not implemented.");
}
