/**
 * Evidence Matching Engine
 *
 * Analyzes evidence and determines if it supports commitment completion.
 * Leverages Gemini for intelligent matching and confidence scoring.
 *
 * PRODUCT_SPEC Section 14 (Verification Engine):
 * - Match GitHub commits, PRs, releases to commitments
 * - Match calendar attendance to meeting commitments
 * - Support manual verification
 * - Only medium-or-higher matches auto-complete; low matches are suggestions
 */

import { logger } from "../shared/utils";
import {
  analyzeEvidenceRelevance,
  extractGitHubContext,
} from "./geminiIntegration";
import {
  buildEvidenceAnalysisSystemPrompt,
  buildEvidenceAnalysisUserPrompt,
  buildGitHubContextSystemPrompt,
  buildGitHubContextUserPrompt,
} from "./prompts";
import {
  EVIDENCE_MATCH_THRESHOLDS,
  MIN_CONFIDENCE_FOR_AUTO_COMPLETION,
  LOG_EVIDENCE_MATCHING,
} from "./config";
import type {
  Commitment,
  Evidence,
  EvidenceType,
} from "../shared/types";
import type {
  EvidenceMatchResult,
  CommitmentVerificationResult,
} from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Match a single piece of evidence against a commitment.
 *
 * Analyzes whether evidence (GitHub commit, PR, calendar event, manual confirmation)
 * supports the claim that a commitment has been fulfilled.
 *
 * @param commitment The commitment being verified
 * @param evidence The evidence being analyzed
 * @param additionalContext Metadata like commit message, PR description, etc.
 * @returns Match result with confidence score and reasoning
 * @throws Error if Gemini analysis fails
 */
