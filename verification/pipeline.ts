/**
 * Verification Pipeline Orchestrator
 *
 * Wires together the three core stages of commitment verification:
 * 1. Evidence Matching - Analyze if evidence supports completion
 * 2. Verification Decision - Aggregate evidence and determine completion verdict
 * 3. Persistence - Transition status and log results
 *
 * Also supports risk assessment workflow:
 * 1. Risk Evaluation - Assess deadline risk
 * 2. Persistence - Flag AT_RISK if appropriate
 *
 * This is the internal orchestrator; use verification/index.ts for the public API.
 */

import { logger } from "../shared/utils";
import {
  matchEvidenceToCommitment,
  verifyCommitment,
} from "./evidenceMatcher";
import {
  assessCommitmentRisk,
  isCommitmentOverdue,
} from "./riskEngine";
import {
  persistVerificationResult,
  persistRiskAssessment,
  markCommitmentOverdue,
} from "./persist";
import type { Commitment, Evidence } from "../shared/types";
import type {
  CommitmentVerificationResult,
  RiskDetectionResult,
} from "./types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input context for verification pipeline.
 * Bundles a commitment with all available evidence for verification.
 */
export interface VerificationPipelineInput {
  commitment: Commitment;
  evidence: Evidence[];
  additionalContext?: Record<string, Record<string, string>>;
}

/**
 * Input context for risk assessment pipeline.
 */
export interface RiskAssessmentPipelineInput {
  commitment: Commitment;
  evidence: Evidence[];
  githubActivity?: {
    lastCommitDaysAgo: number | null;
    lastPRDaysAgo: number | null;
  };
}

/**
 * Result of the complete verification pipeline.
 * Includes verification result and persisted commitment state.
 */
export interface VerificationPipelineResult {
  commitment: Commitment;
  verificationResult: CommitmentVerificationResult;
  persistedCommitment: Commitment;
  statusChanged: boolean;
}

/**
 * Result of the risk assessment pipeline.
 * Includes risk assessment and updated commitment state.
 */
export interface RiskAssessmentPipelineResult {
  commitment: Commitment;
  riskResult: RiskDetectionResult;
  persistedCommitment: Commitment;
  statusChanged: boolean;
}

/**
 * Result of deadline check workflow.
 */
