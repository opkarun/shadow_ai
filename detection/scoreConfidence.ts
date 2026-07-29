import { logger } from "../shared/utils";
import type {
  ExtractedCommitment,
  ConfidenceTier,
  ConfidenceScoreResult,
  ConfidenceFactors,
} from "./types";

/**
 * Confidence Scoring Engine
 *
 * Assesses how confident we are that an extracted commitment is real and actionable.
 * Confidence reflects the likelihood that this is a genuine commitment, not importance.
 *
 * PRODUCT_SPEC.md Section 16 defines the signals and tiers:
 * - HIGH (>= 0.75): Strong signals across multiple dimensions
 * - MEDIUM (0.4-0.75): Mixed signals, some ambiguity
 * - LOW (< 0.4): Vague, missing critical signals
 */

// Confidence tier thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM_MIN: 0.4,
  MEDIUM_MAX: 0.75,
};

// Signal patterns for commitment language
const STRONG_COMMITMENT_LANGUAGE = [
  "i will",
  "i'll",
  "i commit",
  "i promise",
  "i guarantee",
  "i agree",
  "i accept",
  "will do",
  "will provide",
  "will deliver",
  "will complete",
  "will finish",
  "will send",
  "will submit",
];

const MODERATE_COMMITMENT_LANGUAGE = [
  "i can",
  "i can do",
  "i can provide",
  "on it",
  "let me",
  "i'll try",
  "i'll attempt",
  "i'll do my best",
];

// Ambiguity/weakness patterns
const AMBIGUOUS_LANGUAGE = [
  "maybe",
  "might",
  "could",
  "should",
  "probably",
  "perhaps",
  "possibly",
  "hopefully",
  "if possible",
  "when i can",
  "try to",
  "attempt to",
  "best effort",
];

const QUALIFYING_LANGUAGE = [
  "unless",
  "except",
  "if",
  "subject to",
  "pending",
  "contingent",
];

/**
 * Score the confidence of an extracted commitment.
 *
 * @param commitment - Extracted commitment candidate
 * @returns ConfidenceScoreResult with score, tier, and explanation
 */
export function scoreConfidence(
  commitment: ExtractedCommitment
): ConfidenceScoreResult {
  logger.info("Scoring commitment confidence", {
    task: commitment.task,
    owner: commitment.owner,
  });

  // Score individual factors
  const factors = scoreFactors(commitment);

  // Calculate composite score using weighted average
  const confidenceScore = calculateCompositeScore(factors);

  // Determine tier based on score
  const tier = scoreTier(confidenceScore);

  // Generate human-readable explanation
  const explanation = generateExplanation(tier, factors, commitment);

  logger.info("Confidence scoring complete", {
    task: commitment.task,
    confidenceScore: confidenceScore.toFixed(2),
    tier,
  });

  return {
    confidenceScore,
    tier,
    explanation,
    factors,
  };
}

/**
 * Score individual confidence factors.
 */
function scoreFactors(commitment: ExtractedCommitment): ConfidenceFactors {
  const lowerText = `${commitment.owner} ${commitment.task} ${commitment.description}`.toLowerCase();

  return {
    ownerClarity: scoreOwnerClarity(commitment),
    taskClarity: scoreTaskClarity(commitment),
    deadlineClarity: scoreDeadlineClarity(commitment),
    commitmentLanguage: scoreCommitmentLanguage(lowerText),
    ambiguityPenalty: scoreAmbiguityPenalty(lowerText),
    contextCompleteness: scoreContextCompleteness(commitment),
    signalStrength: scoreSignalStrength(commitment, lowerText),
  };
}

/**
 * Score how clearly the owner/requester is identified.
 * 1.0 = explicit name, 0.5 = inferred from context, 0.0 = unknown
 */
function scoreOwnerClarity(commitment: ExtractedCommitment): number {
  const owner = commitment.owner.toLowerCase().trim();

  // Empty or generic owner
  if (!owner || owner === "unknown" || owner === "user") {
    return 0.0;
  }

  // Email address (strong signal)
  if (owner.includes("@")) {
    return 1.0;
  }

  // Named person (first + last name or clear identifier)
  if (owner.split(" ").length >= 2) {
    return 0.9;
  }

  // Single name or partial identifier
  if (owner.length >= 3) {
    return 0.7;
  }

  return 0.3;
}

/**
 * Score how specific and measurable the task is.
 * 1.0 = very specific, 0.5 = somewhat vague, 0.0 = completely vague
 */