export async function matchEvidenceToCommitment(
  commitment: Commitment,
  evidence: Evidence,
  additionalContext?: {
    commitMessage?: string;
    prTitle?: string;
    prDescription?: string;
    releaseNotes?: string;
    calendarTitle?: string;
    calendarDescription?: string;
  }
): Promise<EvidenceMatchResult> {
  validateEvidenceMatchInputs(commitment, evidence);

  const systemPrompt = buildEvidenceAnalysisSystemPrompt();
  const userPrompt = buildEvidenceAnalysisUserPrompt(
    commitment,
    evidence,
    additionalContext
  );

  logger.info("Matching evidence to commitment", {
    commitment_id: commitment.id,
    evidence_id: evidence.id,
    evidence_type: evidence.evidence_type,
  });

  try {
    const analysis = await analyzeEvidenceRelevance(systemPrompt, userPrompt, {
      commitment,
      evidenceType: evidence.evidence_type,
    });

    const result: EvidenceMatchResult = {
      evidence,
      commitment,
      match_confidence: analysis.confidence_score,
      reasoning: analysis.reasoning,
      is_sufficient_for_completion:
        analysis.confidence_score >= MIN_CONFIDENCE_FOR_AUTO_COMPLETION,
    };

    if (LOG_EVIDENCE_MATCHING) {
      logger.info("Evidence match analysis completed", {
        commitment_id: commitment.id,
        evidence_id: evidence.id,
        match_confidence: result.match_confidence,
        is_sufficient: result.is_sufficient_for_completion,
      });
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error("Evidence matching failed", {
      commitment_id: commitment.id,
      evidence_id: evidence.id,
      evidence_type: evidence.evidence_type,
      error: errorMessage,
    });

    throw new Error(`Failed to match evidence to commitment: ${errorMessage}`);
  }
}

/**
 * Verify a commitment against all available evidence.
 *
 * Aggregates evidence matches and determines if the commitment
 * can be marked complete based on available evidence.
 *
 * @param commitment The commitment being verified
 * @param availableEvidence All evidence collected for this commitment
 * @param additionalContext Optional metadata for evidence matching
 * @returns Verification result with overall completion assessment
 */
export async function verifyCommitment(
  commitment: Commitment,
  availableEvidence: Evidence[],
  additionalContext?: Record<string, Record<string, string>>
): Promise<CommitmentVerificationResult> {
  validateVerificationInputs(commitment, availableEvidence);

  logger.info("Verifying commitment against evidence", {
    commitment_id: commitment.id,
    evidence_count: availableEvidence.length,
  });

  const matches: EvidenceMatchResult[] = [];
  let strongestMatch: EvidenceMatchResult | null = null;

  // Match each piece of evidence
  for (const evidence of availableEvidence) {
    try {
      const context = additionalContext?.[evidence.id] || {};
      const match = await matchEvidenceToCommitment(
        commitment,
        evidence,
        context as Parameters<typeof matchEvidenceToCommitment>[2]
      );

      matches.push(match);

      // Track strongest match
      if (
        !strongestMatch ||
        match.match_confidence > strongestMatch.match_confidence
      ) {
        strongestMatch = match;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Failed to match individual evidence", {
        commitment_id: commitment.id,
        evidence_id: evidence.id,
        error: errorMessage,
      });

      // Continue with next evidence rather than failing entire verification
      continue;
    }
  }

  // Determine if sufficient evidence exists
  const isComplete =
    strongestMatch !== null &&
    strongestMatch.is_sufficient_for_completion;

  // Generate summary
  const summary = generateVerificationSummary(
    commitment,
    matches,
    strongestMatch,
    isComplete
  );

  const result: CommitmentVerificationResult = {
    commitment,
    evidence_matches: matches,
    strongest_match: strongestMatch,
    is_complete: isComplete,
    recommended_status: isComplete ? "COMPLETED" : null,
    summary,
  };

  logger.info("Commitment verification completed", {
    commitment_id: commitment.id,
    is_complete: isComplete,
    matches_count: matches.length,
    strongest_confidence:
      strongestMatch?.match_confidence || 0,
  });

  return result;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Validate evidence match inputs.
 */
function validateEvidenceMatchInputs(
  commitment: Commitment,
  evidence: Evidence
): void {
  if (!commitment || !commitment.id) {
    throw new Error("Commitment is required and must have an ID");
  }

  if (!evidence || !evidence.id) {
    throw new Error("Evidence is required and must have an ID");
  }

  if (evidence.commitment_id !== commitment.id) {
    throw new Error(
      `Evidence commitment_id (${evidence.commitment_id}) does not match commitment ID (${commitment.id})`
    );
  }
}

/**
 * Validate verification inputs.
 */
function validateVerificationInputs(
  commitment: Commitment,
  availableEvidence: Evidence[]
): void {
  if (!commitment || !commitment.id) {
    throw new Error("Commitment is required and must have an ID");
  }

  if (!Array.isArray(availableEvidence)) {
    throw new Error("Available evidence must be an array");
  }

  // Verify all evidence belongs to this commitment
  for (const evidence of availableEvidence) {
    if (evidence.commitment_id !== commitment.id) {
      throw new Error(
        `Evidence ${evidence.id} does not belong to commitment ${commitment.id}`
      );
    }
  }
}

/**
 * Generate human-readable verification summary.
 */
function generateVerificationSummary(
  commitment: Commitment,
  matches: EvidenceMatchResult[],
  strongestMatch: EvidenceMatchResult | null,
  isComplete: boolean
): string {
  if (matches.length === 0) {
    return `No evidence collected for "${commitment.title}". Commitment verification inconclusive.`;
  }

  if (isComplete && strongestMatch) {
    const confidenceLevel =
      strongestMatch.match_confidence >= EVIDENCE_MATCH_THRESHOLDS.HIGH
        ? "strong"
        : "sufficient";

    return `Commitment "${commitment.title}" has ${confidenceLevel} evidence (${Math.round(strongestMatch.match_confidence * 100)}% confidence) and can be marked complete.`;
  }

  const bestConfidence =
    strongestMatch?.match_confidence || 0;

  if (bestConfidence >= EVIDENCE_MATCH_THRESHOLDS.MEDIUM_MIN) {
    return `Commitment "${commitment.title}" has moderate evidence (${Math.round(bestConfidence * 100)}% confidence). User confirmation recommended.`;
  }

  return `Commitment "${commitment.title}" has weak evidence (${Math.round(bestConfidence * 100)}% confidence). Insufficient for automatic completion.`;
}

/**
 * Type guard to check if evidence is GitHub-related.
 */
function isGitHubEvidence(evidenceType: EvidenceType): boolean {
  return (
    evidenceType === "github_commit" ||
    evidenceType === "github_pr" ||
    evidenceType === "github_release"
  );
}

/**
 * Type guard to check if evidence is calendar-related.
 */
function isCalendarEvidence(evidenceType: EvidenceType): boolean {
  return evidenceType === "calendar_attendance";
}
