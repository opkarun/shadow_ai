/**
 * Risk Detection Engine
 *
 * Evaluates whether commitments are at risk of missing their deadlines.
 * Considers time remaining, evidence collected, and activity patterns.
 *
 * PRODUCT_SPEC Section 17 (Risk Detection Logic):
 * - Time-based: proportion of time-to-deadline elapsed with zero evidence
 * - Activity-based: absence of commits/PRs as deadline nears
 * - Never assume completion from elapsed time alone
 */

import { logger } from "../shared/utils";
import { detectCommitmentRisk } from "./geminiIntegration";
import {
  buildRiskDetectionSystemPrompt,
  buildRiskDetectionUserPrompt,
} from "./prompts";
import {
  RISK_DETECTION_CONFIG,
  RISK_SCORING_WEIGHTS,
  RISK_THRESHOLDS,
  LOG_RISK_DETECTION,
} from "./config";
import type { Commitment, Evidence } from "../shared/types";
import type { RiskDetectionResult, RiskFactors } from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Detect if a commitment is at risk of missing its deadline.
 *
 * Evaluates risk based on:
 * - Time remaining vs. deadline
 * - Evidence collected so far
 * - Activity signals (for GitHub-linked commitments)
 * - Historical patterns (if available)
 *
 * @param commitment The commitment being assessed
 * @param evidence Evidence collected for this commitment
 * @param evaluatedAt Time of evaluation (defaults to now)
 * @param githubActivity Optional GitHub activity metrics
 * @returns Risk assessment with score and contributing factors
 * @throws Error if risk calculation fails
 */
export async function assessCommitmentRisk(
  commitment: Commitment,
  evidence: Evidence[],
  evaluatedAt: Date = new Date(),
  githubActivity?: {
    lastCommitDaysAgo: number | null;
    lastPRDaysAgo: number | null;
  }
): Promise<RiskDetectionResult> {
  validateRiskInputs(commitment, evidence, evaluatedAt);

  logger.info("Assessing commitment risk", {
    commitment_id: commitment.id,
    title: commitment.title,
    deadline: commitment.deadline?.toISOString() || "No deadline",
    evidence_count: evidence.length,
  });

  try {
    // Calculate time-based factors
    const timeFactors = calculateTimeFactors(
      commitment,
      evaluatedAt
    );

    // Calculate evidence-based factors
    const evidenceCompleteness = Math.min(
      evidence.length > 0 ? 0.7 : 0.0,
      1.0
    );

    // Calculate GitHub activity signal (if applicable)
    const githubActivitySignal = githubActivity
      ? calculateGitHubActivitySignal(githubActivity, timeFactors.time_remaining_ms)
      : 0.5; // Neutral if no data

    // Determine if within risk window
    const isWithinRiskWindow =
      timeFactors.is_within_risk_window &&
      evidenceCompleteness < 0.5;

    // Calculate overall risk score
    const riskScore = calculateRiskScore(
      timeFactors.time_elapsed_ratio,
      evidenceCompleteness,
      githubActivitySignal,
      isWithinRiskWindow
    );

    // Determine if at risk
    const isAtRisk = riskScore >= RISK_THRESHOLDS.AT_RISK;

    // Build factors object
    const factors: RiskFactors = {
      time_elapsed_ratio: timeFactors.time_elapsed_ratio,
      evidence_completeness: evidenceCompleteness,
      github_activity_signal: githubActivitySignal,
      time_remaining_ms: timeFactors.time_remaining_ms,
      is_within_risk_window: isWithinRiskWindow,
      manually_flagged_at_risk: false, // Would be set by user flagging
    };

    // Generate explanation
    const explanation = generateRiskExplanation(
      commitment,
      riskScore,
      factors
    );

    const result: RiskDetectionResult = {
      commitment,
      risk_score: riskScore,
      is_at_risk: isAtRisk,
      contributing_factors: factors,
      explanation,
    };

    if (LOG_RISK_DETECTION) {
      logger.info("Risk assessment completed", {
        commitment_id: commitment.id,
        risk_score: result.risk_score,
        is_at_risk: result.is_at_risk,
        time_elapsed_ratio: factors.time_elapsed_ratio,
        evidence_completeness: factors.evidence_completeness,
      });
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Risk assessment failed", {
      commitment_id: commitment.id,
      error: errorMessage,
    });

    throw new Error(`Failed to assess commitment risk: ${errorMessage}`);
  }
}

