/**
 * Verification Module - Local Types
 *
 * Defines interfaces and types specific to the Verification module.
 * All shared types (Commitment, Evidence, EvidenceType) are imported from
 * shared/types and never redefined here.
 */

import type {
  Commitment,
  Evidence,
  EvidenceType,
  CommitmentStatus,
} from "../shared/types";

/**
 * Result of matching a single piece of evidence to a commitment.
 *
 * Evaluates how strongly a piece of evidence (e.g., a GitHub commit or PR)
 * supports the claim that a specific commitment has been fulfilled.
 */
export interface EvidenceMatchResult {
  /** The evidence being evaluated */
  evidence: Evidence;

  /** The commitment being matched against */
  commitment: Commitment;

  /** Confidence score (0.0 to 1.0) of the match */
  match_confidence: number;

  /** Why this confidence score was assigned */
  reasoning: string;

  /** Whether this match is strong enough to auto-confirm completion */
  is_sufficient_for_completion: boolean;
}

/**
 * Aggregated evidence matching result for a commitment.
 *
 * Summarizes all evidence collected for a commitment and determines
 * whether there is sufficient evidence to mark it complete.
 */
export interface CommitmentVerificationResult {
  /** The commitment being verified */
  commitment: Commitment;

  /** All evidence evaluated for this commitment */
  evidence_matches: EvidenceMatchResult[];

  /** Highest confidence match found (if any) */
  strongest_match: EvidenceMatchResult | null;

  /** Whether sufficient evidence exists to complete the commitment */
  is_complete: boolean;

  /** Recommended status transition (if any) */
  recommended_status: CommitmentStatus | null;

  /** Explanation of the verification result */
  summary: string;
}

/**
 * Result of risk detection for a single commitment.
 *
 * Determines if a commitment is at risk of being missed based on
 * time remaining, evidence collected, and activity patterns.
 */
export interface RiskDetectionResult {
  /** The commitment being assessed */
  commitment: Commitment;

  /** Risk score (0.0 to 1.0, higher = more at risk) */
  risk_score: number;

  /** Whether the commitment is considered at risk */
  is_at_risk: boolean;

  /** Factors contributing to the risk assessment */
  contributing_factors: RiskFactors;

  /** Explanation of the risk assessment */
  explanation: string;
}

/**
 * Detailed breakdown of risk detection factors.
 *
 * Shows which signals triggered the at-risk flag and their relative weight.
 */
export interface RiskFactors {
  /** Proportion of time-to-deadline elapsed (0.0 to 1.0) */
  time_elapsed_ratio: number;

  /** Evidence collected so far (0.0 to 1.0, higher = more evidence) */
  evidence_completeness: number;

  /** Activity in linked repository near deadline (0.0 to 1.0, higher = more activity) */
  github_activity_signal: number;

  /** Time remaining (in milliseconds) */
  time_remaining_ms: number;

  /** Whether time_remaining is within the risk window */
  is_within_risk_window: boolean;

  /** Manual user flag indicating risk */
  manually_flagged_at_risk: boolean;
}

/**
 * Context needed for evidence matching and risk detection.
 *
 * Bundles a commitment with all available evidence to enable comprehensive
 * verification logic.
 */
export interface VerificationContext {
  /** The commitment being verified */
  commitment: Commitment;

  /** All evidence collected for this commitment */
  available_evidence: Evidence[];

  /** GitHub repository name (if linked) */
  linked_repo?: string;

  /** User's GitHub username (for activity analysis) */
  github_username?: string;

  /** Current time (for risk calculations) */
  current_time: Date;
}

/**
 * Validation result for evidence before matching.
 *
 * Checks if a piece of evidence is valid and applicable before
 * attempting to match it to a commitment.
 */
export interface EvidenceValidationResult {
  /** The evidence being validated */
  evidence: Evidence;

  /** Whether the evidence is valid and applicable */
  is_valid: boolean;

  /** Reason if invalid */
  invalid_reason?: string;
}
