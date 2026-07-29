import { logger } from "../shared/utils";
import {
  PREFILTER_PATTERNS,
  PREFILTER_AUTO_FAIL_PATTERNS,
  PREFILTER_MIN_WORD_COUNT,
} from "./config";

// ============================================================================
// TYPES
// ============================================================================

export interface NormalizedGmailMessage {
  id: string;
  thread_id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  received_at: Date;
}

export interface PrefilterResult {
  passes_prefilter: boolean;
  message: NormalizedGmailMessage;
  reason?: string; // Why it passed or failed (for debugging)
}

// ============================================================================
// PREFILTER ENGINE
// ============================================================================

/**
 * PrefilterEngine implements the noise-reduction layer from PRODUCT_SPEC Section 27.
 *
 * Design principle: recall-biased. The goal is to filter out obvious non-commitments
 * cheaply (before LLM calls) while letting ambiguous cases through. An LLM call
 * on a non-commitment is cheaper than silently dropping a real commitment.
 *
 * Auto-fail checks run first (highest precision, lowest cost).
 * Signal checks run second (recall-oriented, logical OR).
 * On any internal error, we fail open (pass through) to avoid losing real commitments.
 */
class PrefilterEngine {
  // Compiled regex patterns for efficiency (built once, reused many times)
  private requestRegex: RegExp;
  private promiseRegex: RegExp;
  private actionVerbRegex: RegExp;
  private deadlineRegex: RegExp;
  private automatedSenderRegex: RegExp;
  private systemNotificationRegex: RegExp;

  // Deduplication cache: message IDs we've already seen.
  // For MVP, this is in-memory; in production, upgrade to DB-backed.
  private processedMessageIds: Set<string>;

  constructor() {
    this.processedMessageIds = new Set();
    this.requestRegex = this.compilePattern(PREFILTER_PATTERNS.REQUEST_PATTERNS);
    this.promiseRegex = this.compilePattern(PREFILTER_PATTERNS.PROMISE_PATTERNS);
    this.actionVerbRegex = this.compilePattern(PREFILTER_PATTERNS.ACTION_VERBS);
    this.deadlineRegex = this.compilePattern(PREFILTER_PATTERNS.DEADLINE_PATTERNS);
    this.automatedSenderRegex = this.compilePattern(
      PREFILTER_AUTO_FAIL_PATTERNS.AUTOMATED_SENDERS
    );
    this.systemNotificationRegex = this.compilePattern(
      PREFILTER_AUTO_FAIL_PATTERNS.SYSTEM_NOTIFICATION_KEYWORDS
    );
  }

  /**
   * Main entry point: filter a single message.
   * Returns a PrefilterResult with pass/fail and an optional reason for debugging.
   *
   * Wraps all checks in error handling: if any check throws, we fail open.
   */
  filter(message: NormalizedGmailMessage): PrefilterResult {
    try {
      // Auto-fail checks: reject immediately if any match.
      const autoFailReason = this.checkAutoFail(message);
      if (autoFailReason) {
        logger.info("Message rejected by auto-fail check", {
          messageId: message.id,
          reason: autoFailReason,
        });
        return {
          passes_prefilter: false,
          message,
          reason: autoFailReason,
        };
      }

      // Signal checks: pass if ANY signal matches (logical OR, recall-biased).
      const passesSignalCheck = this.checkSignals(message);
      if (!passesSignalCheck) {
        logger.info("Message rejected: no commitment signals detected", {
          messageId: message.id,
        });
        return {
          passes_prefilter: false,
          message,
          reason: "No commitment signals detected",
        };
      }

      logger.info("Message passed prefilter", { messageId: message.id });
      return {
        passes_prefilter: true,
        message,
      };
    } catch (error) {
      // Fail open: if the filter itself errors, let the message through.
      // An unnecessary LLM call is cheaper than a lost commitment.
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn("Prefilter error, failing open", {
        messageId: message.id,
        error: errorMessage,
      });
      return {
        passes_prefilter: true,
        message,
        reason: "Prefilter error (failing open)",
      };
    }
  }