/**
 * Detect if a commitment is overdue (deadline passed with no completion evidence).
 *
 * Per PRODUCT_SPEC Section 14: "Time passing is never evidence. A commitment
 * with a passed deadline and no matching evidence must transition to OVERDUE,
 * never silently to COMPLETED."
 *
 * @param commitment The commitment to check
 * @param evidence Evidence collected for this commitment
 * @param evaluatedAt Current time (defaults to now)
 * @returns True if commitment is overdue
 */
export function isCommitmentOverdue(
  commitment: Commitment,
  evidence: Evidence[],
  evaluatedAt: Date = new Date()
): boolean {
  validateRiskInputs(commitment, evidence, evaluatedAt);

  // No deadline means no "overdue" state
  if (!commitment.deadline) {
    return false;
  }

  // Check if deadline has passed
  if (evaluatedAt <= commitment.deadline) {
    return false;
  }

  // Deadline has passed — commitment is overdue if no completion evidence
  const hasCompletionEvidence = evidence.some(
    (e) =>
      e.evidence_type === "github_commit" ||
      e.evidence_type === "github_pr" ||
      e.evidence_type === "github_release" ||
      e.evidence_type === "calendar_attendance" ||
      e.evidence_type === "manual"
  );

  if (!hasCompletionEvidence) {
    logger.info("Commitment is overdue with no evidence", {
      commitment_id: commitment.id,
      deadline: commitment.deadline.toISOString(),
      evaluated_at: evaluatedAt.toISOString(),
    });
    return true;
  }

  return false;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Validate risk assessment inputs.
 */
function validateRiskInputs(
  commitment: Commitment,
  evidence: Evidence[],
  evaluatedAt: Date
): void {
  if (!commitment || !commitment.id) {
    throw new Error("Commitment is required and must have an ID");
  }

  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  if (!(evaluatedAt instanceof Date)) {
    throw new Error("Evaluated at must be a Date");
  }

  if (isNaN(evaluatedAt.getTime())) {
    throw new Error("Evaluated at must be a valid Date");
  }
}

/**
 * Calculate time-based risk factors.
 */
function calculateTimeFactors(
  commitment: Commitment,
  evaluatedAt: Date
): {
  time_elapsed_ratio: number;
  time_remaining_ms: number;
  is_within_risk_window: boolean;
  total_duration_ms: number;
} {
  const now = evaluatedAt.getTime();
  const deadline = commitment.deadline ? commitment.deadline.getTime() : null;
  const created = commitment.created_at.getTime();

  if (!deadline) {
    // No deadline - can't assess time-based risk
    return {
      time_elapsed_ratio: 0,
      time_remaining_ms: Infinity,
      is_within_risk_window: false,
      total_duration_ms: 0,
    };
  }

  const totalDuration = deadline - created;
  const timeElapsed = now - created;
  const timeRemaining = deadline - now;

  // Clamp ratios to 0-1
  const timeElapsedRatio = Math.max(0, Math.min(1, timeElapsed / totalDuration));

  // Determine if within risk window
  // Risk window = 25% of total duration (from config), with minimum time check
  const riskWindowDuration = totalDuration *
    RISK_DETECTION_CONFIG.RISK_WINDOW_PERCENTAGE;
  const minRiskWindow = Math.max(
    RISK_DETECTION_CONFIG.MIN_TIME_REMAINING_FOR_RISK_CHECK_MS,
    riskWindowDuration
  );

  const isWithinRiskWindow = timeRemaining <= minRiskWindow && timeRemaining > 0;

  return {
    time_elapsed_ratio: timeElapsedRatio,
    time_remaining_ms: Math.max(0, timeRemaining),
    is_within_risk_window: isWithinRiskWindow,
    total_duration_ms: totalDuration,
  };
}

/**
 * Calculate GitHub activity signal (0.0 = no activity, 1.0 = active).
 */
function calculateGitHubActivitySignal(
  activity: {
    lastCommitDaysAgo: number | null;
    lastPRDaysAgo: number | null;
  },
  timeRemainingMs: number
): number {
  const daysRemaining = timeRemainingMs / (24 * 60 * 60 * 1000);

  // If very recent activity, high signal
  const lastCommitDays = activity.lastCommitDaysAgo ?? Infinity;
  const lastPRDays = activity.lastPRDaysAgo ?? Infinity;
  const mostRecentActivityDays = Math.min(lastCommitDays, lastPRDays);

  if (mostRecentActivityDays === Infinity) {
    // No activity at all
    return 0.0;
  }

  if (mostRecentActivityDays === 0) {
    // Activity today - good signal
    return 1.0;
  }

  // Activity within last week - moderate signal
  if (mostRecentActivityDays <= 7) {
    return 0.7;
  }

  // Activity older than a week - weak signal
  if (mostRecentActivityDays <= daysRemaining) {
    return 0.3;
  }

  // Activity is from before the deadline was set - very weak signal
  return 0.0;
}

/**
 * Calculate overall risk score from components.
 */
function calculateRiskScore(
  timeElapsedRatio: number,
  evidenceCompleteness: number,
  githubActivitySignal: number,
  isWithinRiskWindow: boolean
): number {
  // Base score from time pressure
  let timeScore = timeElapsedRatio;

  // Adjust based on whether in risk window
  if (isWithinRiskWindow) {
    timeScore = Math.max(timeScore, 0.65); // At least medium-high risk if in window
  }

  // Evidence reduces risk (more evidence = lower risk)
  const evidenceRisk = 1.0 - evidenceCompleteness;

  // GitHub activity reduces risk (more activity = lower risk)
  const activityRisk = 1.0 - githubActivitySignal;

  // Weighted combination
  const riskScore =
    timeScore * RISK_SCORING_WEIGHTS.TIME_ELAPSED_WEIGHT +
    evidenceRisk * RISK_SCORING_WEIGHTS.EVIDENCE_WEIGHT +
    activityRisk * RISK_SCORING_WEIGHTS.GITHUB_ACTIVITY_WEIGHT;

  // Clamp to 0-1
  return Math.max(0, Math.min(1, riskScore));
}

/**
 * Generate human-readable risk explanation.
 */
function generateRiskExplanation(
  commitment: Commitment,
  riskScore: number,
  factors: RiskFactors
): string {
  const riskLevel =
    riskScore >= RISK_THRESHOLDS.CRITICAL
      ? "critical"
      : riskScore >= RISK_THRESHOLDS.AT_RISK
        ? "high"
        : "moderate";

  const percentElapsed = Math.round(factors.time_elapsed_ratio * 100);
  const daysRemaining = Math.round(
    factors.time_remaining_ms / (24 * 60 * 60 * 1000)
  );

  let explanation = `"${commitment.title}" is at ${riskLevel} risk (${Math.round(riskScore * 100)}% risk score). `;

  if (factors.is_within_risk_window) {
    explanation += `Deadline approaches in ${daysRemaining} days with limited evidence collected. `;
  } else {
    explanation += `${percentElapsed}% of timeline elapsed. `;
  }

  if (factors.evidence_completeness < 0.3) {
    explanation += "No completion evidence yet. ";
  } else if (factors.evidence_completeness < 0.7) {
    explanation += "Some evidence collected. ";
  }

  if (riskScore >= RISK_THRESHOLDS.AT_RISK) {
    explanation +=
      "Consider requesting a deadline extension or escalating progress.";
  }

  return explanation;
}
