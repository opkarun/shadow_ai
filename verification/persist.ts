/**
 * Persistence Layer for Verification Results
 *
 * Saves verification results and transitions commitments through the
 * state machine based on evidence and risk assessment.
 *
 * Uses shared state machine to ensure valid status transitions.
 * Creates audit log entries for all state changes.
 */

import { randomUUID } from "crypto";
import { logger } from "../shared/utils";
import { connectMongo } from "../shared/db/connect";
import {
  CommitmentModel,
  AuditLogEntryModel,
} from "../shared/db/models";
import {
  transitionCommitmentStatus,
  commitmentStatusTransitions,
} from "../shared/db/stateMachine";
import type { Commitment, CommitmentStatus } from "../shared/types";
import { OVERDUE_TRANSITION_CONFIG, LOG_STATUS_TRANSITIONS } from "./config";
import type {
  CommitmentVerificationResult,
  RiskDetectionResult,
} from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Persist a verification result and transition commitment status if appropriate.
 *
 * Evaluates the verification result and:
 * - Transitions to COMPLETED if sufficient evidence exists
 * - Logs the verification in audit trail
 * - Returns updated commitment
 *
 * @param verificationResult Result of evidence verification
 * @returns Updated Commitment after status transition (if applicable)
 * @throws Error if database operation fails
 */
export async function persistVerificationResult(
  verificationResult: CommitmentVerificationResult
): Promise<Commitment> {
  await connectMongo();

  const { commitment, is_complete, strongest_match, summary } =
    verificationResult;

  logger.info("Persisting verification result", {
    commitment_id: commitment.id,
    is_complete,
    strongest_confidence: strongest_match?.match_confidence || 0,
  });

  try {
    // Only transition if verification indicates completion
    if (is_complete && strongest_match) {
      const updated = await transitionCommitmentStatus(
        commitment.id,
        "COMPLETED",
        {
          verification_type: "evidence_based",
          strongest_evidence_type: strongest_match.evidence.evidence_type,
          evidence_confidence:
            strongest_match.match_confidence,
          evidence_reasoning: strongest_match.reasoning,
          total_evidence_count: verificationResult.evidence_matches.length,
        }
      );

      if (LOG_STATUS_TRANSITIONS) {
        logger.info("Commitment marked complete", {
          commitment_id: commitment.id,
          evidence_type: strongest_match.evidence.evidence_type,
          confidence: strongest_match.match_confidence,
        });
      }

      return updated;
    }

    // No state transition, but log the verification attempt
    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: commitment.id,
      event_type: "evidence_matched",
      before_state: { status: commitment.status },
      after_state: { status: commitment.status }, // No change
      contributing_factors: {
        verification_summary: summary,
        evidence_count: verificationResult.evidence_matches.length,
        strongest_confidence: strongest_match?.match_confidence || 0,
        is_complete,
      },
      timestamp: new Date(),
    });

    logger.info("Verification result logged (no status change)", {
      commitment_id: commitment.id,
      summary,
    });

    return commitment;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Failed to persist verification result", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw new Error(
      `Failed to persist verification result: ${errorMessage}`
    );
  }
}

/**
 * Persist a risk assessment result.
 *
 * Updates commitment priority and transitions to AT_RISK if appropriate.
 * Also queues a recovery draft if commitment becomes overdue.
 *
 * @param riskResult Result of risk assessment
 * @returns Updated Commitment after risk assessment
 * @throws Error if database operation fails
 */
export async function persistRiskAssessment(
  riskResult: RiskDetectionResult
): Promise<Commitment> {
  await connectMongo();

  const { commitment, is_at_risk, risk_score, contributing_factors } =
    riskResult;

  logger.info("Persisting risk assessment", {
    commitment_id: commitment.id,
    is_at_risk,
    risk_score,
    current_status: commitment.status,
  });

  try {
    let updated = commitment;

    // Check if should transition to AT_RISK
    if (
      is_at_risk &&
      (commitment.status === "PENDING" ||
        commitment.status === "CONFIRMED")
    ) {
      const allowedTransitions =
        commitmentStatusTransitions[
          commitment.status as CommitmentStatus
        ] as readonly CommitmentStatus[];

      if (allowedTransitions.includes("AT_RISK")) {
        updated = await transitionCommitmentStatus(
          commitment.id,
          "AT_RISK",
          {
            risk_score,
            risk_factors: contributing_factors,
            trigger: "automated_risk_detection",
          }
        );

        if (LOG_STATUS_TRANSITIONS) {
          logger.info("Commitment flagged as at-risk", {
            commitment_id: commitment.id,
            risk_score,
          });
        }

        // TODO: Queue recovery draft (will be handled in Phase 4 Communication integration)
      }
    }

    // Log the risk assessment regardless of transition
    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: commitment.id,
      event_type: "risk_detected",
      before_state: { status: commitment.status },
      after_state: { status: updated.status },
      contributing_factors: {
        risk_score,
        is_at_risk,
        time_elapsed_ratio:
          contributing_factors.time_elapsed_ratio,
        evidence_completeness:
          contributing_factors.evidence_completeness,
        is_within_risk_window:
          contributing_factors.is_within_risk_window,
      },
      timestamp: new Date(),
    });

    logger.info("Risk assessment persisted", {
      commitment_id: commitment.id,
      status_changed: commitment.status !== updated.status,
      new_status: updated.status,
    });

    return updated;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Failed to persist risk assessment", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw new Error(
      `Failed to persist risk assessment: ${errorMessage}`
    );
  }
}