export interface OverdueCheckResult {
  commitment: Commitment;
  isOverdue: boolean;
  persistedCommitment?: Commitment;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Run the complete verification pipeline on a commitment.
 *
 * Orchestrates:
 * 1. Evidence Matching - Analyze each piece of evidence
 * 2. Verification Decision - Aggregate and determine completion
 * 3. Persistence - Persist result and transition status if needed
 *
 * @param input Commitment and evidence context
 * @returns Verification result with persisted commitment state
 * @throws Error if any stage fails catastrophically
 */
export async function runVerificationPipeline(
  input: VerificationPipelineInput
): Promise<VerificationPipelineResult> {
  const { commitment, evidence, additionalContext } = input;

  logger.info("Starting verification pipeline", {
    commitment_id: commitment.id,
    evidence_count: evidence.length,
    title: commitment.title,
  });

  const originalStatus = commitment.status;

  try {
    // Stage 1: Verify commitment against evidence
    logger.info("Stage 1: Verifying commitment");

    const verificationResult = await verifyCommitment(
      commitment,
      evidence,
      additionalContext
    );

    logger.info("Verification complete", {
      commitment_id: commitment.id,
      is_complete: verificationResult.is_complete,
      evidence_count: verificationResult.evidence_matches.length,
      strongest_confidence:
        verificationResult.strongest_match?.match_confidence || 0,
    });

    // Stage 2: Persist result
    logger.info("Stage 2: Persisting verification result");

    const persistedCommitment = await persistVerificationResult(
      verificationResult
    );

    const statusChanged = persistedCommitment.status !== originalStatus;

    logger.info("Verification pipeline complete", {
      commitment_id: commitment.id,
      original_status: originalStatus,
      new_status: persistedCommitment.status,
      status_changed: statusChanged,
    });

    return {
      commitment,
      verificationResult,
      persistedCommitment,
      statusChanged,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Verification pipeline failed", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Run risk assessment pipeline on a commitment.
 *
 * Orchestrates:
 * 1. Risk Evaluation - Calculate risk score from time, evidence, activity
 * 2. Persistence - Flag AT_RISK if appropriate, log assessment
 *
 * @param input Commitment, evidence, and optional activity context
 * @returns Risk assessment result with persisted commitment state
 * @throws Error if any stage fails catastrophically
 */
export async function runRiskAssessmentPipeline(
  input: RiskAssessmentPipelineInput
): Promise<RiskAssessmentPipelineResult> {
  const { commitment, evidence, githubActivity } = input;

  logger.info("Starting risk assessment pipeline", {
    commitment_id: commitment.id,
    title: commitment.title,
    deadline: commitment.deadline?.toISOString() || "No deadline",
  });

  const originalStatus = commitment.status;

  try {
    // Stage 1: Assess risk
    logger.info("Stage 1: Assessing commitment risk");

    const riskResult = await assessCommitmentRisk(
      commitment,
      evidence,
      new Date(),
      githubActivity
    );

    logger.info("Risk assessment complete", {
      commitment_id: commitment.id,
      risk_score: riskResult.risk_score,
      is_at_risk: riskResult.is_at_risk,
    });

    // Stage 2: Persist result
    logger.info("Stage 2: Persisting risk assessment");

    const persistedCommitment = await persistRiskAssessment(
      riskResult
    );

    const statusChanged = persistedCommitment.status !== originalStatus;

    logger.info("Risk assessment pipeline complete", {
      commitment_id: commitment.id,
      original_status: originalStatus,
      new_status: persistedCommitment.status,
      status_changed: statusChanged,
    });

    return {
      commitment,
      riskResult,
      persistedCommitment,
      statusChanged,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Risk assessment pipeline failed", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Check for overdue commitments and mark them.
 *
 * Implements PRODUCT_SPEC hard rule: "Time passing is never evidence.
 * A commitment with a passed deadline and no matching evidence must
 * transition to OVERDUE."
 *
 * @param commitment Commitment to check
 * @param evidence Evidence collected for commitment
 * @returns Check result with overdue status and persisted commitment if marked
 * @throws Error if persistence fails
 */
export async function checkAndMarkOverdue(
  commitment: Commitment,
  evidence: Evidence[]
): Promise<OverdueCheckResult> {
  logger.info("Checking if commitment is overdue", {
    commitment_id: commitment.id,
    deadline: commitment.deadline?.toISOString() || "No deadline",
  });

  const isOverdue = isCommitmentOverdue(commitment, evidence);

  if (!isOverdue) {
    logger.info("Commitment is not overdue", {
      commitment_id: commitment.id,
    });

    return {
      commitment,
      isOverdue: false,
    };
  }

  logger.info("Commitment is overdue, marking", {
    commitment_id: commitment.id,
  });

  try {
    const persistedCommitment = await markCommitmentOverdue(commitment);

    return {
      commitment,
      isOverdue: true,
      persistedCommitment,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Failed to mark commitment overdue", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Batch process verification for multiple commitments.
 *
 * Runs verification pipeline for each commitment independently.
 * Continues on individual failures; collects results and errors.
 *
 * @param inputs Array of verification contexts
 * @returns Array of successful results and count of failures
 */
export async function runVerificationPipelineBatch(
  inputs: VerificationPipelineInput[]
): Promise<{
  results: VerificationPipelineResult[];
  failureCount: number;
}> {
  logger.info("Starting batch verification pipeline", {
    count: inputs.length,
  });

  const results: VerificationPipelineResult[] = [];
  let failureCount = 0;

  for (const input of inputs) {
    try {
      const result = await runVerificationPipeline(input);
      results.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Batch verification failed for single commitment", {
        commitment_id: input.commitment.id,
        error: errorMessage,
      });

      failureCount++;
    }
  }

  logger.info("Batch verification pipeline complete", {
    successCount: results.length,
    failureCount,
    totalCount: inputs.length,
  });

  return { results, failureCount };
}

/**
 * Batch process risk assessment for multiple commitments.
 *
 * Runs risk assessment pipeline for each commitment independently.
 * Continues on individual failures; collects results and errors.
 *
 * @param inputs Array of risk assessment contexts
 * @returns Array of successful results and count of failures
 */
export async function runRiskAssessmentPipelineBatch(
  inputs: RiskAssessmentPipelineInput[]
): Promise<{
  results: RiskAssessmentPipelineResult[];
  failureCount: number;
}> {
  logger.info("Starting batch risk assessment pipeline", {
    count: inputs.length,
  });

  const results: RiskAssessmentPipelineResult[] = [];
  let failureCount = 0;

  for (const input of inputs) {
    try {
      const result = await runRiskAssessmentPipeline(input);
      results.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Batch risk assessment failed for single commitment", {
        commitment_id: input.commitment.id,
        error: errorMessage,
      });

      failureCount++;
    }
  }

  logger.info("Batch risk assessment pipeline complete", {
    successCount: results.length,
    failureCount,
    totalCount: inputs.length,
  });

  return { results, failureCount };
}

/**
 * Check multiple commitments for overdue status.
 *
 * Continues on individual failures; collects results and errors.
 *
 * @param commitments Array of commitments to check
 * @param evidenceMap Map of commitment ID to evidence array
 * @returns Array of check results and count of failures
 */
export async function checkAndMarkOverdueBatch(
  commitments: Commitment[],
  evidenceMap: Record<string, Evidence[]>
): Promise<{
  results: OverdueCheckResult[];
  failureCount: number;
}> {
  logger.info("Starting batch overdue check", {
    count: commitments.length,
  });

  const results: OverdueCheckResult[] = [];
  let failureCount = 0;

  for (const commitment of commitments) {
    try {
      const evidence = evidenceMap[commitment.id] || [];
      const result = await checkAndMarkOverdue(commitment, evidence);
      results.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Batch overdue check failed for single commitment", {
        commitment_id: commitment.id,
        error: errorMessage,
      });

      failureCount++;
    }
  }

  logger.info("Batch overdue check complete", {
    successCount: results.length,
    failureCount,
    totalCount: commitments.length,
    overdueCount: results.filter((r) => r.isOverdue).length,
  });

  return { results, failureCount };
}
