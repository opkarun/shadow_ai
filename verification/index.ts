/**
 * Verification Module - Public API
 *
 * Single entry point for the entire Verification module.
 * Orchestrates evidence matching, verification decision, risk assessment,
 * and persistence.
 *
 * Usage:
 *   const results = await verifyCommitments(inputs);
 *   const risks = await assessRisk(inputs);
 *   const overdue = await checkOverdue(commitments, evidenceMap);
 */

import { logger } from "../shared/utils";
import {
  runVerificationPipeline,
  runVerificationPipelineBatch,
  runRiskAssessmentPipeline,
  runRiskAssessmentPipelineBatch,
  checkAndMarkOverdue,
  checkAndMarkOverdueBatch,
  type VerificationPipelineInput,
  type RiskAssessmentPipelineInput,
  type VerificationPipelineResult,
  type RiskAssessmentPipelineResult,
  type OverdueCheckResult,
} from "./pipeline";
import type {
  Commitment,
  Evidence,
} from "../shared/types";

// ============================================================================
// MAIN ENTRY POINTS
// ============================================================================

/**
 * Verify a single commitment against its evidence.
 *
 * Main entry point for evidence-based verification.
 * Orchestrates the full verification workflow:
 * 1. Match each piece of evidence to the commitment
 * 2. Aggregate evidence and determine completion verdict
 * 3. Persist result and transition status if needed
 *
 * Only medium-or-higher confidence evidence can complete a commitment.
 *
 * @param commitment The commitment to verify
 * @param evidence Evidence collected for this commitment
 * @param additionalContext Optional metadata (commit messages, PR descriptions, etc.)
 * @returns Verification result with persisted commitment state
 *
 * @example
 * const result = await verifyCommitment(commitment, evidence);
 * if (result.statusChanged) {
 *   console.log(`Commitment marked ${result.persistedCommitment.status}`);
 * }
 */