function scoreTaskClarity(commitment: ExtractedCommitment): number {
  const task = commitment.task.toLowerCase();
  const description = commitment.description.toLowerCase();
  const combined = `${task} ${description}`;

  // Very short task = less clear
  if (task.length < 10) {
    return 0.4;
  }

  // Action verb present?
  const hasActionVerb =
    /\b(send|review|publish|upload|finish|submit|ship|deploy|fix|merge|create|build|write|update|implement|setup|configure|check|verify|test|approve|sign|complete|deliver|provide|share)\b/i.test(
      combined
    );

  if (!hasActionVerb) {
    return 0.5;
  }

  // Specific deliverable mentioned?
  const hasDeliverable =
    /\b(report|document|code|pr|pull request|presentation|proposal|email|memo|update|summary|analysis|plan|budget|schedule|list|form|contract|agreement|invoice|receipt|certificate|license|manual|guide|spec|specification|design|mockup|prototype|demo|video|image|screenshot|file|folder|repository|branch|release)\b/i.test(
      combined
    );

  if (hasDeliverable) {
    return 0.95;
  }

  // Measurable quantity or scope?
  const hasMeasurable =
    /\b(all|every|each|each one|complete|fully|entire|whole|entire list|entire project|all items|all tasks|all pages|all sections)\b/i.test(
      combined
    );

  if (hasMeasurable) {
    return 0.85;
  }

  // General action without clear deliverable
  return 0.7;
}

/**
 * Score how explicit and unambiguous the deadline is.
 * 1.0 = specific date/time, 0.5 = relative date, 0.0 = no deadline
 */
function scoreDeadlineClarity(commitment: ExtractedCommitment): number {
  const description = commitment.description.toLowerCase();

  // Check explicit deadline field first
  if (commitment.deadline) {
    const deadline = commitment.deadline.toLowerCase();

    // ISO date or timestamp (very explicit)
    if (/^\d{4}-\d{2}-\d{2}/.test(deadline)) {
      return 1.0;
    }

    // Relative dates like "2026-08-01" parsed
    if (/\d{4}/.test(deadline)) {
      return 0.95;
    }
  }

  // Check description for deadline signals
  const hasSpecificDeadline =
    /\b(by friday|by monday|by tuesday|by wednesday|by thursday|by saturday|by sunday|tomorrow|tonight|today|next week|next month|this week|before lunch|after lunch|eod|end of day|asap|urgent|immediately)\b/i.test(
      description
    );

  if (hasSpecificDeadline) {
    return 0.8;
  }

  // Time pattern like "3pm" or "15:00"
  const hasTimePattern =
    /\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM|a\.m|p\.m)/i.test(
      description
    );

  if (hasTimePattern) {
    return 0.85;
  }

  // No deadline found
  if (!commitment.deadline) {
    return 0.0;
  }

  return 0.3;
}

/**
 * Score the strength of commitment language used.
 * 1.0 = strong commitment ("I will", "I commit"), 0.5 = moderate, 0.0 = weak/uncertain
 */
function scoreCommitmentLanguage(lowerText: string): number {
  // Strong commitment language
  let hasStrong = false;
  for (const phrase of STRONG_COMMITMENT_LANGUAGE) {
    if (lowerText.includes(phrase)) {
      hasStrong = true;
      break;
    }
  }

  if (hasStrong) {
    return 1.0;
  }

  // Moderate commitment language
  let hasModerate = false;
  for (const phrase of MODERATE_COMMITMENT_LANGUAGE) {
    if (lowerText.includes(phrase)) {
      hasModerate = true;
      break;
    }
  }

  if (hasModerate) {
    return 0.7;
  }

  // Vague/uncertain language (scored separately in ambiguityPenalty)
  return 0.4;
}

/**
 * Score the presence of ambiguous/weakening language.
 * Returns a penalty (negative or zero).
 * 0.0 = no ambiguity, -1.0 = highly ambiguous
 */
function scoreAmbiguityPenalty(lowerText: string): number {
  let ambiguityCount = 0;
  let qualifyingCount = 0;

  // Count ambiguous words
  for (const word of AMBIGUOUS_LANGUAGE) {
    if (lowerText.includes(word)) {
      ambiguityCount++;
    }
  }

  // Count qualifying phrases
  for (const phrase of QUALIFYING_LANGUAGE) {
    if (lowerText.includes(phrase)) {
      qualifyingCount++;
    }
  }

  // Penalty calculation: each ambiguous signal reduces confidence
  const ambiguityPenalty = Math.max(-1.0, -0.15 * ambiguityCount);
  const qualifyingPenalty = Math.max(-0.5, -0.1 * qualifyingCount);

  return ambiguityPenalty + qualifyingPenalty;
}

/**
 * Score how complete the context is.
 * 1.0 = rich context (description, priority, verification method), 0.0 = minimal
 */
