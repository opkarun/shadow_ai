/**
 * Verification module configuration.
 * All tunable parameters for evidence matching, risk detection, and GitHub integration.
 * These should be environment-configurable in production, but sane defaults are provided.
 */

// ============================================================================
// GEMINI API CONFIGURATION
// ============================================================================

/**
 * Gemini model to use for evidence analysis and risk detection.
 * As of PRODUCT_SPEC Section 29, Flash is the default for MVP.
 */
export const GEMINI_MODEL_ID = "gemini-1.5-flash";

// ============================================================================
// EVIDENCE MATCHING CONFIGURATION
// ============================================================================

/**
 * Confidence thresholds for evidence matching.
 * Scores are on a 0-1 scale (0 = no match, 1 = perfect match).
 *
 * HIGH-confidence matches can autonomously transition a commitment to COMPLETED.
 * MEDIUM-confidence matches are surfaced to the user for confirmation.
 * LOW-confidence matches are ignored (insufficient evidence).
 *
 * Based on PRODUCT_SPEC Section 14 (Verification Engine).
 */
export const EVIDENCE_MATCH_THRESHOLDS = {
  // High confidence: exact repo match + strong keyword/message match
  HIGH: 0.75,

  // Medium confidence: repo match + some context match, or strong keyword match without repo
  MEDIUM_MIN: 0.5,
  MEDIUM_MAX: 0.75,

  // Low confidence: insufficient signals for autonomous action
  LOW: 0.5,
};

/**
 * Minimum match confidence required to auto-transition a commitment to COMPLETED.
 * Only evidence matching at this level or higher can autonomously confirm.
 * User-initiated manual verification always accepts MEDIUM or higher.
 *
 * PRODUCT_SPEC Section 14: "Only medium-or-higher matches can autonomously
 * transition a commitment to COMPLETED; low-confidence matches are surfaced
 * as a suggestion."
 */
export const MIN_CONFIDENCE_FOR_AUTO_COMPLETION = EVIDENCE_MATCH_THRESHOLDS.MEDIUM_MIN;

/**
 * GitHub commit/PR message analysis parameters.
 * Used to extract keywords and determine relevance to a commitment.
 */
export const GITHUB_EVIDENCE_CONFIG = {
  // Maximum length of commit message to analyze (chars)
  MAX_MESSAGE_LENGTH: 500,

  // Keywords that signal completion (weighted heavily)
  COMPLETION_KEYWORDS: [
    "fix",
    "close",
    "closes",
    "resolved",
    "resolves",
    "done",
    "completed",
    "shipped",
    "deployed",
    "released",
    "published",
    "finish",
    "implement",
  ],

  // Keywords from commitment title/description to match against
  // These are extracted dynamically from each commitment
  // This config just documents the matching strategy
  KEYWORD_MATCH_WEIGHT: 0.6,

  // Repository name match weight (if commitment specifies a linked repo)
  REPO_MATCH_WEIGHT: 0.4,
};

/**
 * Calendar event matching configuration.
 * Used to verify calendar attendance commitments.
 */
export const CALENDAR_EVIDENCE_CONFIG = {
  // Time window around event start time to consider attendance confirmed (ms)
  ATTENDANCE_VERIFICATION_WINDOW_MS: 15 * 60 * 1000, // 15 minutes

  // Minimum calendar accuracy required (0.0 to 1.0)
  MIN_CALENDAR_ACCURACY: 0.5,
};

// ============================================================================
// RISK DETECTION CONFIGURATION
// ============================================================================

/**
 * Risk detection parameters.
 * Determine when an open commitment should be flagged as AT_RISK.
 *
 * Based on PRODUCT_SPEC Section 17 (Risk Detection Logic).
 */