/**
 * Mark a commitment as overdue due to passed deadline with no evidence.
 *
 * Per PRODUCT_SPEC Section 14: "Time passing is never evidence.
 * A commitment with a passed deadline and no matching evidence must
 * transition to OVERDUE, never silently to COMPLETED."
 *
 * @param commitment The commitment to mark overdue
 * @returns Updated Commitment with OVERDUE status
 * @throws Error if database operation fails
 */
export async function markCommitmentOverdue(
  commitment: Commitment
): Promise<Commitment> {
  await connectMongo();

  // Verify it's actually past deadline
  const now = new Date();
  if (!commitment.deadline || now <= commitment.deadline) {
    throw new Error(
      `Cannot mark commitment overdue: deadline has not passed (deadline: ${commitment.deadline?.toISOString() || "none"})`
    );
  }

  logger.info("Marking commitment as overdue", {
    commitment_id: commitment.id,
    deadline: commitment.deadline.toISOString(),
    current_time: now.toISOString(),
  });

  try {
    const updated = await transitionCommitmentStatus(
      commitment.id,
      "OVERDUE",
      {
        reason: "deadline_passed_no_evidence",
        deadline: commitment.deadline.toISOString(),
        transitioned_at: now.toISOString(),
      }
    );

    if (LOG_STATUS_TRANSITIONS) {
      logger.info("Commitment marked overdue", {
        commitment_id: commitment.id,
        deadline: commitment.deadline.toISOString(),
      });
    }

    // TODO: Queue recovery draft if configured (Phase 4 Communication integration)
    if (OVERDUE_TRANSITION_CONFIG.AUTO_QUEUE_RECOVERY_DRAFT) {
      logger.info(
        "Queuing recovery draft for overdue commitment (TODO in Phase 4)",
        {
          commitment_id: commitment.id,
        }
      );
    }

    return updated;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Failed to mark commitment overdue", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw new Error(`Failed to mark commitment overdue: ${errorMessage}`);
  }
}

/**
 * Batch mark commitments as overdue.
 *
 * Efficiently marks multiple overdue commitments.
 *
 * @param commitments Commitments to mark overdue
 * @returns Array of updated commitments
 */
export async function markCommitmentsOverdueBatch(
  commitments: Commitment[]
): Promise<Commitment[]> {
  logger.info("Batch marking commitments as overdue", {
    count: commitments.length,
  });

  const results: Commitment[] = [];
  const errors: Array<{ commitment_id: string; error: string }> = [];

  for (const commitment of commitments) {
    try {
      const updated = await markCommitmentOverdue(commitment);
      results.push(updated);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Failed to mark commitment overdue in batch", {
        commitment_id: commitment.id,
        error: errorMessage,
      });

      errors.push({
        commitment_id: commitment.id,
        error: errorMessage,
      });
    }
  }

  logger.info("Batch overdue marking complete", {
    success_count: results.length,
    failure_count: errors.length,
    total_count: commitments.length,
  });

  if (errors.length > 0) {
    logger.warn("Some commitments failed to mark overdue", {
      errors,
    });
  }

  return results;
}

/**
 * Persist a batch of risk assessments.
 *
 * @param riskResults Array of risk assessment results
 * @returns Array of updated commitments
 */
export async function persistRiskAssessmentBatch(
  riskResults: RiskDetectionResult[]
): Promise<Commitment[]> {
  logger.info("Batch persisting risk assessments", {
    count: riskResults.length,
  });

  const results: Commitment[] = [];

  for (const riskResult of riskResults) {
    try {
      const updated = await persistRiskAssessment(riskResult);
      results.push(updated);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Failed to persist risk assessment in batch", {
        commitment_id: riskResult.commitment.id,
        error: errorMessage,
      });

      // Continue with next rather than failing entire batch
      continue;
    }
  }

  logger.info("Batch risk assessment persistence complete", {
    successCount: results.length,
    totalCount: riskResults.length,
  });

  return results;
}