export async function verifyCommitment(
  commitment: Commitment,
  evidence: Evidence[],
  additionalContext?: Record<string, Record<string, string>>
): Promise<VerificationPipelineResult> {
  logger.info("Verifying commitment", {
    commitment_id: commitment.id,
    evidence_count: evidence.length,
  });

  try {
    const result = await runVerificationPipeline({
      commitment,
      evidence,
      additionalContext,
    });

    logger.info("Commitment verification complete", {
      commitment_id: commitment.id,
      is_complete: result.verificationResult.is_complete,
      status_changed: result.statusChanged,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Commitment verification failed", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Verify multiple commitments in batch.
 *
 * Runs verification pipeline for each commitment independently.
 * Continues on individual failures.
 *
 * @param inputs Array of commitments with evidence
 * @returns Array of successful verifications and count of failures
 *
 * @example
 * const { results, failureCount } = await verifyCommitments([
 *   { commitment: c1, evidence: e1 },
 *   { commitment: c2, evidence: e2 },
 * ]);
 */
export async function verifyCommitments(
  inputs: Array<{
    commitment: Commitment;
    evidence: Evidence[];
    additionalContext?: Record<string, Record<string, string>>;
  }>
): Promise<{
  results: VerificationPipelineResult[];
  failureCount: number;
}> {
  logger.info("Starting batch verification", {
    count: inputs.length,
  });

  try {
    const batchInputs: VerificationPipelineInput[] = inputs.map(
      (input) => ({
        commitment: input.commitment,
        evidence: input.evidence,
        additionalContext: input.additionalContext,
      })
    );

    const result = await runVerificationPipelineBatch(batchInputs);

    logger.info("Batch verification complete", {
      successCount: result.results.length,
      failureCount: result.failureCount,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Batch verification failed", {
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Assess risk for a single commitment.
 *
 * Main entry point for risk-based assessment.
 * Orchestrates the risk assessment workflow:
 * 1. Calculate risk score from time, evidence, and activity signals
 * 2. Determine if commitment is AT_RISK
 * 3. Persist assessment and flag if needed
 *
 * Risk is based on:
 * - Time remaining vs. deadline (configurable window)
 * - Evidence collected so far
 * - GitHub activity (for linked repositories)
 *
 * @param commitment The commitment to assess
 * @param evidence Evidence collected for this commitment
 * @param githubActivity Optional GitHub activity metrics
 * @returns Risk assessment result with persisted commitment state
 *
 * @example
 * const result = await assessRisk(commitment, evidence, {
 *   lastCommitDaysAgo: 2,
 *   lastPRDaysAgo: 1,
 * });
 * if (result.riskResult.is_at_risk) {
 *   console.log("Commitment is at risk!");
 * }
 */
export async function assessRisk(
  commitment: Commitment,
  evidence: Evidence[],
  githubActivity?: {
    lastCommitDaysAgo: number | null;
    lastPRDaysAgo: number | null;
  }
): Promise<RiskAssessmentPipelineResult> {
  logger.info("Assessing commitment risk", {
    commitment_id: commitment.id,
    evidence_count: evidence.length,
  });

  try {
    const result = await runRiskAssessmentPipeline({
      commitment,
      evidence,
      githubActivity,
    });

    logger.info("Risk assessment complete", {
      commitment_id: commitment.id,
      risk_score: result.riskResult.risk_score,
      is_at_risk: result.riskResult.is_at_risk,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Risk assessment failed", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Assess risk for multiple commitments in batch.
 *
 * Runs risk assessment pipeline for each commitment independently.
 * Continues on individual failures.
 *
 * @param inputs Array of commitments with evidence
 * @returns Array of successful assessments and count of failures
 */
export async function assessRisks(
  inputs: Array<{
    commitment: Commitment;
    evidence: Evidence[];
    githubActivity?: {
      lastCommitDaysAgo: number | null;
      lastPRDaysAgo: number | null;
    };
  }>
): Promise<{
  results: RiskAssessmentPipelineResult[];
  failureCount: number;
}> {
  logger.info("Starting batch risk assessment", {
    count: inputs.length,
  });

  try {
    const batchInputs: RiskAssessmentPipelineInput[] = inputs.map(
      (input) => ({
        commitment: input.commitment,
        evidence: input.evidence,
        githubActivity: input.githubActivity,
      })
    );

    const result = await runRiskAssessmentPipelineBatch(batchInputs);

    logger.info("Batch risk assessment complete", {
      successCount: result.results.length,
      failureCount: result.failureCount,
      atRiskCount: result.results.filter(
        (r) => r.riskResult.is_at_risk
      ).length,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Batch risk assessment failed", {
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Check if a commitment is overdue and mark it if so.
 *
 * Implements PRODUCT_SPEC hard rule: "Time passing is never evidence.
 * A commitment with a passed deadline and no matching evidence must
 * transition to OVERDUE."
 *
 * @param commitment The commitment to check
 * @param evidence Evidence collected for this commitment
 * @returns Check result with overdue status
 *
 * @example
 * const result = await checkOverdue(commitment, evidence);
 * if (result.isOverdue) {
 *   console.log("Commitment is overdue!");
 * }
 */
export async function checkOverdue(
  commitment: Commitment,
  evidence: Evidence[]
): Promise<OverdueCheckResult> {
  logger.info("Checking if commitment is overdue", {
    commitment_id: commitment.id,
  });

  try {
    const result = await checkAndMarkOverdue(commitment, evidence);

    logger.info("Overdue check complete", {
      commitment_id: commitment.id,
      is_overdue: result.isOverdue,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Overdue check failed", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Check multiple commitments for overdue status in batch.
 *
 * Continues on individual failures.
 *
 * @param commitments Array of commitments to check
 * @param evidenceMap Map of commitment ID to evidence array
 * @returns Array of check results and count of failures
 */
export async function checkOverdues(
  commitments: Commitment[],
  evidenceMap: Record<string, Evidence[]>
): Promise<{
  results: OverdueCheckResult[];
  failureCount: number;
}> {
  logger.info("Starting batch overdue check", {
    count: commitments.length,
  });

  try {
    const result = await checkAndMarkOverdueBatch(
      commitments,
      evidenceMap
    );

    logger.info("Batch overdue check complete", {
      successCount: result.results.length,
      failureCount: result.failureCount,
      overdueCount: result.results.filter((r) => r.isOverdue).length,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Batch overdue check failed", {
      error: errorMessage,
    });

    throw error;
  }
}

// ============================================================================
// EXPORTS - Public API
// ============================================================================

// Types (for external use)
export type { Commitment, Evidence } from "../shared/types";
export type {
  EvidenceMatchResult,
  CommitmentVerificationResult,
  RiskDetectionResult,
  RiskFactors,
  VerificationContext,
} from "./types";
export type {
  VerificationPipelineInput,
  RiskAssessmentPipelineInput,
  VerificationPipelineResult,
  RiskAssessmentPipelineResult,
  OverdueCheckResult,
} from "./pipeline";

// Core functions (advanced use cases)
export { matchEvidenceToCommitment } from "./evidenceMatcher";
export { assessCommitmentRisk, isCommitmentOverdue } from "./riskEngine";
export {
  persistVerificationResult,
  persistRiskAssessment,
  markCommitmentOverdue,
} from "./persist";
export {
  runVerificationPipeline,
  runRiskAssessmentPipeline,
} from "./pipeline";
