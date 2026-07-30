/**
 * Detection module configuration.
 * All tunable parameters for prefiltering, extraction, and confidence scoring.
 * These should be environment-configurable in production, but sane defaults are provided.
 */

// ============================================================================
// PREFILTER CONFIGURATION
// ============================================================================

/**
 * Patterns that signal a commitment may be present.
 * Used in the prefilter to decide if a message deserves an LLM call.
 * Compiled as case-insensitive regexes for efficiency.
 */
export const PREFILTER_PATTERNS = {
  // Request patterns: "can you", "could you", "would you", "please", etc.
  REQUEST_PATTERNS: [
    "can you",
    "could you",
    "would you",
    "can we",
    "could we",
    "would we",
    "please",
    "pls",
    "kindly",
  ],

  // Promise/acceptance patterns: "I'll", "I will", "on it", "will do", etc.
  PROMISE_PATTERNS: [
    "i'll",
    "i will",
    "we'll",
    "we will",
    "on it",
    "will do",
    "will get",
    "gonna",
    "going to",
    "i can",
    "we can",
    "let me",
  ],

  // Action verbs tied to deliverables.
  // These indicate concrete tasks, not just discussion.
  ACTION_VERBS: [
    "send",
    "review",
    "publish",
    "upload",
    "finish",
    "submit",
    "ship",
    "deploy",
    "fix",
    "merge",
    "create",
    "build",
    "write",
    "update",
    "implement",
    "setup",
    "configure",
    "check",
    "verify",
    "test",
    "approve",
    "sign",
    "complete",
    "deliver",
    "provide",
    "share",
  ],

  // Deadline-shaped language: explicit time/date references.
  DEADLINE_PATTERNS: [
    // Relative dates
    "by friday",
    "by monday",
    "by tuesday",
    "by wednesday",
    "by thursday",
    "by saturday",
    "by sunday",
    "tomorrow",
    "tonight",
    "today",
    "next week",
    "next month",
    "this week",
    "this month",
    "this afternoon",
    "this evening",

    // Time-of-day references
    "eod",
    "end of day",
    "end of week",
    "before lunch",
    "after lunch",
    "morning",
    "evening",
    "asap",
    "urgent",
    "immediately",

    // Weekday names
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ],

  // Regex for time patterns like "3pm", "15:00", "3 pm", etc.
  TIME_REGEX: /\d{1,2}\s*(?::|\.|-|)\s*\d{0,2}\s*(?:am|pm|AM|PM|a\.m|p\.m)/,

  // Regex for weekday names (more flexible than string matching)
  WEEKDAY_REGEX: /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
};

/**
 * Auto-fail patterns: if a sender matches these, the message is rejected immediately.
 */
export const PREFILTER_AUTO_FAIL_PATTERNS = {
  // No-reply/automated sender addresses
  AUTOMATED_SENDERS: [
    "noreply@",
    "no-reply@",
    "no_reply@",
    "donotreply@",
    "do-not-reply@",
    "notifications@",
    "notification@",
    "alert@",
    "automated@",
    "bot@",
    "system@",
    "support+noreply@",
    "no-reply-",
  ],

  // System/integration notification keywords in subject or body
  SYSTEM_NOTIFICATION_KEYWORDS: [
    "calendar reminder",
    "meeting reminder",
    "meeting digest",
    "joined the conversation",
    "joined the channel",
    "was removed",
    "has been added",
    "integration test",
    "automated workflow",
    "system notification",
    "you have been assigned",
  ],
};

/**
 * Minimum word count to process a message.
 * Messages with fewer words than this are likely trivial acks and are auto-rejected.
 */
export const PREFILTER_MIN_WORD_COUNT = 3;

// ============================================================================
// CONFIDENCE SCORING CONFIGURATION
// ============================================================================

/**
 * Confidence score thresholds for automation tiers.
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM_MIN: 0.4,
  MEDIUM_MAX: 0.75,
  LOW: 0.4,
};

// ============================================================================
// EXTRACTION CONFIGURATION
// ============================================================================

export const EXTRACTION_BATCH_SIZE = 5;

/**
 * Gemini model to use for extraction and scoring.
 * gemini-2.0-flash is the recommended active fast production model.
 */
export const GEMINI_MODEL_ID = "gemini-2.0-flash";

/**
 * Retry configuration for transient API failures.
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 3000,
  BACKOFF_MULTIPLIER: 2,
};