export const RISK_DETECTION_CONFIG = {
  /**
   * Time window before deadline to start checking for risk.
   * If a commitment's deadline is within this window and has no evidence,
   * it's marked AT_RISK.
   *
   * This is scaled per commitment: a 2-week task gets a larger window
   * than a 2-hour task (not a fixed global constant).
   */
  RISK_WINDOW_PERCENTAGE: 0.25, // Risk window = 25% of total commitment duration

  /**
   * Minimum time remaining to even consider a commitment (ms).
   * Commitments with less than this time remaining are always checked.
   * Example: a commitment due in 30 minutes is always checked, regardless of duration.
   */
  MIN_TIME_REMAINING_FOR_RISK_CHECK_MS: 2 * 60 * 60 * 1000, // 2 hours

  /**
   * Maximum time remaining where time alone counts as a risk factor (ms).
   * Beyond this window, we rely more on evidence and activity, less on time pressure.
   */
  MAX_TIME_FOR_HEAVY_TIME_WEIGHTING_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Risk score computation weights.
 * Higher weights increase the impact of that factor on overall risk.
 */
export const RISK_SCORING_WEIGHTS = {
  // Time elapsed vs. time remaining (how much of the deadline window is used up)
  TIME_ELAPSED_WEIGHT: 0.4,

  // Lack of evidence collected so far
  EVIDENCE_WEIGHT: 0.35,

  // Activity in linked GitHub repo (for GitHub commitments)
  GITHUB_ACTIVITY_WEIGHT: 0.25,
};

/**
 * Risk score thresholds.
 * A commitment is flagged AT_RISK if its risk_score exceeds this threshold.
 */
export const RISK_THRESHOLDS = {
  // Risk score above this triggers AT_RISK status
  AT_RISK: 0.65,

  // Risk score above this is considered critical (for future UI highlighting)
  CRITICAL: 0.85,
};

// ============================================================================
// TIME-BASED TRANSITIONS CONFIGURATION
// ============================================================================

/**
 * When a commitment's deadline passes with no evidence, transition to OVERDUE.
 * This is a non-negotiable rule per PRODUCT_SPEC Section 14 (Verification Engine):
 * "Time passing is never evidence. A commitment with a passed deadline and no
 * matching evidence must transition to OVERDUE, never silently to COMPLETED."
 */
export const OVERDUE_TRANSITION_CONFIG = {
  // Grace period after deadline passes before auto-transitioning to OVERDUE (ms)
  // Allows for small clock skews and user time zone ambiguity
  GRACE_PERIOD_MS: 5 * 60 * 1000, // 5 minutes

  // Whether to auto-generate a recovery draft when transitioning to OVERDUE
  AUTO_QUEUE_RECOVERY_DRAFT: true,
};

// ============================================================================
// GITHUB API INTEGRATION CONFIGURATION
// ============================================================================

/**
 * GitHub API retry configuration for transient failures.
 */
export const GITHUB_RETRY_CONFIG = {
  // Max number of retries for transient failures
  MAX_RETRIES: 3,

  // Initial backoff delay in milliseconds
  INITIAL_BACKOFF_MS: 1000,

  // Backoff multiplier (exponential backoff)
  BACKOFF_MULTIPLIER: 2,
};

/**
 * GitHub API request timeout (milliseconds).
 * Prevents hanging requests to GitHub's API.
 */
export const GITHUB_REQUEST_TIMEOUT_MS = 30 * 1000; // 30 seconds

/**
 * GitHub API rate limits (per hour).
 * Used to pace requests and avoid hitting GitHub's rate limits.
 */
export const GITHUB_RATE_LIMIT_CONFIG = {
  // Requests per hour for unauthenticated calls (60)
  UNAUTHENTICATED_RATE_LIMIT: 60,

  // Requests per hour for authenticated calls (5000)
  AUTHENTICATED_RATE_LIMIT: 5000,

  // Number of parallel API calls to allow
  MAX_CONCURRENT_CALLS: 10,
};

// ============================================================================
// AUDIT & LOGGING CONFIGURATION
// ============================================================================

/**
 * Whether to log evidence matching details (for each match evaluated).
 * Set to true for debugging/auditing; set to false to reduce log volume in prod.
 */
export const LOG_EVIDENCE_MATCHING = true;

/**
 * Whether to log risk detection calculations.
 * Set to true for debugging; set to false to reduce log volume in prod.
 */
export const LOG_RISK_DETECTION = true;

/**
 * Whether to log GitHub API calls.
 * Set to true for debugging; set to false to reduce log volume in prod.
 */
export const LOG_GITHUB_API_CALLS = false;

/**
 * Whether to log status transitions to COMPLETED, OVERDUE, AT_RISK.
 * Always true for audit/compliance purposes per PRODUCT_SPEC Section 4 (NFR-3 Auditability).
 */
export const LOG_STATUS_TRANSITIONS = true;
