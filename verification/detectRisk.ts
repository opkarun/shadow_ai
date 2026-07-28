import type { Commitment, Evidence } from "../shared/types";

export interface RiskDetectionResult {
  is_at_risk: boolean;
  risk_score: number;
  explanation: string;
}

/**
 * Inputs: an open commitment, current evidence, and evaluation time.
 * Output: risk flag, risk score, and human-readable contributing factors.
 *
 * PRODUCT_SPEC.md Section 17 requires risk to consider deadline proximity and missing evidence.
 */
export function detectRisk(
  _commitment: Commitment,
  _evidence: Evidence[],
  _evaluatedAt: Date
): RiskDetectionResult {
  // TODO: Apply configurable risk-window logic and activity checks.
  throw new Error("TODO: detectRisk is not implemented.");
}