function scoreContextCompleteness(commitment: ExtractedCommitment): number {
  let completenessScore = 0.3; // Base score

  // Has detailed description (not just task name)
  if (commitment.description.length > commitment.task.length + 10) {
    completenessScore += 0.2;
  }

  // Has explicit priority
  if (commitment.priority >= 3) {
    completenessScore += 0.15;
  }

  // Has specific verification method
  if (
    commitment.verificationMethod &&
    commitment.verificationMethod !== "manual"
  ) {
    completenessScore += 0.15;
  }

  // Has linked repository (for code-related tasks)
  if (commitment.linkedRepo) {
    completenessScore += 0.1;
  }

  // Has deadline
  if (commitment.deadline) {
    completenessScore += 0.1;
  }

  return Math.min(1.0, completenessScore);
}

/**
 * Score the strength of multiple supporting signals.
 * More signals = higher confidence
 */
function scoreSignalStrength(
  commitment: ExtractedCommitment,
  lowerText: string
): number {
  let signalCount = 0;

  // Owner is explicit
  if (commitment.owner && commitment.owner.length > 3) {
    signalCount++;
  }

  // Task has action verb
  if (
    /\b(send|review|publish|upload|finish|submit|ship|deploy|fix|merge|create|build|write|update|implement|setup|configure|check|verify|test|approve|sign|complete|deliver|provide|share)\b/i.test(
      lowerText
    )
  ) {
    signalCount++;
  }

  // Has deadline
  if (commitment.deadline) {
    signalCount++;
  }

  // Has strong commitment language
  if (
    STRONG_COMMITMENT_LANGUAGE.some((phrase) => lowerText.includes(phrase))
  ) {
    signalCount++;
  }

  // Has description beyond task
  if (commitment.description.length > 20) {
    signalCount++;
  }

  // Has verification method
  if (commitment.verificationMethod) {
    signalCount++;
  }

  // Has priority indicator
  if (commitment.priority >= 3) {
    signalCount++;
  }

  // Map signal count to score (0-7 signals possible)
  return Math.min(1.0, signalCount / 7);
}

/**
 * Calculate composite confidence score using weighted average.
 */
function calculateCompositeScore(factors: ConfidenceFactors): number {
  // Weights (must sum to 1.0)
  const weights = {
    ownerClarity: 0.15,
    taskClarity: 0.2,
    deadlineClarity: 0.15,
    commitmentLanguage: 0.2,
    ambiguityPenalty: 0.1,
    contextCompleteness: 0.1,
    signalStrength: 0.1,
  };

  const score =
    factors.ownerClarity * weights.ownerClarity +
    factors.taskClarity * weights.taskClarity +
    factors.deadlineClarity * weights.deadlineClarity +
    factors.commitmentLanguage * weights.commitmentLanguage +
    factors.ambiguityPenalty * weights.ambiguityPenalty +
    factors.contextCompleteness * weights.contextCompleteness +
    factors.signalStrength * weights.signalStrength;

  // Clamp to 0-1 range
  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Map numeric score to confidence tier.
 */
function scoreTier(score: number): ConfidenceTier {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return "HIGH";
  }

  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM_MIN) {
    return "MEDIUM";
  }

  return "LOW";
}

/**
 * Generate human-readable explanation of the confidence score.
 */
function generateExplanation(
  tier: ConfidenceTier,
  factors: ConfidenceFactors,
  _commitment: ExtractedCommitment
): string {
  const strongPoints: string[] = [];
  const weakPoints: string[] = [];

  // Identify strong signals
  if (factors.ownerClarity >= 0.8) {
    strongPoints.push("owner is clearly identified");
  }

  if (factors.taskClarity >= 0.8) {
    strongPoints.push("task is specific and measurable");
  }

  if (factors.deadlineClarity >= 0.8) {
    strongPoints.push("deadline is explicit");
  }

  if (factors.commitmentLanguage >= 0.8) {
    strongPoints.push("strong commitment language used");
  }

  if (factors.contextCompleteness >= 0.7) {
    strongPoints.push("rich context provided");
  }

  // Identify weak signals
  if (factors.ownerClarity < 0.5) {
    weakPoints.push("owner is unclear");
  }

  if (factors.taskClarity < 0.6) {
    weakPoints.push("task lacks specificity");
  }

  if (factors.deadlineClarity < 0.3) {
    weakPoints.push("no explicit deadline");
  }

  if (factors.commitmentLanguage < 0.5) {
    weakPoints.push("weak commitment language");
  }

  if (factors.ambiguityPenalty < -0.2) {
    weakPoints.push("ambiguous or qualifying language present");
  }

  // Build explanation
  let explanation = `${tier} confidence: `;

  if (strongPoints.length > 0) {
    explanation += `${strongPoints.slice(0, 2).join(", ")}`;
  }

  if (weakPoints.length > 0) {
    if (strongPoints.length > 0) {
      explanation += `; however, ${weakPoints.slice(0, 1).join(", ")}`;
    } else {
      explanation += weakPoints.slice(0, 2).join(", ");
    }
  }

  if (strongPoints.length === 0 && weakPoints.length === 0) {
    explanation += `mixed signals on commitment clarity`;
  }

  explanation += `.`;

  return explanation;
}
