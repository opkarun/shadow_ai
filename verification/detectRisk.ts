import type { Commitment, Evidence } from "../shared/types/index.js";

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
  commitment: Commitment,
  evidence: Evidence[],
  evaluatedAt: Date = new Date()
): RiskDetectionResult {
  if (!commitment.deadline) {
    return {
      is_at_risk: false,
      risk_score: 0.2,
      explanation: "No explicit deadline set for commitment.",
    };
  }

  const createdAt = new Date(commitment.created_at).getTime();
  const deadlineAt = new Date(commitment.deadline).getTime();
  const evalAt = evaluatedAt.getTime();

  if (evalAt >= deadlineAt) {
    return {
      is_at_risk: true,
      risk_score: 0.95,
      explanation: "Deadline has passed without verified evidence.",
    };
  }

  const totalDuration = Math.max(1, deadlineAt - createdAt);
  const elapsedDuration = Math.max(0, evalAt - createdAt);
  const timeRatio = elapsedDuration / totalDuration;

  const hasEvidence = evidence && evidence.length > 0;
  let riskScore = 0.3;

  if (timeRatio > 0.7 && !hasEvidence) {
    riskScore = 0.85;
  } else if (timeRatio > 0.5 && !hasEvidence) {
    riskScore = 0.65;
  } else if (timeRatio > 0.8 && hasEvidence) {
    riskScore = 0.4;
  }

  const isAtRisk = riskScore >= 0.6;

  return {
    is_at_risk: isAtRisk,
    risk_score: riskScore,
    explanation: isAtRisk
      ? `${Math.round(timeRatio * 100)}% of time elapsed with ${evidence.length} evidence items verified.`
      : "Commitment progress is on schedule.",
  };
}
