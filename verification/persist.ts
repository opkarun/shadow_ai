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
import { logger } from "../shared/utils/index.js";
import { connectMongo } from "../shared/db/connect.js";
import {
  CommitmentModel,
  AuditLogEntryModel,
} from "../shared/db/models.js";
import {
  transitionCommitmentStatus,
  commitmentStatusTransitions,
} from "../shared/db/stateMachine.js";
import type { Commitment, CommitmentStatus } from "../shared/types/index.js";
import { OVERDUE_TRANSITION_CONFIG, LOG_STATUS_TRANSITIONS } from "./config.js";
import type {
  CommitmentVerificationResult,
  RiskDetectionResult,
} from "./types.js";
import { generateAndQueueDraft } from "../communication/index.js";

/**
 * Persist a verification result and transition commitment status if appropriate.
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

      // Automatically queue completion draft for user review
      generateAndQueueDraft("completion", {
        commitment: updated,
        evidence: [strongest_match.evidence],
      }).catch((err) =>
        logger.warn("Auto completion draft failed:", err)
      );

      return updated;
    }

    await AuditLogEntryModel.create({
      id: randomUUID(),
      commitment_id: commitment.id,
      event_type: "evidence_matched",
      before_state: { status: commitment.status },
      after_state: { status: commitment.status },
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

        // Automatically queue recovery draft for at-risk commitment
        generateAndQueueDraft("recovery", {
          commitment: updated,
        }).catch((err) =>
          logger.warn("Auto recovery draft failed:", err)
        );
      }
    }

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
 */
export async function markCommitmentOverdue(
  commitment: Commitment
): Promise<Commitment> {
  await connectMongo();

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

    // Automatically queue recovery draft when commitment becomes overdue
    generateAndQueueDraft("recovery", {
      commitment: updated,
    }).catch((err) =>
      logger.warn("Auto overdue recovery draft failed:", err)
    );

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

      continue;
    }
  }

  logger.info("Batch risk assessment persistence complete", {
    successCount: results.length,
    totalCount: riskResults.length,
  });

  return results;
}