  /**
   * Auto-fail checks: if ANY of these match, reject immediately.
   * Returns the reason if rejected, or null if not rejected.
   */
  private checkAutoFail(message: NormalizedGmailMessage): string | null {
    // Deduplication: have we seen this message before?
    if (this.processedMessageIds.has(message.id)) {
      return "Message already processed (dedup)";
    }

    // Automated sender: no-reply, notifications@, bot@, etc.
    if (this.automatedSenderRegex.test(message.from)) {
      return "Sender is automated (no-reply, bot, etc.)";
    }

    // System/integration notification: keywords in subject or body.
    const fullText = `${message.subject} ${message.body}`;
    if (this.systemNotificationRegex.test(fullText)) {
      return "System/integration notification (not a commitment)";
    }

    // Mark this message as processed.
    this.processedMessageIds.add(message.id);

    return null;
  }

  /**
   * Signal checks: pass if ANY of these match (logical OR, recall-biased).
   * The goal is to catch real commitments, even if ambiguous.
   */
  private checkSignals(message: NormalizedGmailMessage): boolean {
    // Combine subject and body for signal detection.
    const text = `${message.subject} ${message.body}`;

    // Trivial message check: if the message is very short, it's likely an ack.
    const wordCount = text.split(/\s+/).length;
    if (wordCount < PREFILTER_MIN_WORD_COUNT) {
      return false;
    }

    // Signal 1: commitment-phrasing patterns (request words, promise words).
    if (this.requestRegex.test(text) || this.promiseRegex.test(text)) {
      return true;
    }

    // Signal 2: action verbs (concrete deliverables).
    if (this.actionVerbRegex.test(text)) {
      return true;
    }

    // Signal 3: deadline language (explicit time/date references).
    if (
      this.deadlineRegex.test(text) ||
      PREFILTER_PATTERNS.TIME_REGEX.test(text) ||
      PREFILTER_PATTERNS.WEEKDAY_REGEX.test(text)
    ) {
      return true;
    }

    // Signal 4: direct addressing (imperative structure).
    // Heuristic: starts with an action verb, addressed directly to user, no question mark.
    if (this.checkImperativeStructure(message)) {
      return true;
    }

    // No signals detected; reject.
    return false;
  }

  /**
   * Check if a message has an implicit imperative structure.
   * E.g., "Upload the presentation tonight." — a direct command.
   *
   * Heuristic: first sentence starts with a verb (from ACTION_VERBS),
   * is addressed to the user (not a general statement), and doesn't end with "?".
   */
  private checkImperativeStructure(message: NormalizedGmailMessage): boolean {
    const text = message.body;

    // Split into sentences (simple heuristic: split on . ! ?)
    const sentences = text.split(/[.!?]+/);
    if (sentences.length === 0) {
      return false;
    }

    const firstSentence = sentences[0].trim().toLowerCase();
    if (!firstSentence) {
      return false;
    }

    // Check if the first sentence starts with an action verb.
    const firstWords = firstSentence.split(/\s+/).slice(0, 2).join(" ");

    // Simple check: does the sentence start with a known action verb?
    for (const verb of PREFILTER_PATTERNS.ACTION_VERBS) {
      if (firstSentence.startsWith(verb)) {
        // Found an imperative verb. Check if it looks like a direct command.
        // Additional heuristic: if it contains pronouns like "you", "your", "the", it's direct.
        if (/\b(?:you|your|the|this|my|please)\b/i.test(firstSentence)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Compile a list of patterns into a single case-insensitive regex.
   * Escapes special regex characters in the patterns.
   */
  private compilePattern(patterns: string[]): RegExp {
    // Escape regex special characters in each pattern.
    const escaped = patterns.map((p) =>
      p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );

    // Create a regex that matches if ANY pattern is found (logical OR).
    // Using word boundaries (\b) to match whole words/phrases, not substrings.
    const combined = escaped.map((p) => `\\b${p}\\b`).join("|");

    return new RegExp(combined, "i"); // case-insensitive
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTED FUNCTION
// ============================================================================

// Create a single instance to reuse compiled patterns across all filter calls.
let engine = new PrefilterEngine();

/**
 * Filter a single Gmail message to determine if it deserves an LLM extraction call.
 *
 * This is the public entry point. It implements the noise-reduction layer from
 * PRODUCT_SPEC.md Section 27.
 *
 * @param message - Normalized Gmail message
 * @returns PrefilterResult with pass/fail decision and original message (unmodified)
 */
export function prefilterMessage(message: NormalizedGmailMessage): PrefilterResult {
  return engine.filter(message);
}

/**
 * Reset the prefilter engine's dedup cache.
 * ONLY FOR TESTING — do not call in production code.
 */
export function resetPrefilterEngine(): void {
  engine = new PrefilterEngine();
}
