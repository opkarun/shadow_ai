/**
 * Extracted commitment from Gemini.
 * These are the fields returned by the LLM extraction.
 * Later mapping to full Commitment requires additional fields like user_id, id, etc.
 */
export interface ExtractedCommitment {
  /** Who is making this commitment (name or identifier) */
  owner: string;

  /** The task/deliverable being committed to */
  task: string;

  /** When it should be done (ISO 8601 date or null if not specified) */
  deadline: string | null;

  /** Importance/urgency level (1-5 scale) */
  priority: number;

  /** Explanation of why this confidence score was assigned */
  confidenceReasoning: string;

  /** Source of the commitment (gmail, github, manual, calendar) */
  source: "gmail" | "github" | "manual" | "calendar";

  /** Full description/context of the commitment */
  description: string;

  /** Method to verify completion (github_commit, github_pr, manual, calendar_attendance) */
  verificationMethod: string;

  /** GitHub repository name (if applicable) */
  linkedRepo?: string;
}

/**
 * Parsed Gemini extraction response.
 * Represents what the LLM returns (raw JSON from Gemini).
 */
export interface GeminiExtractionResponse {
  commitments: ExtractedCommitment[];
  parseErrors?: string[];
}

/**
 * Confidence scoring result.
 * Represents the confidence assessment of a commitment.
 */
export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export interface ConfidenceScoreResult {
  /** Numeric confidence score (0.0 to 1.0) */
  confidenceScore: number;

  /** Confidence tier based on thresholds */
  tier: ConfidenceTier;

  /** Human-readable explanation of the score */
  explanation: string;

  /** Detailed scoring factors for transparency */
  factors: ConfidenceFactors;
}

/**
 * Detailed breakdown of confidence scoring factors.
 */
export interface ConfidenceFactors {
  /** Owner/requester is clearly identified (0-1) */
  ownerClarity: number;

  /** Task/deliverable is specific and measurable (0-1) */
  taskClarity: number;

  /** Deadline is explicit and unambiguous (0-1) */
  deadlineClarity: number;

  /** Commitment language strength ("I will", "I'll", "I commit") (0-1) */
  commitmentLanguage: number;

  /** Ambiguous language present ("maybe", "should", "probably") penalty (-1 to 0) */
  ambiguityPenalty: number;

  /** Context completeness (0-1) */
  contextCompleteness: number;

  /** Multiple supporting signals present (0-1) */
  signalStrength: number;
}
